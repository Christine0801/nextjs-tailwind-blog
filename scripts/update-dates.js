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

// 获取文件首次提交时间
function getFileCreationDate(filePath) {
  try {
    // 获取文件的首次提交时间
    const date = execSync(
      `git log --diff-filter=A --follow --format=%ai -- "${filePath}" | head -n 1`,
      {
        encoding: 'utf-8',
      }
    ).trim()
    return date
  } catch (error) {
    return new Date().toISOString().replace('T', ' ').substring(0, 19)
  }
}

// 获取文件最后修改时间
function getLastModifiedDate(filePath) {
  try {
    const date = execSync(`git log -1 --format=%ai -- "${filePath}"`, {
      encoding: 'utf-8',
    }).trim()
    return date
  } catch (error) {
    return new Date().toISOString().replace('T', ' ').substring(0, 19)
  }
}

// 更新 markdown 文件的日期
function updateMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  const creationDate = getFileCreationDate(filePath)
  const lastModifiedDate = getLastModifiedDate(filePath)

  let updatedContent = content

  // 检查是否已有 date 字段
  if (content.match(/^date:\s*/m)) {
    updatedContent = updatedContent.replace(/^date:\s*.*/m, `date: ${creationDate}`)
  } else {
    // 在 --- 之后添加 date 字段
    updatedContent = updatedContent.replace(/^---\n/m, `---\ndate: ${creationDate}`)
  }

  // 检查是否已有 lastmod 字段
  if (content.match(/^lastmod:\s*/m)) {
    updatedContent = updatedContent.replace(/^lastmod:\s*.*/m, `lastmod: ${lastModifiedDate}`)
  } else {
    // 在 date 字段后添加 lastmod 字段
    updatedContent = updatedContent.replace(/^(date: .*)$/m, `$1\nlastmod: ${lastModifiedDate}`)
  }

  // 只有内容变化时才写入
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent)
    console.log(`✓ 更新: ${path.basename(filePath)}`)
    console.log(`  date: ${creationDate}`)
    console.log(`  lastmod: ${lastModifiedDate}`)
  }
}

// 主函数
function main() {
  const blogDir = path.join(__dirname, '..', 'data', 'blog')
  const markdownFiles = getAllMarkdownFiles(blogDir)

  console.log(`找到 ${markdownFiles.length} 个 markdown 文件\n`)

  for (const file of markdownFiles) {
    updateMarkdownFile(file)
  }

  console.log('\n完成！')
}

main()
