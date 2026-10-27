---
title: 'Cloudflare R2 对象存储：免费图床存储方案'
date: 2026-10-28
lastmod: 2026-10-28
tags:
  - Tutorial
  - Cloudflare
  - Tool
draft: false
summary: '告别自建服务器的图床存储，用 Cloudflare R2 免费对象存储存放图片，出口流量免费，配合自定义域名实现零成本图床。'
images: [https://calvinhiram.top/images/cover-cloudflare-r2.svg]
authors: ['default']
layout: PostLayout
---

# Cloudflare R2 对象存储：免费图床存储方案

## 背景

我之前搭图床用的是「云服务器 + Nginx + SFTP」，把图片放在服务器磁盘上。好处是可控，坏处是：

- 服务器磁盘和**出口流量都要钱**，流量一大就是隐性成本；
- 服务器一到期，图床整个就没了，图片也跟着挂。

后来我把图床的存储部分迁到了 **Cloudflare R2**，这是 Cloudflare 提供的 S3 兼容对象存储，个人博客用完全免费。

## R2 的免费额度（个人完全够用）

| 项目                  | 免费额度       |
| --------------------- | -------------- |
| 存储                  | 10 GB / 月     |
| A 类操作（写入/删除） | 100 万次 / 月  |
| B 类操作（读取）      | 1000 万次 / 月 |
| **出口流量**          | **免费**       |

「出口流量免费」是 R2 最香的一点——图床最怕的就是别人反复访问你的图产生流量费，R2 直接免了。对比 AWS S3、阿里云 OSS，这是巨大的优势。

## 创建存储桶

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，左侧点「R2 对象存储」。![image-20261028063828109](https://calvinhiram.top/images/image-20261028063828109.png)第一次使用会需要添加订阅计划，这一步需要绑卡，笔者是用了大学时候学校办理的一张中国银行借记卡，具有**UnionPay**标志即可，卡片后面会有安全码
2. 点「创建存储桶」，起个名字（如 `blog-image`），位置选「自动」。![](https://calvinhiram.top/images/20261028064016479.png)
3. 进入桶的 Settings，开启 **Public access**（公共访问）——否则图片无法被外部访问。![](https://calvinhiram.top/images/20261028064205487.png)

## 创建 API Token（S3 凭证）

后面用 PicGo 等工具上传图片，需要一对 S3 凭证：

1. R2 页面右侧点「**管理 R2 API 令牌**」→「创建 API 令牌」。![image-20261028064446604](https://calvinhiram.top/images/image-20261028064446604.png)![](https://calvinhiram.top/images/20261028064525493.png)
2. 权限选「对象读写」，可以限制只允许访问某个桶（更安全）。![image-20261028064749614](https://calvinhiram.top/images/image-20261028064749614.png)其他都默认，然后创建即可。
3. 创建后页面会显示两组信息，务必**立刻复制保存**：
   - **Access Key ID**：S3 的密钥 ID；
   - **Secret Access Key**：S3 的密钥机密（**只显示这一次**）；
   - 以及 **Endpoint**（终结点）：`https://<你的accountid>.r2.cloudflarestorage.com`。

> 注意区分：这个页面还会给一个 `Token value`（`cfut_...` 开头），那是给 Cloudflare API 用的 Bearer Token，**不是** S3 上传要用的，别搞混了。

## 绑定自定义域名

R2 的 public 桶默认会提供一个 `pub-xxx.r2.dev` 域名，但它有速率限制、只适合测试。**如果没有自己的域名，这一步就可以忽略**。

1. 先把你的域名通过「添加站点」接到 Cloudflare，改 NS 生效。
2. 回到桶的 Settings → 自定义域名（Custom Domains）→ 添加。![image-20261028065114129](https://calvinhiram.top/images/image-20261028065114129.png)
3. Cloudflare 自动配好 DNS 和 SSL 证书。

绑定后，桶里 `images/` 目录下的文件，就能通过 `https://<your domain>/images/xxx.webp` 访问了。

## 和自建 Nginx 图床的对比

| 对比项   | 自建（云服务器 + Nginx） | Cloudflare R2            |
| -------- | ------------------------ | ------------------------ |
| 存储成本 | 服务器磁盘计费           | 10GB 免费                |
| 流量成本 | 出口流量计费             | 免费                     |
| 运维     | 要自己维护 Nginx         | 零运维                   |
| 到期风险 | 服务器到期数据可能丢     | 存储与域名解耦，数据安全 |
| 分发     | 单台服务器               | 全球 CDN                 |

核心变化是「存储」和「域名」彻底解耦了：图片文件存在 R2 里，域名只是指向它的入口。就算哪天域名不续费了，图片数据还在，换个域名重新绑定即可，不会像服务器到期那样连数据一起没了。

## 小结

R2 适合做个人图床的存储底座：免费额度够用、流量免费、S3 协议通用、还能绑自己的域名。下一步配合 PicGo 就能实现一键上传，见下一篇《PicGo 连接 Cloudflare R2 图床配置教程》。
