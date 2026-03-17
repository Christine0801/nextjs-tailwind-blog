/**
 * 临时替换脚本：为所有文章替换封面图片
 * 用法：node scripts/replace-covers.js
 */

const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { getUnsplashImage } = require('../src/lib/unsplash')

const root = process.cwd()

// 读取 .env 文件并设置环境变量
function loadEnvFile() {
  const envPath = path.join(root, '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=')
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        const value = valueParts.join('=').trim()
        process.env[key.trim()] = value
      }
    })
  }
}

loadEnvFile()

/**
 * 递归获取目录下所有文件
 */
function getAllFilesRecursively(folder) {
  const files = fs.readdirSync(folder)
  const allFiles = []

  for (const file of files) {
    const fullPath = path.join(folder, file)
    const stat = fs.statSync(fullPath)

    if (stat.isFile()) {
      allFiles.push(fullPath)
    } else if (stat.isDirectory()) {
      allFiles.push(...getAllFilesRecursively(fullPath))
    }
  }

  return allFiles
}

/**
 * 格式化 slug
 */
function formatSlug(slug) {
  return slug.replace(/\.(mdx|md)/, '')
}

/**
 * 按日期降序排序
 */
function dateSortDesc(a, b) {
  if (a > b) return -1
  if (a < b) return 1
  return 0
}

/**
 * 获取所有文章的 FrontMatter
 */
function getAllFilesFrontMatter(folder) {
  const prefixPaths = path.join(root, 'data', folder)
  const files = getAllFilesRecursively(prefixPaths)
  const allFrontMatter = []

  files.forEach((file) => {
    // 替换路径分隔符（Windows 兼容）
    const fileName = file.slice(prefixPaths.length + 1).replace(/\\/g, '/')

    // 只处理 .md 和 .mdx 文件
    if (path.extname(fileName) !== '.md' && path.extname(fileName) !== '.mdx') {
      return
    }

    const source = fs.readFileSync(file, 'utf8')
    const matterFile = matter(source)
    const frontmatter = matterFile.data

    // 跳过草稿
    if (frontmatter.draft === true) {
      return
    }

    allFrontMatter.push({
      ...frontmatter,
      slug: formatSlug(fileName),
      fileName: fileName,
      date: frontmatter.date ? new Date(frontmatter.date).toISOString() : null,
      lastmod: frontmatter.lastmod ? new Date(frontmatter.lastmod).toISOString() : null,
    })
  })

  return allFrontMatter.sort((a, b) => dateSortDesc(a.date, b.date))
}

/**
 * 更新文章的 images 字段
 */
function updateArticleImages(filePath, imageUrl) {
  // 读取文件内容
  const fileContent = fs.readFileSync(filePath, 'utf8')

  // 解析 FrontMatter
  const { data, content } = matter(fileContent)

  // 更新 images 字段
  data.images = [imageUrl]

  // 重新组合 FrontMatter 和内容
  const updatedContent = matter.stringify(content, data)

  // 写回文件
  fs.writeFileSync(filePath, updatedContent, 'utf8')
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始为所有文章替换封面图片...\n')

  // 获取所有文章
  const articles = await getAllFilesFrontMatter('blog')

  if (articles.length === 0) {
    console.log('❌ 没有找到文章')
    process.exit(1)
  }

  console.log(`📚 找到 ${articles.length} 篇文章\n`)

  let successCount = 0
  let failureCount = 0

  // 遍历所有文章
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]
    const progress = `[${i + 1}/${articles.length}]`

    console.log(`${progress} 处理: ${article.title}`)

    // 构建文件路径
    const filePath = path.join(root, 'data', 'blog', article.fileName)

    // 获取新的封面图片
    try {
      const imageUrl = await getUnsplashImage(article.tags)

      // 更新文章
      updateArticleImages(filePath, imageUrl)

      console.log(`${progress} ✅ 成功更新封面\n`)
      successCount++
    } catch (error) {
      console.error(`${progress} ❌ 更新失败:`, error)
      console.log('')
      failureCount++
    }

    // 添加延迟，避免 API 限流（每秒 1 个请求）
    if (i < articles.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // 输出统计信息
  console.log('\n' + '='.repeat(50))
  console.log('📊 处理完成')
  console.log(`   成功: ${successCount} 篇`)
  console.log(`   失败: ${failureCount} 篇`)
  console.log(`   总计: ${articles.length} 篇`)
  console.log('='.repeat(50))

  if (failureCount > 0) {
    console.log('\n⚠️  有部分文章更新失败，请检查日志')
    process.exit(1)
  } else {
    console.log('\n✅ 所有文章封面更新成功！')
  }
}

// 执行主函数
main().catch((error) => {
  console.error('❌ 脚本执行失败:', error)
  process.exit(1)
})
