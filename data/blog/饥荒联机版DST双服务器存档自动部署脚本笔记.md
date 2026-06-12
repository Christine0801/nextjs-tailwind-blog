---
title: 饥荒联机版（DST）双服务器存档自动部署脚本笔记
date: 2026-05-30T05:21:10.000Z
lastmod: 2026-06-12 23:23:16
tags:
  - Linux
  - PowerShell
  - DST
  - 饥荒
draft: false
summary: ''
images: [/static/images/250820CAC574CB4D14DF48D99E525F1F476E9.webp]
authors:
  - default
layout: PostLayout
---

# 饥荒联机版（DST）双服务器存档自动部署脚本笔记

### 一、背景与需求

- 拥有两台云服务器（例如腾讯云、阿里云），分别运行 DST 地面（Master）和洞穴（Caves）世界。
- 本地使用 Windows 系统，已通过游戏客户端生成存档（例如 `Cluster_1`、`Cluster_2`...），每个存档包含 `Master` 和 `Caves` 文件夹。
- 需要将指定存档的地面和洞穴文件分别上传到两台服务器的对应目录，并提取 Mod ID 生成 `dedicated_server_mods_setup.lua`。
- 目标：一键完成打包、上传、解压、Mod 配置文件生成，避免手动复制粘贴。

### 二、最终实现方案

使用 **PowerShell 脚本**，实现：

1. 交互式输入本地存档编号和云服务器存档位。

2. 读取 `modoverrides.lua` 中的 Mod ID（`workshop-数字`），生成 `dedicated_server_mods_setup.lua`，内容格式为：

   ```lua
   ServerModSetup("1234567890")
   ServerModSetup("0987654321")
   ```

3. 将 `Master` 和 `Caves` 分别打包为 `.zip`（放在 `Cluster_X` 目录下）。

4. 通过 `scp` 上传到远程服务器的指定父目录，然后通过 `ssh` 解压并清理临时 zip。

5. 上传生成的 Mod 配置文件到两台服务器的 `mods` 目录。

6. 支持**测试模式**（只打印命令，不实际执行）。

### 三、目录结构对应关系

#### 本地路径

```text
C:\Users\你的用户名\Documents\Klei\你的科雷ID\Cluster_<编号>\
├── Master\
│   ├── modoverrides.lua
│   └── ... (其他存档文件)
└── Caves\
    ├── modoverrides.lua
    └── ...
```

#### 远程服务器路径

- 地面服务器：`/root/.klei/DST_<云存档位>/Cluster_1/Master`
- 洞穴服务器：`/root/.klei/DST_<云存档位>/Cluster_1/Caves`
- Mod 目录：`/root/dst/mods` （脚本中可配置，**必须已创建软链接或无空格路径**）

### 四、脚本使用前准备

1. **启用 PowerShell 执行脚本**（管理员权限）：

   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **安装 OpenSSH 客户端**（Windows 10/11 可选功能，或下载安装）。

3. **配置 SSH 密钥免密登录**（推荐）：

   - 本地生成密钥对：`ssh-keygen -t rsa -b 4096`（一路回车）。
   - 将公钥 `~/.ssh/id_rsa.pub` 内容追加到两台服务器的 `~/.ssh/authorized_keys`。

4. **确保服务器已安装 `unzip`**：

   ```bash
   apt install unzip -y   # Debian/Ubuntu
   yum install unzip -y   # CentOS
   ```

5. **修改脚本开头的配置**：

   - `$KleiID`：你的科雷 ID（数字文件夹名）。
   - `$MasterServer` / `$CaveServer`：格式 `user@ip`。
   - `$RemoteModsPath`：服务器上存放 `dedicated_server_mods_setup.lua` 的目录。如果路径含空格，建议创建软链接。

### 五、脚本代码（最终版）

将以下代码保存为 `Deploy-DST.ps1`，放在桌面或其他简单路径。

```powershell
# Deploy-DST.ps1
# 测试模式：$TestMode = $true 仅打印命令，不实际传输；$false 正式部署

$ErrorActionPreference = "Stop"

# ========== 用户配置区 ==========
$KleiID = "76561198123456789"          # 你的科雷ID（数字文件夹名）
$MasterServer = "root@地面服务器IP"    # 地面服务器地址
$CaveServer   = "root@洞穴服务器IP"    # 洞穴服务器地址
$RemoteModsPath = "/root/dst/mods"     # 服务器上 mods 文件夹路径（建议无空格）
$TestMode = $true                      # $true = 测试模式，$false = 正式执行
# ================================

# ---- 交互：本地存档编号 ----
do {
    $localNum = Read-Host "请输入要部署的本地存档编号（例如 1 对应 Cluster_1）"
    if ($localNum -match '^\d+$') {
        $localClusterDir = Join-Path $env:USERPROFILE "Documents\Klei\DoNotStarveTogether\$KleiID\Cluster_$localNum"
        if (Test-Path $localClusterDir) {
            Write-Host "找到本地存档目录: $localClusterDir" -ForegroundColor Green
            break
        } else {
            Write-Host "错误：本地存档目录不存在 -> $localClusterDir" -ForegroundColor Red
        }
    } else {
        Write-Host "输入无效，请输入数字。" -ForegroundColor Red
    }
} while ($true)

# ---- 交互：云服务器存档位 ----
do {
    $remoteSlot = Read-Host "请输入云服务器存档位（数字，例如 1 对应 DST_1）"
    if ($remoteSlot -match '^\d+$') {
        $remoteBase = "/root/.klei/DST_$remoteSlot/Cluster_1"
        Write-Host "将使用远程路径: $remoteBase" -ForegroundColor Cyan
        break
    } else {
        Write-Host "输入无效，请输入数字。" -ForegroundColor Red
    }
} while ($true)

# 本地 Master/Caves 路径
$localMaster = Join-Path $localClusterDir "Master"
$localCaves  = Join-Path $localClusterDir "Caves"
if (-not (Test-Path $localMaster)) { Write-Host "错误：找不到 Master 文件夹" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $localCaves))  { Write-Host "错误：找不到 Caves 文件夹"  -ForegroundColor Red; exit 1 }

# 远程 Master/Caves 路径
$remoteMasterDir = "$remoteBase/Master"
$remoteCavesDir  = "$remoteBase/Caves"

Write-Host "`n========== 路径摘要 ==========" -ForegroundColor Yellow
Write-Host "本地 Master: $localMaster"
Write-Host "本地 Caves : $localCaves"
Write-Host "远程地面服务器: $MasterServer`:$remoteMasterDir"
Write-Host "远程洞穴服务器: $CaveServer`:$remoteCavesDir"
Write-Host "远程 Mods 目录: $RemoteModsPath" -ForegroundColor Yellow

# ---- 提取 Mod ID 并生成 dedicated_server_mods_setup.lua ----
function Get-ModIDsFromFile($filePath) {
    if (-not (Test-Path $filePath)) { return @() }
    $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
    if (-not $content) { return @() }
    $matches = [regex]::Matches($content, 'workshop-(\d+)')
    $ids = @()
    foreach ($m in $matches) {
        $ids += $m.Groups[1].Value
    }
    return $ids | Select-Object -Unique
}

$masterIDs = Get-ModIDsFromFile (Join-Path $localMaster "modoverrides.lua")
$cavesIDs  = Get-ModIDsFromFile (Join-Path $localCaves  "modoverrides.lua")
$allIDs    = $masterIDs + $cavesIDs | Select-Object -Unique

$modLines = @()
foreach ($id in $allIDs) {
    $modLines += "ServerModSetup(`"$id`")"
}
$modSetupContent = $modLines -join "`r`n"
if ($modSetupContent -eq "") {
    Write-Host "警告：未找到任何 Mod，将生成空文件。" -ForegroundColor Yellow
}

$desktopPath = [Environment]::GetFolderPath("Desktop")
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tempModFile = Join-Path $desktopPath "dedicated_server_mods_setup_$timestamp.lua"
$modSetupContent | Set-Content -Path $tempModFile -Encoding UTF8
Write-Host "`n========== 生成的 dedicated_server_mods_setup.lua 内容 ==========" -ForegroundColor Cyan
Write-Host $modSetupContent
Write-Host "文件路径: $tempModFile" -ForegroundColor Gray

# ---- 上传函数：打包 -> scp -> ssh 解压（忽略 unzip 警告） ----
function Upload-Folder {
    param($LocalPath, $RemoteServer, $RemoteDir)

    $folderName = Split-Path $LocalPath -Leaf
    $parentDir  = Split-Path $LocalPath -Parent
    $zipFile    = Join-Path $parentDir "${folderName}.zip"

    Write-Host "正在打包 $LocalPath 到 $zipFile ..."
    Compress-Archive -Path $LocalPath -DestinationPath $zipFile -CompressionLevel Optimal -Force

    # 修复反斜杠问题（Windows -> Linux 路径格式）
    $remoteParentRaw = Split-Path $RemoteDir -Parent
    $remoteParent = $remoteParentRaw -replace '\\', '/'
    $remoteZip = "$remoteParent/$folderName.zip"

    if ($TestMode) {
        Write-Host "`n[TEST] 将执行：" -ForegroundColor Magenta
        Write-Host "  scp `"$zipFile`" $RemoteServer`:`"$remoteZip`""
        Write-Host "  ssh $RemoteServer `"rm -rf '$RemoteDir' && (unzip -o '$remoteZip' -d '$remoteParent' || true) && rm '$remoteZip'`""
        Write-Host "  然后删除本地 zip: $zipFile"
    } else {
        scp "$zipFile" "$RemoteServer`:$remoteZip"
        if ($LASTEXITCODE -ne 0) { throw "scp 上传失败" }

        $remoteCmd = "rm -rf '$RemoteDir' && (unzip -o '$remoteZip' -d '$remoteParent' || true) && rm '$remoteZip'"
        ssh $RemoteServer $remoteCmd
        if ($LASTEXITCODE -ne 0) { throw "远程解压失败" }

        Remove-Item $zipFile -Force
        Write-Host "上传并解压完成" -ForegroundColor Green
    }
}

function Upload-ModSetupFile {
    param($RemoteServer)
    $remoteFile = "$RemoteModsPath/dedicated_server_mods_setup.lua"
    if ($TestMode) {
        Write-Host "`n[TEST] 将执行：" -ForegroundColor Magenta
        Write-Host "  scp `"$tempModFile`" $RemoteServer`:`"$remoteFile`""
    } else {
        Write-Host "上传 mod 配置到 $RemoteServer`:$remoteFile ..."
        ssh $RemoteServer "mkdir -p $RemoteModsPath"
        if ($LASTEXITCODE -ne 0) { throw "创建远程 mods 目录失败" }
        scp "$tempModFile" "$RemoteServer`:$remoteFile"
        if ($LASTEXITCODE -ne 0) { throw "scp mod 文件失败" }
        Write-Host "Mod 配置文件已上传" -ForegroundColor Green
    }
}

Write-Host "`n========== 开始上传 ==========" -ForegroundColor Yellow
Upload-Folder $localMaster $MasterServer $remoteMasterDir
Upload-Folder $localCaves  $CaveServer   $remoteCavesDir
Upload-ModSetupFile $MasterServer
Upload-ModSetupFile $CaveServer

if ($TestMode) {
    Write-Host "`n========== 测试模式结束 ==========" -ForegroundColor Green
    Write-Host "以上仅为预览命令，未实际传输任何文件。" -ForegroundColor Yellow
    Write-Host "如需正式部署，请将脚本开头的 `$TestMode 改为 `$false，并重新运行。" -ForegroundColor Yellow
    Write-Host "临时 mod 配置文件保留在: $tempModFile" -ForegroundColor Cyan
} else {
    # 正式部署结束后删除临时 mod 文件
    Remove-Item $tempModFile -Force
    Write-Host "`n========== 部署完成 ==========" -ForegroundColor Green
    Write-Host "本地存档 Cluster_$localNum (科雷ID: $KleiID) 已上传。" -ForegroundColor Green
    Write-Host "请在两台服务器上重启 DST 服务（例如 screen 或 systemctl）。" -ForegroundColor Yellow
}
```

### 六、使用方法

1. 修改脚本开头的 `$KleiID`、`$MasterServer`、`$CaveServer`、`$RemoteModsPath`。

2. 首次运行建议 `$TestMode = $true` 测试，查看打印的路径和命令是否正确。

3. 确认无误后，将 `$TestMode` 改为 `$false`。

4. 在 PowerShell 中执行：

   ```powershell
   cd C:\Users\你的用户名\Desktop
   .\Deploy-DST.ps1
   ```

5. 按提示输入本地存档编号（例如 `2`）和云服务器存档位（例如 `4`）。

6. 等待完成，两台服务器上的对应目录即被覆盖更新。

### 七、注意事项

- 脚本会**覆盖**服务器上的 `Master` / `Caves` 文件夹，请确保存档位选择正确。

- 远程 `mods` 目录路径若包含空格或特殊字符，建议在服务器上创建软链接（如 `ln -s "/path/with spaces" /root/dst_mods`），脚本中使用链接路径。

- 生成 Mod 配置文件时，仅提取 `modoverrides.lua` 中出现的 `workshop-数字`，不依赖 Mod 名称。

- 若服务器重启 DST 后 Mod 未生效，请检查 `dedicated_server_mods_setup.lua` 是否位于正确的 `mods` 目录，且文件权限正确（`chmod 644`）。

- 软链接创建及删除方法：

  ```bash
  # 创建
  ln -s "/root/Steam/steamapps/common/Don\'t\ Starve\ Together\ Dedicated\ Server/mods/" /root/dst_mods
  # 删除
  unlink /root/dst_mods
  ```

### 八、常见问题

| 问题                     | 解决方法                                               |
| :----------------------- | :----------------------------------------------------- |
| `scp` / `ssh` 找不到命令 | 安装 OpenSSH 客户端，或添加至 PATH。                   |
| 权限被拒绝（publickey）  | 配置 SSH 免密登录，或检查脚本中的用户名是否正确。      |
| unzip 警告反斜杠         | 已通过 <code>&#124; true</code> 忽略，不影响解压结果。 |
| 路径出现反斜杠 `\`       | 脚本内部已自动将 Windows 反斜杠转为正斜杠。            |
| 中文乱码                 | 执行 `chcp 65001` 并设置 `$OutputEncoding`。           |

---

**脚本版本**：v2.0
**最后更新**：2026-05-30
**适用场景**：饥荒联机版专用服务器（地面+洞穴分离部署）
