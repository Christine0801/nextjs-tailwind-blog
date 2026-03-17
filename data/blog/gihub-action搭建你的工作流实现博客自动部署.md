---
title: 'Gihub Action搭建你的工作流实现博客自动部署'
date: 2026-03-16 13:39:34
lastmod: 2026-03-16 02:37:56 +0800
tags: [Github, Action, Blog]
draft: false
summary: '目前我学会了使用Gihub Action来部署自己的自动工作流，实现本地编写博客->推送GitHub main分支->自动构建->构建好的静态博客推送到服务器，我想把这个过程写下来，以此作为一个教程'
images: []
authors: ['default']
layout: PostLayout
---

# GitHub Actions 工作流搭建教程（从零开始）

## 📚 目录

1. [什么是 GitHub Actions](#什么是-github-actions)
2. [为什么要用 GitHub Actions](#为什么要用-github-actions)
3. [核心概念详解](#核心概念详解)
4. [实战：搭建你的第一个工作流](#实战搭建你的第一个工作流)
5. [配置 GitHub Secrets（重点）](#配置-github-secrets重点)
6. [测试工作流](#测试工作流)
7. [常见问题和解决方案](#常见问题和解决方案)
8. [进阶技巧](#进阶技巧)

---

## 什么是 GitHub Actions

**通俗来说**，GitHub Actions 就是 GitHub 提供的"自动化助手"。

想象一下：

- 你写好代码后，手动上传到服务器
- 手动运行测试
- 手动构建项目
- 手动部署到生产环境

这些重复的工作，GitHub Actions 可以帮你自动完成！

### GitHub Actions 能做什么？

1. **自动运行测试**：你提交代码后，自动运行测试用例
2. **自动构建项目**：自动运行 `npm run build` 等构建命令
3. **自动部署**：构建成功后，自动部署到服务器
4. **定时任务**：每天自动运行某个任务（比如备份数据）
5. **代码检查**：自动检查代码格式、语法错误等

### 为什么选择 GitHub Actions？

- ✅ **免费**：公开仓库无限使用，私有仓库也有免费额度
- ✅ **简单**：配置文件就是普通的 YAML 文件，容易理解
- ✅ **强大**：有很多现成的插件（Actions）可以直接用
- ✅ **集成**：和 GitHub 深度集成，不需要额外注册账号
- ✅ **可视化**：可以在 GitHub 页面上直观地看到运行结果

---

## 为什么要用 GitHub Actions

### 传统部署方式 vs GitHub Actions

#### 传统方式（麻烦）：

```bash
# 1. 本地写代码
git add .
git commit -m "更新文章"
git push

# 2. 手动登录服务器
ssh user@server

# 3. 手动拉取代码
cd /var/www/blog
git pull

# 4. 手动安装依赖
npm install

# 5. 手动构建
npm run build

# 6. 手动重启服务
pm2 restart blog
```

**问题**：

- 每次更新都要重复这些步骤
- 容易出错（比如忘记运行某个命令）
- 耗时耗力

#### 使用 GitHub Actions（省心）：

```bash
# 本地写代码，一键推送
git add .
git commit -m "更新文章"
git push

# ✅ GitHub Actions 自动完成剩下的所有事情！
```

**好处**：

- 省时间，一次配置，永久生效
- 减少人为错误
- 可以看到详细的构建日志
- 自动通知构建结果

---

## 核心概念详解

### 1. Workflow（工作流）

**简单理解**：工作流就是一个"自动化脚本"，定义了要做什么事情。

**例子**：一个部署工作流可能包含：

- 检出代码
- 安装依赖
- 运行测试
- 构建项目
- 部署到服务器

**文件位置**：`.github/workflows/xxx.yml`

### 2. Event（触发事件）

**简单理解**：什么时候执行工作流。

**常见触发方式**：

| 触发方式            | 说明       | 使用场景                       |
| ------------------- | ---------- | ------------------------------ |
| `push`              | 推送代码时 | 提交代码到 main 分支时自动部署 |
| `pull_request`      | 发起 PR 时 | 合并代码前自动测试             |
| `schedule`          | 定时执行   | 每天凌晨自动备份数据           |
| `workflow_dispatch` | 手动触发   | 需要时点击按钮手动运行         |

### 3. Job（任务）

**简单理解**：工作流中的一个"工作单元"。

**例子**：

```yaml
jobs:
  test:# 任务1：测试
    # ...
  build:# 任务2：构建
    # ...
  deploy:# 任务3：部署
    # ...
```

### 4. Step（步骤）

**简单理解**：任务中的具体"操作"。

**例子**：

```yaml
steps:
  - name: 检出代码 # 步骤1
    run: git clone ...
  - name: 安装依赖 # 步骤2
    run: npm install
  - name: 运行测试 # 步骤3
    run: npm test
```

### 5. Action（插件）

**简单理解**：别人写好的"功能模块"，可以直接用。

**例子**：

- `actions/checkout`：自动检出代码
- `actions/setup-node`：自动安装 Node.js
- `actions/cache`：自动缓存依赖

**好处**：不用自己写复杂的脚本，直接用别人写好的！

---

## 实战：搭建你的第一个工作流

### 目标

实现功能：本地代码推送到 GitHub main 分支 → GitHub 自动构建 → 部署到服务器

### 步骤 1：查看项目结构

你的项目目录应该是这样的：

```
nextjs-tailwind-blog/
├── .github/
│   └── workflows/          # 这里存放工作流配置文件
│       └── deploy-server.yml
├── src/                    # 源代码
├── data/blog/              # 博客文章
├── public/                 # 静态资源
├── package.json            # 项目配置
├── next.config.js          # Next.js 配置
└── ...
```

**重点**：`.github/workflows/` 目录是存放 GitHub Actions 配置的专用目录。

### 步骤 2：理解你的现有工作流

让我们看看你现有的部署配置：

```yaml
name: Deploy to Server

on:
  push:
    branches: [main] # 当推送到 main 分支时触发

jobs:
  deploy:
    runs-on: ubuntu-latest # 使用 Ubuntu 系统运行

    steps:
      # 1. 检出代码
      - name: Checkout code
        uses: actions/checkout@v3

      # 2. 安装 Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16' # 使用 Node.js 16 版本

      # 3. 安装依赖
      - name: Install dependencies
        run: npm install

      # 4. 构建项目
      - name: Build
        run: npm run build

      # 5. 导出静态文件
      - name: Export static files
        run: npx next export

      # 6. 设置 SSH
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SERVER_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      # 7. 部署到服务器
      - name: Deploy to server
        run: |
          rsync -avz --delete \
            -e "ssh -i ~/.ssh/deploy_key -p 22 -o StrictHostKeyChecking=no -o UserKnownHostsFile=~/.ssh/known_hosts" \
            ./out/ \
            ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:${{ secrets.SERVER_PATH }}/
```

**这个工作流做了什么？**

1. **触发条件**：当代码推送到 `main` 分支时
2. **运行环境**：在 GitHub 提供的 Ubuntu 虚拟机上
3. **执行步骤**：
   - 检出你的代码
   - 安装 Node.js 16
   - 安装项目依赖
   - 构建项目
   - 导出静态文件
   - 通过 SSH 连接到你的服务器
   - 将构建好的文件同步到服务器

### 步骤 3：从头创建一个新的工作流

现在，假设你从来没有配置过 GitHub Actions，让我们从零开始创建。

#### 3.1 创建工作流目录

在项目根目录下创建：

```bash
mkdir -p .github/workflows
```

#### 3.2 创建工作流文件

创建文件：`.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

# 触发条件
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  # 任务1：构建和测试
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      # 步骤1：检出代码
      - name: Checkout code
        uses: actions/checkout@v3

      # 步骤2：设置 Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm' # 启用缓存，加快构建速度

      # 步骤3：安装依赖
      - name: Install dependencies
        run: npm ci # ci 比 install 更严格，确保依赖一致

      # 步骤4：代码检查（如果有的话）
      - name: Lint
        run: npm run lint
        continue-on-error: true # 即使失败也继续

      # 步骤5：运行测试（如果有的话）
      - name: Test
        run: npm test
        continue-on-error: true # 即使失败也继续

      # 步骤6：构建项目
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

  # 任务2：部署（仅在 main 分支且构建成功后执行）
  deploy:
    needs: build-and-test # 依赖 build-and-test 任务
    if: github.ref == 'refs/heads/main' # 只在 main 分支执行
    runs-on: ubuntu-latest

    steps:
      # 步骤1：检出代码
      - name: Checkout code
        uses: actions/checkout@v3

      # 步骤2：设置 Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'npm'

      # 步骤3：安装依赖
      - name: Install dependencies
        run: npm ci

      # 步骤4：构建项目
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production

      # 步骤5：导出静态文件
      - name: Export
        run: npx next export

      # 步骤6：设置 SSH
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SERVER_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      # 步骤7：部署到服务器
      - name: Deploy to server
        run: |
          rsync -avz --delete \
            -e "ssh -i ~/.ssh/deploy_key -p 22 -o StrictHostKeyChecking=no -o UserKnownHostsFile=~/.ssh/known_hosts" \
            ./out/ \
            ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:${{ secrets.SERVER_PATH }}/

      # 步骤8：通知部署结果
      - name: Notify success
        if: success()
        run: echo "✅ 部署成功！"

      - name: Notify failure
        if: failure()
        run: echo "❌ 部署失败！"
```

---

## 配置 GitHub Secrets（重点）

### 什么是 GitHub Secrets？

**通俗解释**：Secrets 就是 GitHub 帮你"安全存储"敏感信息的地方。

**为什么要用 Secrets？**

❌ **错误做法**：直接把敏感信息写在代码里

```yaml
# ❌ 这样做很危险！
- name: Deploy
  run: |
    rsync ./out/ user@123.45.67.89:/var/www/blog
    # SSH 密码直接暴露在代码里！
```

**问题**：

- 代码可能被别人看到（比如开源项目）
- Git 历史会永久保存这些信息
- 密码泄露风险极大

✅ **正确做法**：使用 Secrets

```yaml
# ✅ 这样做很安全！
- name: Deploy
  run: |
    rsync ./out/ ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:${{ secrets.SERVER_PATH }}/
    # 敏感信息从 Secrets 中读取，代码里看不到
```

### 详细步骤：如何创建 Secrets

#### 步骤 1：打开 GitHub 仓库

1. 在浏览器中打开你的 GitHub 仓库
2. 确保你有管理员的权限（能看到 Settings）

#### 步骤 2：进入 Secrets 设置页面

**方法一（传统方式）**：

1. 点击仓库上方的 **Settings**（设置）标签
2. 在左侧菜单中找到 **Secrets and variables** → **Actions**
3. 点击 **New repository secret** 按钮

**方法二（新界面）**：

1. 点击仓库上方的 **Settings**（设置）标签
2. 在左侧菜单中找到 **Secrets and variables** → **Actions**
3. 在右侧点击 **New repository secret**

#### 步骤 3：添加第一个 Secret

让我们以添加 **SSH 私钥** 为例：

**页面内容**：

```
Name: [输入框]
Value: [输入框，支持多行]
Add secret [按钮]
```

**填写内容**：

1. **Name（名称）**：`SERVER_SSH_KEY`

   - 名称只能包含字母、数字和下划线
   - 建议使用大写字母，便于识别
   - 名称一旦创建不能修改，只能删除重建

2. **Value（值）**：你的 SSH 私钥内容

**如何获取 SSH 私钥？**

在你的本地电脑上：

```bash
# 查看私钥内容
cat ~/.ssh/id_rsa
```

或者：

```bash
# 查看私钥内容（如果有其他私钥）
cat ~/.ssh/id_ed25519
```

**复制私钥时的注意事项**：

✅ **正确复制**：

- 包含 `-----BEGIN OPENSSH PRIVATE KEY-----` 开头
- 包含 `-----END OPENSSH PRIVATE KEY-----` 结尾
- 包含中间所有的内容
- 保持完整的换行符

❌ **错误复制**：

- 只复制了中间部分，没有开头结尾
- 添加了额外的空格或换行
- 复制了公钥而不是私钥

**复制示例**：

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBq8z7vKlQXp7m9nKqJjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKj
...（中间很多行）...
KjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKjKj
-----END OPENSSH PRIVATE KEY-----
```

3. 点击 **Add secret** 按钮保存

#### 步骤 4：继续添加其他 Secrets

按照同样的方式，继续添加其他需要的 Secrets：

**Secret 2：服务器地址**

```
Name: SERVER_HOST
Value: your-server.com
```

**如何获取服务器地址？**

```bash
# 查看你的服务器地址
hostname -I
# 或者直接用 IP 地址，比如：123.45.67.89
```

**Secret 3：服务器用户名**

```
Name: SERVER_USER
Value: root
```

**如何获取用户名？**

```bash
# 查看当前用户
whoami
# 常见的用户名：root, ubuntu, admin 等
```

**Secret 4：服务器路径**

```
Name: SERVER_PATH
Value: /var/www/blog
```

**如何确定服务器路径？**

在你的服务器上：

```bash
# 查看你的网站目录
ls -la /var/www/
# 或者自定义路径：/home/user/blog
```

### Secrets 列表示例

配置完成后，你的 Secrets 列表应该是这样的：

| Name           | Created at | Updated at |
| -------------- | ---------- | ---------- |
| SERVER_HOST    | 2024-03-15 | 2024-03-15 |
| SERVER_PATH    | 2024-03-15 | 2024-03-15 |
| SERVER_SSH_KEY | 2024-03-15 | 2024-03-15 |
| SERVER_USER    | 2024-03-15 | 2024-03-15 |

### Secrets 使用方法

在工作流文件中，使用 `secrets.xxx` 的方式引用：

```yaml
- name: Deploy
  run: |
    echo "用户名: ${{ secrets.SERVER_USER }}"
    echo "服务器: ${{ secrets.SERVER_HOST }}"
    echo "路径: ${{ secrets.SERVER_PATH }}"
```

**注意**：

- Secrets 在运行时才会被替换
- 在工作流日志中，Secrets 的值会被隐藏（显示为 `***`）
- 这样即使有人查看日志，也看不到你的敏感信息

### Secrets 的安全性

✅ **安全特性**：

1. **加密存储**：Secrets 在 GitHub 上是加密存储的
2. **日志隐藏**：在日志中自动隐藏 Secrets 的值
3. **权限控制**：只有有权限的人才能看到和管理 Secrets
4. **版本隔离**：不同环境可以使用不同的 Secrets

❌ **注意事项**：

1. 不要在代码、注释中暴露 Secrets
2. 定期轮换（更换）重要的 Secrets
3. 不要在公开仓库中存放生产环境的 Secrets
4. 使用最小权限原则（SSH 用户不要用 root）

### Secrets 常见错误

**错误 1：名称写错**

```yaml
# ❌ 错误
echo "${{ secrets.SEREVER_HOST }}"

# ✅ 正确
echo "${{ secrets.SERVER_HOST }}"
```

**错误 2：没有创建 Secret**

```
Error: 输入项未在 'SERVER_SSH_KEY' 处找到
```

**解决方法**：

1. 检查 Secrets 是否已创建
2. 检查名称是否拼写正确
3. 检查是否有权限访问

**错误 3：SSH 私钥格式错误**

```
Error: Permission denied (publickey)
```

**可能原因**：

1. 复制了公钥而不是私钥
2. 复制时缺少开头或结尾
3. 复制了额外的空格或换行
4. 私钥格式不对（应该是 OPENSSH 格式）

**解决方法**：

1. 重新复制私钥，确保完整
2. 确认是私钥（通常文件名是 `id_rsa` 或 `id_ed25519`）
3. 删除旧 Secret，重新创建

---

## 测试工作流

### 方法 1：通过代码推送触发

```bash
# 修改一个文件（随便改点什么）
echo "test" >> README.md

# 提交并推送
git add .
git commit -m "测试 GitHub Actions"
git push
```

然后去 GitHub 查看运行情况：

1. 打开你的 GitHub 仓库
2. 点击 **Actions** 标签
3. 你会看到一个新的工作流正在运行
4. 点击进去可以查看详细的运行日志

### 方法 2：通过 GitHub 界面触发

如果你的工作流配置了 `workflow_dispatch`：

1. 打开 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择你的工作流
4. 点击右侧的 **Run workflow** 按钮

### 查看运行结果

#### 成功的界面

```
✅ CI/CD Pipeline
  ✅ build-and-test (3m 20s)
    ✅ Checkout code (2s)
    ✅ Setup Node.js (10s)
    ✅ Install dependencies (45s)
    ✅ Lint (5s)
    ✅ Test (30s)
    ✅ Build (2m 8s)
  ✅ deploy (1m 15s)
    ✅ Checkout code (2s)
    ✅ Setup Node.js (10s)
    ✅ Install dependencies (45s)
    ✅ Build (2m 8s)
    ✅ Export (5s)
    ✅ Setup SSH (2s)
    ✅ Deploy to server (3s)
    ✅ Notify success (0s)
```

#### 失败的界面

```
❌ CI/CD Pipeline
  ✅ build-and-test (3m 20s)
    ✅ Checkout code (2s)
    ✅ Setup Node.js (10s)
    ✅ Install dependencies (45s)
    ❌ Lint (5s)
```

点击失败的步骤，可以看到详细的错误信息。

---

## 常见问题和解决方案

### 问题 1：SSH 连接失败

**错误信息**：

```
Error: Host key verification failed
```

**原因**：GitHub Actions 第一次连接你的服务器，需要确认服务器身份。

**解决方法**：

在工作流中添加 `ssh-keyscan`：

```yaml
- name: Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SERVER_SSH_KEY }}" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts
```

### 问题 2：权限不足

**错误信息**：

```
Error: Permission denied (publickey)
```

**原因**：SSH 密钥配置不正确。

**解决方法**：

1. 确认使用的是私钥，不是公钥
2. 确认私钥格式正确
3. 确认服务器的 `~/.ssh/authorized_keys` 中有对应的公钥

### 问题 3：构建失败

**错误信息**：

```
Error: Build failed
```

**原因**：项目构建有问题。

**解决方法**：

1. 先在本地运行 `npm run build`，确认能成功
2. 检查依赖是否完整
3. 查看详细的构建日志，找到具体错误

### 问题 4：部署路径不存在

**错误信息**：

```
Error: No such file or directory
```

**原因**：服务器上的目标目录不存在。

**解决方法**：

在工作流中添加创建目录的步骤：

```yaml
- name: Create target directory
  run: |
    ssh -i ~/.ssh/deploy_key ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
      "mkdir -p ${{ secrets.SERVER_PATH }}"
```

### 问题 5：工作流运行时间过长

**原因**：每次都重新安装依赖，没有使用缓存。

**解决方法**：

启用依赖缓存：

```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '16'
    cache: 'npm' # 添加这一行
```

---

## 进阶技巧

### 1. 并发控制

避免多个工作流同时运行：

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 2. 条件执行

只在特定条件下执行某个步骤：

```yaml
- name: Deploy
  if: success() && github.ref == 'refs/heads/main'
  run: npm run deploy
```

### 3. 矩阵构建

同时在多个环境中测试：

```yaml
strategy:
  matrix:
    node-version: [14, 16, 18]
    os: [ubuntu-latest, windows-latest]

runs-on: ${{ matrix.os }}
```

### 4. 通知功能

构建成功或失败后发送通知：

```yaml
- name: Notify on success
  if: success()
  run: echo "部署成功！"

- name: Notify on failure
  if: failure()
  run: echo "部署失败，请检查日志！"
```

### 5. 手动触发

允许在 GitHub 界面手动触发工作流：

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: '部署环境'
        required: true
        default: 'production'
        type: choice
        options:
          - staging
          - production
```

---

## 总结

### 完整流程回顾

1. **创建工作流文件**：`.github/workflows/ci-cd.yml`
2. **配置 Secrets**：在 GitHub 设置中添加敏感信息
3. **推送代码**：`git push` 触发工作流
4. **自动执行**：GitHub Actions 自动运行构建和部署
5. **查看结果**：在 GitHub Actions 页面查看运行日志

### 关键要点

1. **Secrets 的安全性**：

   - 永远不要在代码中硬编码敏感信息
   - 使用 GitHub Secrets 安全存储
   - 定期轮换重要密码

2. **工作流的调试**：

   - 使用详细的日志输出
   - 分阶段执行，便于定位问题
   - 查看 Actions 页面的运行日志

3. **性能优化**：
   - 使用缓存加速构建
   - 避免重复安装依赖
   - 合理设置并发控制

### 下一步

1. **测试**：创建一个工作流并测试
2. **优化**：根据实际情况优化配置
3. **扩展**：添加更多功能（如通知、多环境部署等）
4. **学习**：探索 GitHub Marketplace 中的更多 Actions

---

**文档版本**: 2.0
**最后更新**: 2026-03-15

希望这份详细的教程能帮助你成功搭建 GitHub Actions 工作流！
