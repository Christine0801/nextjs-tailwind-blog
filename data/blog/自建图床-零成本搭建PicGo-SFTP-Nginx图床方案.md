---
title: '自建图床：零成本搭建 PicGo + SFTP + Nginx 图床方案'
date: 2026-07-14
lastmod: 2026-07-14
tags:
    - Tutorial
    - Nginx
    - Tool
draft: false
summary: '告别 OSS 月费，利用自有服务器搭建轻量图床，配合 PicGo SFTP 插件实现一键上传，适合博客封面图管理。'
images: [https://calvinhiram.top/images/cover-self-hosted-image-hosting.svg]
authors: ['default']
layout: PostLayout
---

# 自建图床：零成本搭建 PicGo + SFTP + Nginx 图床方案

## 背景

我的博客图片管理经历了三个阶段：

1. **阿里云 OSS + PicGo** —— 对象存储付费，用着很爽，但长期不用就过期了
2. **Unsplash 自动封面** —— 构建时根据文章标签从 Unsplash 搜图，免费，但相关性时好时坏，有些标签根本搜不到
3. **自建图床**（本文方案）—— 服务器复用，零额外成本，图片完全受控

如果你有一台云服务器、一个博客、想摆脱第三方图床的束缚，本文方案只需要 10 分钟配置。

## 方案架构

```
┌──────────┐    SFTP (SSH)     ┌────────────────┐
│  PicGo   │ ────────────────> │  腾讯云服务器    │
│ (本机)    │   上传图片         │  139.155.183.138 │
└──────────┘                   │                │
                               │ /var/www/images/ │
                               │        │         │
                               │   Nginx          │
                               │        │         │
                               │ https://calvinhiram.top/images/
                               └────────────────┘
```

- **PicGo**：本地图片上传客户端，支持拖拽/剪贴板上传
- **SFTP**：走 SSH 协议直传服务器，无需额外开端口
- **Nginx**：静态文件服务，加缓存头，支持 HTTPS

## 第一步：服务器端配置

### 1.1 创建图片存储目录

```bash
ssh root@你的服务器IP
mkdir -p /var/www/images
chown -R nginx:nginx /var/www/images
```

### 1.2 配置 Nginx

在现有的 HTTPS server 块中添加一个 location：

```nginx
server {
    listen 443 ssl http2;
    server_name 你的域名;

    # ... 现有配置 ...

    # 图床 - 静态图片服务
    location /images/ {
        alias /var/www/images/;
        autoindex off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

检查配置并重载：

```bash
nginx -t && systemctl reload nginx
```

### 1.3 验证

上传一张测试图：

```bash
echo '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect fill="#4CAF50" width="200" height="200"/>
  <text x="50" y="120" font-size="40" fill="white">OK</text>
</svg>' > /var/www/images/test.svg
```

访问 `https://你的域名/images/test.svg`，能正常显示就说明配置成功。

### 1.4 （可选）防盗链配置

如果担心图片被其他站点直接引用消耗带宽，可以加 `valid_referers`：

```nginx
location /images/ {
    alias /var/www/images/;
    autoindex off;

    # 防盗链：只允许自己的域名，同时放行空 referer（RSS、直接打开）
    valid_referers none blocked 你的域名 www.你的域名;
    if ($invalid_referer) {
        return 403;
    }

    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

说明：
- `none` —— 无 Referer（浏览器直接打开、RSS 阅读器），放行
- `blocked` —— 隐私策略隐藏了 Referer，放行
- 如果你的博客是纯静态的、流量不大，个人觉得这一步**非必需**

## 第二步：PicGo 配置 SFTP 插件

### 2.1 安装插件

在 PicGo 中搜索安装 **picgo-plugin-sftp-uploader**（插件设置 → 搜索 sftp-uploader）。

> **版本兼容性提示**：笔者实测 PicGo 2.4.x + 插件 v2.1.0 可正常工作。如果遇到 `SyntaxError: Unexpected token .` 说明 PicGo 版本太老，升级 PicGo 本身即可解决。

### 2.2 准备 SSH 免密登录

确保本机能免密 SSH 登录服务器（PicGo 通过 SFTP 插件走 SSH 协议）。如果还没有配置：

```bash
ssh-keygen -t rsa -b 4096
ssh-copy-id root@你的服务器IP
```

### 2.3 创建连接配置文件

在 `C:\Users\你的用户名\.picgo\` 下创建 `sftp-config.json`：

```json
{
  "myserver": {
    "host": "你的服务器IP",
    "port": 22,
    "username": "root",
    "privateKey": "C:/Users/你的用户名/.ssh/id_rsa",
    "path": "{fullName}",
    "uploadPath": "/var/www/images/{fullName}",
    "url": "https://你的域名/images/",
    "fileUser": "nginx"
  }
}
```

字段说明：

| 字段 | 含义 |
|------|------|
| `host` | 服务器 IP |
| `username` | SSH 用户名 |
| `privateKey` | 本机私钥路径 |
| `path` | URL 路径模板，`{fullName}` 即原文件名 |
| `uploadPath` | 服务器上的存储路径 |
| `url` | 最终访问的域名前缀 |
| `fileUser` | 上传后修改文件所有者（确保 Nginx 能读取） |

### 2.4 配置 PicGo

打开 PicGo → 图床设置 → SFTP 上传，填入：

- **网站标识**：`myserver`（对应 sftp-config.json 中的 key）
- **配置文件**：`C:/Users/你的用户名/.picgo/sftp-config.json`

设为默认图床，完成。

### 2.5 （推荐）上传时自动转 WebP

安装 `picgo-plugin-webp` 插件，上传前自动将图片转为 WebP 格式（质量 80），体积比 PNG 小 30-50%，博客加载更快：

在 PicGo 插件设置中搜索 **webp** 安装即可，无需额外配置。插件会先转换格式再走 SFTP 上传，对使用流程完全透明。

## 第三步：使用

在 PicGo 上传区拖入图片，上传成功后自动返回 Markdown / URL 格式链接。

博客文章引用封面图时，在 Frontmatter 中写：

```yaml
images: [https://你的域名/images/my-cover.png]
```

每次想换封面图，打开 PicGo → 拖图 → 复制链接 → 粘贴到文章的 `images` 字段，搞定。

## 总结

| 维度 | OSS | Unsplash | 自建图床 |
|------|-----|----------|----------|
| 费用 | 月费 | 免费 | 免费（复用服务器） |
| 图片质量 | 完全可控 | 随机搜索结果 | 完全可控 |
| 上手难度 | 低 | 低 | 中等（需配服务器） |
| 依赖 | 云厂商 | Unsplash API | 自有服务器 |

自建图床最大的优势是**零额外成本 + 完全可控**。如果你已经有一台跑着博客的云服务器，这套方案几乎不需要额外维护。配合 PicGo 的拖拽上传，使用体验和商业图床几乎没有区别。
