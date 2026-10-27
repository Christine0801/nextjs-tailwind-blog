# 子君的博客

基于 Next.js + Tailwind CSS 的个人技术博客。

## 致谢

本项目基于 [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) 二次开发，感谢原作者 [Timothy Lin](https://github.com/timlrx) 的优秀模板。

## 技术栈

- Next.js 12 (Pages Router)
- Tailwind CSS 3
- TypeScript
- MDX (mdx-bundler)

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm run serve
```

## 命令说明

| 命令                      | 说明                                                  |
| ------------------------- | ----------------------------------------------------- |
| `npm run dev`             | 启动开发服务器                                        |
| `npm run start`           | 启动开发服务器（含文件监听热重载）                    |
| `npm run build`           | 生产构建（自动更新日期、生成封面、生成 sitemap）      |
| `npm run serve`           | 启动生产服务器                                        |
| `npm run export`          | 导出为静态站点（需先 `npm run build`，输出到 `out/`） |
| `npm run new-post "标题"` | 创建新文章                                            |
| `npm run lock-post`       | 给文章上密码锁（交互式）                              |
| `npm run unlock-post`     | 给文章解锁（交互式）                                  |
| `npm run lint`            | 代码检查                                              |
| `npm run analyze`         | 分析构建产物                                          |

## 文章密码保护

部分文章支持密码保护，访问时需输入密码才能查看内容。

密码加密方案：构建时 AES-256-GCM 加密，浏览器端 Web Crypto API 解密，密码存储在 `.env` 文件中（不提交到 Git）。

```bash
# 给文章上锁
npm run lock-post
# → 选择文章 → 设置密码 → 自动写入 frontmatter 和 .env

# 解锁文章
npm run unlock-post
# → 选择文章 → 确认解锁

# 上锁/解锁后需要重新构建
npm run build
```

文章 frontmatter 示例：

```yaml
---
title: '文章标题'
date: 2025-01-01 12:00:00
tags: [tag1, tag2]
draft: false
summary: '文章摘要'
images: ['/static/images/cover.png']
authors: ['default']
layout: PostLayout
password_env: BLOG_PW_MY_POST # 密码锁：指向 .env 中的变量
---
```

`password_env` 对应的 `.env` 配置：

```bash
BLOG_PW_MY_POST=你的密码
```

## 部署

项目使用 GitHub Actions 自动部署到服务器，详见 `.github/workflows/deploy-server.yml`。

## 静态导出

如需将站点导出为纯静态 HTML（可部署到 GitHub Pages、OSS、Nginx 等任意静态托管）：

```bash
# 先构建
npm run build

# 再导出静态站点（输出到 out/ 目录）
npm run export
```

或一条命令：

```bash
npm run build && npm run export
```

> ⚠️ 注意：静态导出不支持 API Routes，且 `next.config.js` 里配置的 `redirects` 与 `headers` 不会生效。具体影响：
>
> - `src/pages/api/` 下的邮件订阅接口（buttondown / convertkit / klaviyo / mailchimp）在纯静态环境下不会生效；
> - `/blog/1`、`/blog/4`、`/blog/6` 的旧链接重定向、以及安全响应头（CSP 等）需要改在托管层（Nginx / Netlify `_redirects` / `_headers`）配置。
>
> 若依赖这些服务端功能，请改用 `npm run serve` 部署到 Node.js 服务器。

## License

MIT
