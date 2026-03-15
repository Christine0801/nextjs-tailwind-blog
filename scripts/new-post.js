const fs = require('fs')
const path = require('path')

/**
 * 将标题转换为 kebab-case 文件名
 */
function titleToSlug(title) {
  return (
    title
      .toLowerCase()
      // 替换空格为连字符
      .replace(/\s+/g, '-')
      // 移除特殊字符（保留中文、英文、数字、连字符）
      .replace(/[^\u4e00-\u9fa5a-z0-9-]/g, '')
      // 移除多个连续的连字符
      .replace(/-+/g, '-')
      // 移除开头和结尾的连字符
      .replace(/^-+|-+$/g, '')
  )
}

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss
 */
function formatDate(date) {
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 生成博客文章模板
 */
function generateTemplate(title) {
  const now = new Date()
  const formattedDate = formatDate(now)

  return `---
title: '${title}'
date: ${formattedDate}
lastmod: ${formattedDate}
tags: []
draft: false
summary: ''
images: []
authors: ['default']
layout: PostLayout
---


这里开始写你的文章内容...
`
}

/**
 * 主函数
 */
function main() {
  // 获取命令行参数（跳过前两个：node 和脚本路径）
  const args = process.argv.slice(2)

  // 检查是否提供了标题
  if (args.length === 0) {
    console.log('❌ 错误：请提供文章标题')
    console.log('   使用方法：npm run new-post "你的文章标题"')
    process.exit(1)
  }

  // 获取标题（支持包含空格的标题）
  const title = args.join(' ')

  console.log(`📝 创建新文章: ${title}`)

  // 生成文件名
  const slug = titleToSlug(title)
  const filename = `${slug}.md`

  // 构建文件路径
  const blogDir = path.join(__dirname, '..', 'data', 'blog')
  const filePath = path.join(blogDir, filename)

  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    console.log(`⚠️  警告：文件 ${filename} 已存在`)
    console.log('   请选择其他标题或手动删除现有文件')
    process.exit(1)
  }

  // 生成模板内容
  const content = generateTemplate(title)

  // 创建文件
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ 文章创建成功: ${filename}`)
    console.log(`📂 文件路径: ${filePath}`)
    console.log('')
    console.log('提示：')
    console.log('  1. 编辑文件内容，填写 tags、summary 等信息')
    console.log('  2. 写完文章后，可以运行 npm run dev 预览')
  } catch (error) {
    console.log('❌ 错误：创建文件失败')
    console.log(`   ${error.message}`)
    process.exit(1)
  }
}

// 执行主函数
main()
