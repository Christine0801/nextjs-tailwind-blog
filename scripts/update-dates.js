const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 递归遍历 data/blog 目录
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

// 获取文件的最后 Git 提交时间
function getLastGitModifiedDate(filePath) {
  try {
    const date = execSync(`git log -1 --format=%ai -- "${filePath}"`, {
      encoding: 'utf-8',
    }).trim()
    return date
  } catch (error) {
    return null
  }
}

// 解析 Markdown 文件的 FrontMatter
function parseFrontMatter(content) {
  const lines = content.split('\n')
  const frontMatter = {}
  let inFrontMatter = false
  let frontMatterEndIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (i === 0 && line === '---') {
      inFrontMatter = true
      continue
    }

    if (inFrontMatter && line === '---') {
      frontMatterEndIndex = i + 1
      break
    }

    if (inFrontMatter) {
      const match = line.match(/^(\w+):\s*(.*)$/)
      if (match) {
        frontMatter[match[1]] = match[2]
      }
    }
  }

  return { frontMatter, frontMatterEndIndex }
}

// 更新 markdown 文件的 lastmod
function updateMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const { frontMatter, frontMatterEndIndex } = parseFrontMatter(content)

  const lastGitModifiedDate = getLastGitModifiedDate(filePath)

  if (!lastGitModifiedDate) {
    return // 无法获取 Git 时间，跳过
  }

  const currentLastMod = frontMatter.lastmod

  // 如果当前的 lastmod 与 Git 最后修改时间相同，则跳过
  if (currentLastMod === lastGitModifiedDate) {
    return
  }

  // 只有文章内容真的修改了才更新
  let updatedContent = content

  // 检查是否已有 lastmod 字段
  if (content.match(/^lastmod:\s*/m)) {
    updatedContent = updatedContent.replace(/^lastmod:\s*.*/m, `lastmod: ${lastGitModifiedDate}`)
  } else {
    // 如果没有 lastmod 字段，在 date 字段后添加
    if (content.match(/^date:\s*/m)) {
      updatedContent = updatedContent.replace(
        /^(date: .*)$/m,
        `$1\nlastmod: ${lastGitModifiedDate}`
      )
    } else {
      // 如果连 date 字段都没有，在 --- 后添加
      updatedContent = updatedContent.replace(/^---\n/m, `---\nlastmod: ${lastGitModifiedDate}`)
    }
  }

  // 只有内容变化时才写入
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent)
    console.log(`✓ 更新: ${path.basename(filePath)}`)
    console.log(`  lastmod: ${lastGitModifiedDate}`)
  }
}

// 主函数
function main() {
  const blogDir = path.join(__dirname, '..', 'data', 'blog')
  const markdownFiles = getAllMarkdownFiles(blogDir)

  console.log(`找到 ${markdownFiles.length} 个 markdown 文件\n`)

  let updatedCount = 0
  for (const file of markdownFiles) {
    const originalContent = fs.readFileSync(file, 'utf-8')
    updateMarkdownFile(file)
    const newContent = fs.readFileSync(file, 'utf-8')

    if (originalContent !== newContent) {
      updatedCount++
    }
  }

  console.log(`\n完成！更新了 ${updatedCount} 个文件`)
}

main()
