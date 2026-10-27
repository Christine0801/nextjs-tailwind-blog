---
title: 'PicGo 连接 Cloudflare R2 图床配置教程'
date: 2026-10-28
lastmod: 2026-10-28
tags:
  - Tutorial
  - Tool
  - PicGo
draft: false
summary: '用 PicGo 的 S3 直连插件对接 Cloudflare R2，实现截图即传、返回自建域名链接，并记录 getRandomValues 报错的踩坑与解法。'
images: [https://calvinhiram.top/images/cover-picgo-r2.svg]
authors: ['default']
layout: PostLayout
---

# PicGo 连接 Cloudflare R2 图床配置教程

## 背景

上一篇文章把图片存储放在了 Cloudflare R2。这篇讲怎么用 **PicGo** 一键上传图片到 R2，让截图/剪贴板直接变成可粘贴的图片链接。

PicGo 本身不直接支持 R2，但 R2 是 **S3 兼容**的，所以可以用 PicGo 的 S3 插件对接。

## 插件选择：认准「xqv」这个 S3 直连版

在 PicGo 插件市场搜 cloudflare，会出现几个结果，容易装错。常见的有两个：

| 插件                             | 类型          | 说明                                                                                               |
| -------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `picgo-plugin-cloudflare-r2`     | Worker 版     | 需要先额外部署一个上传 Worker，字段只有 remoteURL/secret/uploadPath，secret 是 Worker 自己设的密钥 |
| `picgo-plugin-cloudflare-r2-xqv` | **S3 直连版** | 直接连 R2 的 S3 API，用 R2 的 Access Key，**推荐用这个**                                           |

推荐装 **`picgo-plugin-cloudflare-r2-xqv`**，它不需要部署 Worker，直接用你在 R2 里创建好的 API Token 就能传。

## 配置字段

装好后填 6 个字段，值都在上一篇创建 R2 桶时拿到过。如果当时忘了保存就再创建一个新的桶：

| 字段            | 填什么                                             |
| --------------- | -------------------------------------------------- |
| cloudflare 端点 | `https://<你的accountid>.r2.cloudflarestorage.com` |
| accessKey       | R2 API Token 里的 **Access Key ID**                |
| access 密钥     | R2 API Token 里的 **Secret Access Key**            |
| 存储桶名        | 你建的桶名，如 `blog-image`                        |
| 域名地址        | `https://你的域名`（**纯域名，别带路径**）         |
| 目录            | `images`（**纯目录名，别带占位符**）               |

两个容易踩的坑：

1. **「域名地址」填纯域名**，不要填 `https://你的域名/images`。因为插件内部会用 `域名 + 目录 + 文件名` 拼接链接，目录已经提供 `images` 了，域名再带路径就会重复。

2. **「目录」不支持占位符**。别填 `images/{fullName}` 或 `images/{md5}.{extName}` 这种——这个插件的目录字段就是纯目录前缀，`{fullName}` 会被当成字面量目录名。图片文件名是 PicGo 自己的「重命名」设置决定的，默认保留原文件名。

## 踩坑：getRandomValues is not a function

配置好后上传，报了这个错：

```
Failed to upload ... to S3: getRandomValues is not a function
```

这个错**不是配置的问题**，而是 **PicGo 内置的 Node 版本太老**。S3 插件的底层依赖 `@smithy/core` 会调用 Web Crypto 的 `crypto.getRandomValues`，老 Node 的 `crypto` 模块顶层没有这个方法，于是报错。

最关键的认知：**换插件没用**。只要插件走 @aws-sdk v3，底层都依赖 `@smithy/core`，都会触发这个错。

解决办法就一条（治本）：

> **把 PicGo 升级到最新版**（去官网下载覆盖安装，配置会保留）。新版内置 Node 更新，`getRandomValues` 可用，这个错直接消失。

我折腾了一轮「换插件 → 重新配置 → 还是报错」才明白根因在 PicGo 版本，白绕了弯路。升级后一切正常。

## 上传验证

升级 PicGo、填好配置后，传一张图测试：

- 上传成功，返回链接是 `https://你的域名/images/xxx.png` 开头 → 成功。
- 返回链接是 `https://pub-xxx.r2.dev/...` 开头 → 说明自定义域名还没生效，回去检查桶的自定义域名绑定。

之后就可以用 PicGo 日常传图了，返回的链接和博客里现有的图片格式完全一致。

## 小结

PicGo 连 R2 用 `picgo-plugin-cloudflare-r2-xqv`（S3 直连）即可，6 个字段填完就能用。唯一要注意的是 `getRandomValues is not a function` 这个报错——别换插件，**升级 PicGo** 才是解药。
