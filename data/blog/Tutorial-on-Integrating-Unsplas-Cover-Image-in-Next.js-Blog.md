---
title: 'Next.js 博客集成 Unsplash 封面图片功能完整教程'
date: 2026-03-18 05:29:01
lastmod: 2026-03-19 14:16:16
tags: [UnplashAPI, Automation, Technical Tutorial, Image Processing, Blog Development, Next.js]
draft: false
summary: '博客开发完成后，苦恼于文章卡片封面问题，因为博主维护博客并不频繁，所以不打算继续订阅OSS服务，所以给自己的项目引入UnplashAPI，来为文章自动生成封面，不过有概率会出现封面和内容相关度不高的情况'
images: [/static/images/00658PICz3N2Jp7daf268_PIC2018_PIC2018.jpg]
authors: ['default']
layout: PostLayout
---

# Next.js 博客集成 Unsplash 封面图片功能完整教程

## 1. 项目背景

### 1.1 问题起源

- 原博客使用 OSS 服务器存储文章封面图片
- OSS 服务器订阅过期，需要寻找替代方案
- 考虑到博客更新频率低，不愿订阅新的付费服务

### 1.2 需求分析

- **核心需求**：为博客文章卡片提供封面图片
- **关键要求**：
  - 完全免费或低成本
  - 自动化生成，减少手动维护
  - 封面图片固定，不随访问变化
  - 支持 API 配额限制，避免超额费用
  - 开发环境友好，不浪费配额

### 1.3 技术选型

经过调研，选择 **Unsplash API** 方案：

- ✅ 免费使用（50 次/小时配额）
- ✅ 图片质量高，版权友好
- ✅ API 简单易用
- ✅ 支持基于标签的搜索

## 2. 方案设计

### 2.1 核心思路

```
文章标签 → Unsplash API 搜索 → 获取图片URL → 写入FrontMatter → 固定封面
```

### 2.2 脚本分工

#### 临时替换脚本 (`replace-covers.js`)

- **用途**：一次性批量更新所有文章封面
- **时机**：首次迁移或需要批量更新时
- **特点**：无视现有封面，强制更新

#### 构建时生成脚本 (`generate-covers.js`)

- **用途**：自动化处理新文章
- **时机**：每次构建时自动执行
- **特点**：只处理无封面文章，避免重复请求

### 2.3 数据流设计

```javascript
1. 读取文章 FrontMatter
2. 检查 images 字段是否为空
3. 提取 tags 中的英文标签
4. 调用 Unsplash API 搜索图片
5. 将图片 URL 写入 FrontMatter
6. 构建时读取固定的图片 URL
```

## 3. 实现步骤

### 3.1 环境准备

#### 注册 Unsplash 并获取 API Key

1. 访问 [Unsplash Developers](https://unsplash.com/developers)
2. 注册账号并登录
3. 点击 "New Application" 创建应用
4. 填写应用信息：
   - **Application name**: 博客名称
   - **Description**: 博客封面图片自动生成
   - **Use case**: Educational 或 Personal
5. 获取 Access Key（不需要 Secret Key）

#### 配置环境变量

```bash
# .env 文件
UNSPLASH_ACCESS_KEY=your_access_key_here

# .env.example 文件
UNSPLASH_ACCESS_KEY=
```

**⚠️ 重要提示**：

- 不要将 `.env` 文件提交到 Git
- `.env.example` 用于说明需要哪些环境变量
- Access Key 可以用于客户端和服务端

### 3.2 创建核心工具函数

#### 文件：`src/lib/unsplash.js`

```javascript
/**
 * Unsplash API 工具函数
 * 用于根据文章标签自动生成封面图片
 */

const DEFAULT_IMAGE = '/static/favicons/android-chrome-512x512.png'

/**
 * 检查字符串是否包含中文字符
 */
function hasChinese(text) {
  return /[\u4e00-\u9fa5]/.test(text)
}

/**
 * 过滤英文标签
 * 只保留英文标签，提高搜索相关性
 */
function filterEnglishTags(tags) {
  return tags.filter((tag) => !hasChinese(tag))
}

/**
 * 获取 Unsplash 图片 URL
 * @param {string[]} tags - 文章标签数组
 * @returns {Promise<string>} 图片 URL
 */
async function getUnsplashImage(tags) {
  if (!process.env.UNSPLASH_ACCESS_KEY) {
    console.warn('⚠️  UNSPLASH_ACCESS_KEY 未配置，使用默认图片')
    return DEFAULT_IMAGE
  }

  // 过滤英文标签
  const englishTags = filterEnglishTags(tags)

  // 如果没有英文标签，使用默认图片
  if (englishTags.length === 0) {
    console.warn('⚠️  没有英文标签，使用默认图片')
    return DEFAULT_IMAGE
  }

  // 使用前两个标签进行搜索（提高相关性）
  const searchQuery = englishTags.slice(0, 2).join(' ')

  console.log(`🔍 搜索 Unsplash 图片: "${searchQuery}"`)

  // 重试逻辑
  const retries = 3
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          searchQuery
        )}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const imageUrl = data.results[0].urls.regular
        console.log(`✅ 获取图片成功: ${imageUrl}`)
        return imageUrl
      } else {
        throw new Error('No results found')
      }
    } catch (error) {
      console.error(`❌ 尝试 ${attempt}/${retries} 失败:`, error.message)

      if (attempt === retries) {
        console.warn('⚠️  所有尝试失败，使用默认图片')
        return DEFAULT_IMAGE
      }

      // 等待 2 秒后重试
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
}

module.exports = { getUnsplashImage, DEFAULT_IMAGE }
```

**关键设计点**：

- 只使用英文标签搜索（中文搜索效果差）
- 前 2 个标签组合搜索（提高相关性）
- 3 次重试机制 + 10 秒超时（应对国内网络）
- 降级策略：失败时使用默认图片

### 3.3 创建临时替换脚本

#### 文件：`scripts/replace-covers.js`

```javascript
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { getUnsplashImage } = require('../src/lib/unsplash.js')

/**
 * 加载环境变量
 */
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key] = value.trim()
      }
    })
  }
}

/**
 * 递归获取所有 markdown 文件
 */
function getAllMarkdownFiles(dir) {
  const files = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath))
    } else if (item.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * 更新文章封面
 */
async function updateArticleCover(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContent)

  // 获取标签
  const tags = data.tags || []

  // 调用 Unsplash API
  console.log(`\n[${filePath}]`)
  console.log(`标题: ${data.title}`)
  console.log(`标签: ${tags.join(', ')}`)

  const imageUrl = await getUnsplashImage(tags)

  // 更新 FrontMatter
  const newFrontMatter = {
    ...data,
    images: [imageUrl],
  }

  const newContent = matter.stringify(content, newFrontMatter)
  fs.writeFileSync(filePath, newContent)

  console.log(`✅ 更新成功`)
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始为所有文章替换封面图片...')

  loadEnvFile()

  const blogDir = path.join(__dirname, '..', 'data', 'blog')
  const markdownFiles = getAllMarkdownFiles(blogDir)

  console.log(`📚 找到 ${markdownFiles.length} 篇文章\n`)

  for (let i = 0; i < markdownFiles.length; i++) {
    const file = markdownFiles[i]
    console.log(`[${i + 1}/${markdownFiles.length}] 处理: ${path.basename(file)}`)

    try {
      await updateArticleCover(file)
    } catch (error) {
      console.error(`❌ 处理失败:`, error.message)
    }

    // 避免触发 API 限流，每次请求间隔 1 秒
    if (i < markdownFiles.length - 1) {
      await delay(1000)
    }
  }

  console.log('\n✅ 所有文章封面替换完成！')
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error)
  process.exit(1)
})
```

**关键设计点**：

- 强制更新所有文章（包括已有封面的）
- 每秒处理 1 篇（避免 API 限流）
- 完善的错误处理和日志输出

### 3.4 创建构建时生成脚本

#### 文件：`scripts/generate-covers.js`

```javascript
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { getUnsplashImage } = require('../src/lib/unsplash.js')

/**
 * 加载环境变量
 */
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key] = value.trim()
      }
    })
  }
}

/**
 * 递归获取所有 markdown 文件
 */
function getAllMarkdownFiles(dir) {
  const files = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath))
    } else if (item.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * 为无封面的文章生成封面
 */
async function generateCoverIfNeeded(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContent)

  // 检查是否已有封面
  if (data.images && data.images.length > 0) {
    console.log(`⏭️  跳过（已有封面）: ${path.basename(filePath)}`)
    return
  }

  // 获取标签
  const tags = data.tags || []

  // 调用 Unsplash API
  console.log(`\n[${filePath}]`)
  console.log(`标题: ${data.title}`)
  console.log(`标签: ${tags.join(', ')}`)

  const imageUrl = await getUnsplashImage(tags)

  // 更新 FrontMatter
  const newFrontMatter = {
    ...data,
    images: [imageUrl],
  }

  const newContent = matter.stringify(content, newFrontMatter)
  fs.writeFileSync(filePath, newContent)

  console.log(`✅ 生成成功`)
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始为无封面文章生成封面图片...')

  loadEnvFile()

  const blogDir = path.join(__dirname, '..', 'data', 'blog')
  const markdownFiles = getAllMarkdownFiles(blogDir)

  console.log(`📚 找到 ${markdownFiles.length} 篇文章\n`)

  let generatedCount = 0
  for (let i = 0; i < markdownFiles.length; i++) {
    const file = markdownFiles[i]
    console.log(`[${i + 1}/${markdownFiles.length}] 检查: ${path.basename(file)}`)

    try {
      const originalContent = fs.readFileSync(file, 'utf8')
      await generateCoverIfNeeded(file)
      const newContent = fs.readFileSync(file, 'utf8')

      if (originalContent !== newContent) {
        generatedCount++
      }
    } catch (error) {
      console.error(`❌ 处理失败:`, error.message)
    }

    // 避免触发 API 限流
    if (i < markdownFiles.length - 1) {
      await delay(1000)
    }
  }

  console.log(`\n✅ 完成！为 ${generatedCount} 篇文章生成了封面`)
}

main().catch((error) => {
  console.error('❌ 脚本执行失败:', error)
  process.exit(1)
})
```

**关键设计点**：

- 只处理无封面文章（避免重复请求）
- 统计实际生成的数量
- 同样的错误处理和限流机制

### 3.5 集成到构建流程

#### 修改 `package.json`

```json
{
  "scripts": {
    "build": "node scripts/update-dates.js && node scripts/generate-covers.js && next build && node ./scripts/generate-sitemap",
    "replace-covers": "node scripts/replace-covers.js",
    "generate-covers": "node scripts/generate-covers.js"
  }
}
```

**构建流程**：

1. 更新文章修改时间
2. 为新文章生成封面
3. 构建 Next.js 项目
4. 生成站点地

## 4. 注意事项和最佳实践

### 4.1 API 配额管理

#### Unsplash 免费版限制

- **请求限制**：50 次/小时
- **使用策略**：
  - 智能缓存：避免重复请求
  - 批量处理：控制请求频率
  - 降级策略：失败时使用默认图片

#### 配额优化技巧

```javascript
// 只处理无封面文章
if (data.images && data.images.length > 0) {
  return // 跳过已有封面的文章
}

// 请求间隔
await delay(1000) // 每秒1次

// 使用重试机制
const retries = 3
for (let attempt = 1; attempt <= retries; attempt++) {
  // ... 重试逻辑
}
```

### 4.2 标签使用策略

#### 中文标签处理

```javascript
function filterEnglishTags(tags) {
  return tags.filter((tag) => !hasChinese(tag))
}
```

**原因**：

- Unsplash 对中文搜索支持较差
- 英文搜索结果更准确
- 技术词汇本来就是英文

#### 多标签组合

```javascript
// 使用前2个标签
const searchQuery = englishTags.slice(0, 2).join(' ')
```

**好处**：

- 提高搜索相关性
- 避免关键词过长
- 更精准的图片匹配

### 4.3 降级策略

#### 完善的降级机制

```javascript
// 1. 环境变量未配置
if (!process.env.UNSPLASH_ACCESS_KEY) {
  return DEFAULT_IMAGE
}

// 2. 没有英文标签
if (englishTags.length === 0) {
  return DEFAULT_IMAGE
}

// 3. API 调用失败
if (attempt === retries) {
  return DEFAULT_IMAGE
}
```

#### 默认图片选择

- 项目 Logo
- 品牌标识
- 技术图标

### 4.4 构建集成

#### 构建流程设计

```json
"build": "node scripts/update-dates.js && node scripts/generate-covers.js && next build && node ./scripts/generate-sitemap"
```

**优势**：

- 自动化处理新文章
- 每次构建自动更新
- 无需手动干预

#### 开发环境友好

- 开发环境不需要调用 API
- 已有封面的文章跳过
- 不浪费 API 配额

### 4.5 错误处理

#### 完善的错误捕获

```javascript
try {
  const imageUrl = await getUnsplashImage(tags)
  // 处理结果
} catch (error) {
  console.error(`❌ 处理失败:`, error.message)
  // 继续处理下一篇文章
}
```

#### 详细的日志输出

```javascript
console.log(`[${i + 1}/${markdownFiles.length}] 处理: ${path.basename(file)}`)
console.log(`标题: ${data.title}`)
console.log(`标签: ${tags.join(', ')}`)
console.log(`✅ 更新成功`)
```

**好处**：

- 便于问题排查
- 了解处理进度
- 统计成功/失败数量

### 4.6 文件操作安全

#### 避免重复写入

```javascript
const originalContent = fs.readFileSync(file, 'utf8')
// ... 处理逻辑
const newContent = fs.readFileSync(file, 'utf8')

if (originalContent !== newContent) {
  // 只在内容变化时统计
  generatedCount++
}
```

#### 原子性操作

```javascript
// 先读取完整内容
const content = fs.readFileSync(filePath, 'utf8')

// 处理内容
const newContent = processContent(content)

// 一次性写入
fs.writeFileSync(filePath, newContent)
```

## 5. 测试和验证

### 5.1 本地测试

#### 测试临时替换脚本

```bash
npm run replace-covers
```

**验证要点**：

- 所有文章是否都有封面
- 英文标签的文章是否有相关图片
- 无英文标签的文章是否使用默认图片

#### 测试构建脚本

```bash
npm run generate-covers
```

**验证要点**：

- 只处理无封面文章
- 已有封面文章不被修改
- 新文章能自动生成封面

### 5.2 开发服务器测试

```bash
npm run dev
```

**检查内容**：

- 封面图片是否正常显示
- 图片链接是否正确
- 默认图片是否生效

### 5.3 生产部署测试

#### GitHub Actions 部署

1. 提交代码到 GitHub
2. 触发 GitHub Actions 工作流
3. 检查部署日志
4. 访问服务器验证

#### 服务器验证

```bash
# 检查 Nginx 配置
sudo nginx -t

# 检查部署文件
ls -la /var/www/blog/

# 测试服务器本地访问
curl -I http://localhost
```

## 6. 维护和扩展

### 6.1 定期维护

#### 检查 API 使用情况

- 监控 API 调用次数
- 关注配额使用情况
- 必要时升级到付费版

#### 更新封面图片

```bash
# 批量更新所有封面
npm run replace-covers
```

### 6.2 功能扩展

#### 添加图片尺寸控制

```javascript
const response = await fetch(
  `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    searchQuery
  )}&per_page=1&orientation=landscape&w=1200&h=630`, // 指定尺寸
  {
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
    },
  }
)
```

#### 添加图片风格选择

```javascript
// 添加风格参数
;`&color=black_and_white` // 黑白风格
`&orientation=portrait` // 竖向图片
```

### 6.3 性能优化

#### 并发控制

```javascript
// 使用 Promise.all 限制并发数
async function processFiles(files, concurrency = 3) {
  const batches = []
  for (let i = 0; i < files.length; i += concurrency) {
    batches.push(files.slice(i, i + concurrency))
  }

  for (const batch of batches) {
    await Promise.all(batch.map(processFile))
    await delay(1000) // 批次之间延迟
  }
}
```

#### 缓存优化

```javascript
// 基于标签的简单缓存
const imageCache = new Map()

function getCachedImage(tags) {
  const cacheKey = tags.join(',')
  return imageCache.get(cacheKey)
}

function setCachedImage(tags, imageUrl) {
  const cacheKey = tags.join(',')
  imageCache.set(cacheKey, imageUrl)
}
```

## 7. 常见问题解答

### Q1: 为什么有些文章显示默认图片？

**A**: 可能原因：

1. 文章没有英文标签
2. API 调用失败
3. API 配额用完
4. 环境变量未配置

**解决方法**：

- 添加英文标签
- 检查服务器日志
- 升级 API 配额
- 检查 `.env` 配置

### Q2: 如何手动更换某个文章的封面？

**A**: 有两种方法：

1. 修改 FrontMatter 中的 `images` 字段
2. 重新运行 `npm run replace-covers`

### Q3: 开发环境会浪费 API 配额吗？

**A**: 不会！

- 构建脚本只处理无封面文章
- 已有封面的文章会被跳过
- 本地开发不调用 API

### Q4: 可以使用其他图床服务吗？

**A**: 可以！只需要修改 `getUnsplashImage` 函数，替换为其他 API 即可：

- Pexels
- Pixabay
- Unsplash（当前方案）

### Q5: 如何禁用自动封面生成？

**A**: 从 `package.json` 的 `build` 脚本中移除：

```json
"build": "node scripts/update-dates.js && next build && node ./scripts/generate-sitemap"
```

## 8. 总结

### 8.1 实现效果

✅ **自动化**：构建时自动为新文章生成封面
✅ **零成本**：使用 Unsplash 免费版 API
✅ **稳定性**：封面图片永久固定
✅ **智能化**：基于标签的相关性匹配
✅ **可靠性**：完善的错误处理和降级策略

### 8.2 技术亮点

1. **双脚本设计**：临时批量更新 + 自动构建生成
2. **智能缓存**：避免重复 API 调用
3. **降级策略**：多种情况下的 fallback 机制
4. **开发友好**：不浪费 API 配额
5. **错误处理**：完善的异常捕获和日志

### 8.3 项目收益

- ✅ 节省 OSS 存储成本
- ✅ 减少维护工作量
- ✅ 提升博客外观
- ✅ 增强用户体验
- ✅ 自动化内容管理

## 9. 参考资料

- [Unsplash API 文档](https://unsplash.com/developers)
- [Next.js 官方文档](https://nextjs.org/)
- [gray-matter 库](https://github.com/jonschlinkert/gray-matter)
- [Nginx 配置指南](https://nginx.org/en/docs/)
