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

// 移除 lastmod 字段的内容，用于比较实际内容是否变化
function removeLastModForComparison(content) {
  return content.replace(/^lastmod:\s*.*$/m, '').replace(/^\nlastmod:.*$/m, '')
}

// 比较两个时间字符串是否相同（忽略空格）
function isTimeEqual(time1, time2) {
  if (!time1 || !time2) return false
  return time1.trim() === time2.trim()
}

// 检查文件是否真的被修改过（排除 lastmod 字段本身）
function isFileActuallyModified(filePath, currentLastMod) {
  try {
    // 读取当前文件内容
    const currentContent = fs.readFileSync(filePath, 'utf-8')

    // 移除 lastmod 字段进行比较
    const contentWithoutLastMod = removeLastModForComparison(currentContent)

    // 获取文件的最后修改时间（排除 lastmod 字段本身的时间）
    const stats = fs.statSync(filePath)
    const fileModTime = stats.mtime

    // 如果 lastmod 字段存在且与文件修改时间接近（1分钟内），则认为没有真正修改
    if (currentLastMod) {
      const lastModDate = new Date(currentLastMod)
      const timeDiff = Math.abs(fileModTime - lastModDate)

      // 如果差异小于1分钟，认为是脚本自己更新的，不是真正的内容修改
      if (timeDiff < 60000) {
        return false
      }
    }

    // 如果文件内容（排除 lastmod）和文件修改时间都匹配，则认为没有真正修改
    return true
  } catch (error) {
    return false
  }
}

// 更新 markdown 文件的 lastmod
function updateMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const { frontMatter, frontMatterEndIndex } = parseFrontMatter(content)

  const currentLastMod = frontMatter.lastmod

  // 获取文件系统的修改时间
  const stats = fs.statSync(filePath)
  const mtime = stats.mtime

  // 格式化为与 date 字段相同的格式：YYYY-MM-DD HH:mm:ss
  const year = mtime.getFullYear()
  const month = String(mtime.getMonth() + 1).padStart(2, '0')
  const day = String(mtime.getDate()).padStart(2, '0')
  const hours = String(mtime.getHours()).padStart(2, '0')
  const minutes = String(mtime.getMinutes()).padStart(2, '0')
  const seconds = String(mtime.getSeconds()).padStart(2, '0')

  const newLastMod = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

  // 如果当前的 lastmod 与文件修改时间相同，则跳过
  if (currentLastMod && isTimeEqual(currentLastMod, newLastMod)) {
    return
  }

  // 检查文件是否真正被修改过（排除脚本自己的更新）
  if (currentLastMod && !isFileActuallyModified(filePath, currentLastMod)) {
    return
  }

  // 更新 lastmod
  let updatedContent = content

  // 检查是否已有 lastmod 字段
  if (content.match(/^lastmod:\s*/m)) {
    updatedContent = updatedContent.replace(/^lastmod:\s*.*/m, `lastmod: ${newLastMod}`)
  } else {
    // 如果没有 lastmod 字段，在 date 字段后添加
    if (content.match(/^date:\s*/m)) {
      updatedContent = updatedContent.replace(/^(date: .*)$/m, `$1\nlastmod: ${newLastMod}`)
    } else {
      // 如果连 date 字段都没有，在 --- 后添加
      updatedContent = updatedContent.replace(/^---\n/m, `---\nlastmod: ${newLastMod}`)
    }
  }

  // 只有内容变化时才写入
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent)
    console.log(`✓ 更新: ${path.basename(filePath)}`)
    console.log(`  lastmod: ${newLastMod}`)
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
