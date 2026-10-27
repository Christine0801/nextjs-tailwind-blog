---
title: '免费域名 + Cloudflare：零成本建站全流程'
date: 2026-10-28
lastmod: 2026-10-28
tags:
  - Tutorial
  - Cloudflare
  - DNS
draft: false
summary: '用 DNSHE 免费域名 + Cloudflare Workers 免费托管静态站点，零成本搭建个人博客。'
images: [https://calvinhiram.top/images/cover-free-domain-cloudflare.svg]
authors: ['default']
layout: PostLayout
---

# 免费域名 + Cloudflare：零成本建站全流程

## 背景

搭一个个人网站，传统思路是「买域名 + 租服务器」，两笔钱加起来一年也要几百块。其实对个人博客来说，这两样都可以做到 **0 成本**：

- **域名**：用 DNSHE 这类免费域名服务，白嫖一个像 `calvinhiram.cc.cd` 这样的域名；
- **托管**：用 Cloudflare 的 Workers / Pages 免费托管静态站点，自带 HTTPS 和全球 CDN。

本文记录我搭博客的完整过程。

## 第一步：在 DNSHE 申请免费域名

去 DNSHE 注册账号（可以使用 github 账号登录），按提示申请一个免费域名即可，我拿到的是 `calvinhiram.cc.cd`。

这里有个**关键认知**，很多人一开始就理解错了：

> `.cc.cd` 不是顶级域名。真正的顶级域名是 `.cd`（刚果金的国别域名），`cc.cd` 是 DNSHE 服务商自己注册的域名，而你拿到的 `calvinhiram.cc.cd` 只是它下面的一个**子域名**。

理解这一点很重要，它直接决定了后面能不能把域名接到 Cloudflare。

## 第二步：Cloudflare 部署静态站点

1. 注册 [Cloudflare](https://dash.cloudflare.com/) 账号（可以使用 github 账号登录）。
1. 登录账号后在仪表盘进入域名管理界面，添加前面在 DNSHE 注册的免费域名。![](https://calvinhiram.top/images/20261028060134835.png)然后选择连接域名![](https://calvinhiram.top/images/20261028060309215.png)![](https://calvinhiram.top/images/20261028060541878.png)稍等一会儿 Cloudflare 解析，解析之后会给你两个新的 CNAME，我们需要把这两个新的 CNAME 替换掉 DNSHE 注册的免费域名的默认 CNAME![](https://calvinhiram.top/images/67cbcd7c7d732428f30a5d7533050f1a.jpg)然后去到 DNSHE 后台界面，选择自己注册的那个域名，点击**域名管理**![](https://calvinhiram.top/images/20261028062330939.png)然后点击**DNS 服务器**，把 Cloudflare 给的两个新的 CNAME 复制粘贴填进去，再保存设置![](https://calvinhiram.top/images/20261028062218307.png)![](https://calvinhiram.top/images/20261028062454555.png)至此这个域名就可以开始正常工作了，然后我们就可以通过 Cloudflare 的 Workers 来部署我们的静态网页了。
1. 这里以我自己的个人博客举例![image-20261028060944358](https://calvinhiram.top/images/image-20261028060944358.png)![](https://calvinhiram.top/images/20261028061131758.png)

1. 部署成功后，Cloudflare 会分配一个默认域名，形如：

```
jolly-pond-157b.calvin-hiram.workers.dev
```

这个域名是 Cloudflare 自动配好 DNS 的，**部署完就能直接访问**。

5. 到这里你可能会问：是不是只能一直用 `workers.dev` 那个丑链接？不是。前面我们已经让 Cloudfalre 帮我们托管好了自行注册的免费域名，现在只需要在 Workers 中添加一个自定义域名就行了。进入我们部署的 Workers 管理后台![](https://calvinhiram.top/images/20261028063130161.png)添加新绑定的自定义域名![image-20261028063217098](https://calvinhiram.top/images/image-20261028063217098.png)然后在新弹窗中选定你托管好的域名，然后保存即可，之后浏览器就可以直接用该域名访问你的网站或者博客了

## 总结

| 环节           | 方案                           | 花费 |
| -------------- | ------------------------------ | ---- |
| 域名           | DNSHE 免费域名（本质是子域名） | 0    |
| 托管           | Cloudflare Workers / Pages     | 0    |
| HTTPS / CDN    | Cloudflare 自带                | 0    |
| 绑定自定义域名 | Worker Custom Domain + CNAME   | 0    |

整套下来一分钱不花。唯一要留意的就是免费域名的「子域名」性质——它决定了 DNS 得留在原服务商，用 CNAME 而不是改 NS 的方式绑定。如果你用的是真正自己注册的一级域名（如 `.com`、`.top`），那就可以直接在 Cloudflare 添加站点、改 NS 托管，反而更简单。
