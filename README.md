# Nextjs Tailwind Blog

## Template

https://github.com/timlrx/tailwind-nextjs-starter-blog

## 技术栈

- Next.js
- Tailwind CSS 3.0
- TypeScript
- MDX

## 使用静态博客的原因

我写博客，需要将博客同步到知乎、掘金、微信公众号等、一是这些平台的代码编辑器不怎么好用，尤其是图片会加上水印、后来我选择自建使用 Postgresql 和 next.js、但维护这些数据库需要一些成本、为了避免每年数据库迁移、现在将代码都托管到 github、使用 vercel.com 自动部署

## Installation

```bash
npm install
```

## Development

First, run the development server:

```bash
npm start
```

or

```bash
npm run dev
```

## 脚本命令

### 博客管理

```bash
# 创建新文章
npm run new-post "文章标题"

# 更新文章日期
npm run update-dates
```

### 封面图片管理

```bash
# 为所有文章替换封面图片（批量更新）
npm run replace-covers

# 为没有封面的文章生成封面（构建时自动调用）
npm run generate-covers
```

### 构建和部署

```bash
# 构建项目（包含封面生成）
npm run build

# 启动生产服务器
npm run serve

# 导出为静态页面
npm run build && npx next export
# 构建完成后，静态文件会生成在 out 目录中
# 可以直接部署 out 目录到任何静态托管服务
```

## 环境变量

在项目根目录创建 `.env` 文件：

```env
# Google Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-5L7B55Y98R

# Unsplash API（用于自动生成封面图片）
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

## 项目结构

```
├── data/
│   ├── blog/           # 博客文章（Markdown 文件）
│   └── authors/        # 作者信息
├── public/
│   └── static/         # 静态资源
├── scripts/
│   ├── new-post.js              # 创建新文章脚本
│   ├── update-dates.js          # 更新日期脚本
│   ├── replace-covers.js       # 替换封面脚本
│   ├── generate-covers.js      # 生成封面脚本
│   └── generate-sitemap.js     # 生成站点地图
├── src/
│   ├── components/     # React 组件
│   ├── layouts/        # 页面布局
│   ├── lib/            # 工具函数
│   ├── pages/          # Next.js 页面
│   └── css/            # 样式文件
└── types/              # TypeScript 类型定义
```

## 常见问题

### 如何添加新文章？

```bash
npm run new-post "文章标题"
```

这会在 `data/blog/` 目录下创建一个新的 Markdown 文件，编辑该文件即可。

### 如何自动生成封面图片？

项目会自动为没有封面图片的文章生成 Unsplash 封面：

1. **自动生成**：运行 `npm run build` 时会自动为新文章生成封面
2. **手动生成**：运行 `npm run generate-covers` 为缺少封面的文章生成
3. **批量替换**：运行 `npm run replace-covers` 替换所有文章的封面

封面图片会根据文章的英文标签自动匹配相关主题的图片。

### 如何导出静态页面？

```bash
npm run build && npx next export
```

执行完成后，静态文件会生成在 `out` 目录中，可以部署到任何静态托管服务（如 GitHub Pages、Netlify、Vercel 等）。
