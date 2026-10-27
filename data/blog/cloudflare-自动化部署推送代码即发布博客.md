---
title: 'Cloudflare 自动化部署：推送代码即发布博客'
date: 2026-10-28
lastmod: 2026-10-28
tags:
  - Tutorial
  - Cloudflare
  - Deploy
draft: false
summary: '用 Cloudflare Pages 直连 Git 或 GitHub Actions + wrangler，实现推送代码自动构建部署博客，告别手动导出上传。'
images: [https://calvinhiram.top/images/cover-cloudflare-auto-deploy.svg]
authors: ['default']
layout: PostLayout
---

# Cloudflare 自动化部署：推送代码即发布博客

## 背景

之前我的部署流程是：本地 `npm run build && npm run export` 导出静态文件，再用 wrangler 手动推到 Cloudflare Workers。每次改文章都要重复一遍，麻烦。

其实 Cloudflare 原生支持像 GitHub Actions 那样的 **CI/CD**：把代码 push 到 GitHub，自动构建、自动部署，全程不用手动操作。本文记录两种实现方式。

## 方式一：Cloudflare Pages 直连 Git（推荐）

这是最省事的方式，**不用写任何 workflow 文件**，Cloudflare 帮你搞定一切。

### 1. 创建 Pages 项目并连接 Git

1. Cloudflare 控制台 → **Workers & Pages** → 创建 → **Pages**。
2. 选择「**连接到 Git**」，授权并选择你的 GitHub 仓库。
3. 点击开始构建。

### 2. 配置构建

对于 Next.js 静态导出这类项目，关键就两项：

| 配置项   | 填什么                            |
| -------- | --------------------------------- |
| 构建命令 | `npm run build && npm run export` |
| 输出目录 | `out`                             |

> 框架预设里如果有「Next.js (Static HTML Export)」可以直接选，没有就手动填上面两项。

### 3. 保存并首次部署

保存后 Cloudflare 会立即触发一次构建。构建成功后，Pages 会分配一个 `xxx.pages.dev` 域名，之后每次 `git push` 到仓库，都会**自动重新构建部署**。

### 4. 绑定自定义域名

和 Workers 一样，Pages 项目里也能绑自定义域名：进项目 → **自定义域** → 添加你托管好的域名即可。

## 方式二：GitHub Actions + wrangler

如果你更习惯用 GitHub Actions 控制流程，可以在 `.github/workflows/` 里加一个部署 job：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install & build
        run: npm ci && npm run build && npm run export

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy out --project-name=你的项目名
```

需要先在 GitHub 仓库的 Settings → Secrets 里加一个 `CLOUDFLARE_API_TOKEN`（去 Cloudflare 创建 API Token，给 Workers Pages 的编辑权限）。

## 搬到云端要注意的三个坑

### 1. 环境变量要配齐

博客里有密码保护的文章（`password_env`），构建时要用 `BLOG_PW_*` 这类密码做 AES 加密。这些环境变量**必须配到云端**，否则构建出来的加密文章解不开：

- Pages 方式：项目 → Settings → 环境变量，把 `.env` 里的 `BLOG_PW_*` 逐个填进去。
- Actions 方式：配到 GitHub Secrets，再在 workflow 里注入。

### 2. 锁死 Node 版本

Next.js 12 对 Node 20+ 兼容性不好（会报类似 `getRandomValues is not a function` 的错）。所以：

- Pages 方式：加环境变量 `NODE_VERSION=18`，或在仓库根目录放一个 `.node-version` 文件写 `18`。
- Actions 方式：`actions/setup-node` 里 `node-version: 18`。

### 3. `update-dates.js` 在云端会失效

这个脚本靠 `git diff` 检测内容变更来自动更新 `lastmod`。但云端构建环境是干净的 clone（没有未提交改动），`git diff` 为空，所以它**不会更新 lastmod**。

这通常没关系——`lastmod` 手动写进 frontmatter 就行，只是别指望它在云端自动刷新。

## 总结

| 方式               | 优点                     | 适用场景                    |
| ------------------ | ------------------------ | --------------------------- |
| Pages 直连 Git     | 零配置，原生集成         | 大多数静态博客，首选        |
| Actions + wrangler | 流程可控，可加自定义步骤 | 需要额外构建/检查步骤的项目 |

两种方式都实现了「push 代码 → 自动构建 → 自动部署」。个人博客推荐直接用 **Pages 直连 Git**，一次配置、永久自动部署。
