---
title: '腾讯云 SteamCMD 饥荒更新慢排查与解决'
date: 2026-06-12 23:15:25
lastmod: 2026-06-13 02:43:40
tags:
  - rsync
  - steamcmd
  - tencent
  - Akamai CDN
  - Linux
draft: false
summary: "腾讯云服务器使用 SteamCMD 更新饥荒服务端（Don't Starve Together），一个 30MB 的更新包下载非常慢（约 720 KB/s，耗时 30 秒+），而同配置的阿里云服务器下载同样内容仅需 8 秒（约 2.3 MB/s）。"
images: [/static/images/how-to-use-rsync-command-in-linux-featured.png]
authors: ['default']
layout: PostLayout
---

# 腾讯云 SteamCMD 饥荒更新慢排查与解决

## 问题

腾讯云服务器使用 SteamCMD 更新饥荒服务端（Don't Starve Together），一个 30MB 的更新包下载非常慢（约 720 KB/s，耗时 30 秒+），而同配置的阿里云服务器下载同样内容仅需 8 秒（约 2.3 MB/s）。

## 排查过程

### 第一步：排查是否因 Clash 代理导致

曾经在服务器上部署过 Clash，担心是代理残留。

```bash
# 检查 clash 进程
ps aux | grep -i clash

# 检查代理环境变量
env | grep -i proxy

# 检查 clash 配置目录
ls -la /etc/clash/ /opt/clash/ ~/.config/clash/ 2>/dev/null

# 检查 systemd 服务
systemctl list-units --all | grep -i clash
systemctl list-unit-files | grep -i clash
```

**结果**：全部无返回，没有 Clash 进程、环境变量、配置文件或服务残留。代理问题排除。

### 第二步：DNS 解析对比

```bash
nslookup media.steampowered.com 223.5.5.5      # 阿里 DNS
nslookup media.steampowered.com 114.114.114.114 # 114 DNS
nslookup media.steampowered.com 183.60.83.19    # 腾讯云默认 DNS
```

**结果**：三个 DNS 都返回了海外 Akamai 节点 IP（23.x.x.x），DNS 解析不是根因。

### 第三步：大文件下载测速

```bash
curl -L -o /dev/null -w "speed: %{speed_download} B/s, time: %{time_total}s, size: %{size_download} bytes\n" http://media.steampowered.com/client/installer/steam.deb
```

| 云厂商 | 下载速度  | 耗时（19.3MB） |
| ------ | --------- | -------------- |
| 腾讯云 | 738 KB/s  | 27.5 秒        |
| 阿里云 | 2431 KB/s | 8.3 秒         |

同样是连接海外 Akamai CDN，阿里云速度是腾讯云的 3.3 倍。

### 根因结论

**腾讯云到海外 Akamai CDN 的国际线路带宽/peering 先天不足**，不是代理或 DNS 问题。修改 SteamCMD 配置指定国内 Content Server 也无效，因为 Steam 的 GeoDNS 对腾讯云 IP 段持续分配海外节点。

## 最终解决方案：阿里云下载 → rsync 同步到腾讯云

既然阿里云下载快，就让它当"下载器"，下载完成后通过 rsync 增量同步到腾讯云。

### 配置 SSH 免密登录

在**阿里云**上：

```bash
# 生成密钥（如果没有）
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

在**腾讯云**上，将阿里云的公钥追加到 authorized_keys（**注意用 >> 追加，不要覆盖原有密钥**）：

```bash
echo "ssh-ed25519 AAA...粘贴的公钥..." >> ~/.ssh/authorized_keys
```

回到阿里云验证：

```bash
ssh root@腾讯云IP
```

能直接登录即配置成功。

### 首次全量同步（仅第一次需要）

在阿里云先用 SteamCMD 下载最新游戏文件：

```bash
./steamcmd.sh +login anonymous +app_update 343050 validate +quit
```

然后 rsync 同步到腾讯云：

```bash
rsync -avz --progress ~/Steam/steamapps/common/"Don't Starve Together Dedicated Server"/ root@服务器IP:/root/Steam/steamapps/common/"Don't Starve Together Dedicated Server"/
```

> **注意**：首次执行 rsync 是全量传输，文件多的话需要等一会儿。这是正常的——因为没有比对基准，所有文件都要传一遍。

### 后续增量更新（日常操作）—— 一键脚本

把 rsync 同步写成一个脚本，阿里云更新完游戏后，执行一次即可同步到腾讯云。

在阿里云上创建 `sync_dst_to_tencent.sh`：

`--exclude`表示排除文件夹，这些文件夹中的文件便不会被同步，这里排除掉了 mod 和 mod 缓存文件夹，只同步游戏本体 ，这样第一次同步就不会在同步 mod 文件中浪费大量的时间，因为 mod 文件夹中存在大量的零碎 mod 文件，会把第一次同步的传输速度拖死

```bash
#!/bin/bash
set -e

# ============================================
# 饥荒服务端同步脚本
# 用法: ./sync_dst_to_tencent.sh
# 在阿里云更新完游戏后，执行此脚本增量同步到腾讯云
# ============================================

TENCENT_IP="139.155.183.138"
DST_PATH="Don't Starve Together Dedicated Server"
SRC_DIR="$HOME/Steam/steamapps/common/$DST_PATH"
DST_DIR="/root/Steam/steamapps/common/$DST_PATH"

echo ">>> 增量同步到腾讯云..."
rsync -avz --progress \
  --exclude='mods/' \
  --exclude='ugc_mods/' \
  --exclude='cached_mod_manifests/' \
  "$SRC_DIR/" "root@${TENCENT_IP}:${DST_DIR}/"

echo ""
echo ">>> 同步完成!"
```

赋予执行权限：

```bash
chmod +x sync_dst_to_tencent.sh
```

以后每次流程：

```bash
# 1. 用自己的脚本更新 SteamCMD
./你的更新脚本.sh

# 2. 增量同步到腾讯云
./sync_dst_to_tencent.sh
```

> 如果腾讯云 IP 或目录路径不同，修改脚本顶部对应变量即可。

## 为什么不直接在腾讯云上解决

- 腾讯云国际线路慢是基础设施层面的问题，改 SteamCMD 配置、DNS、hosts 都无法根治
- Steam 的 GeoDNS 对腾讯云 IP 段始终分配海外 CDN，没有可控的国内节点
- 阿里云 → rsync → 腾讯云是最稳定、一劳永逸的方案，不依赖任何第三方镜像或代理

## 总结

腾讯云服务器更新海外游戏内容慢，根因是国际出口带宽/peering 弱于阿里云。与其折腾网络配置，不如利用阿里云的好线路做跳板，通过 rsync 增量同步——首次全量传输后，后续每次更新只传差异，高效且可靠。
