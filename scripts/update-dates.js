/**
 * 为有实际内容改动的文章自动更新 lastmod 字段
 * 使用 git diff 检测文件变更（而非不可靠的 mtime）
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BLOG_DIR = path.join(__dirname, '..', 'data', 'blog')

function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * 检查文件自上次 commit 以来是否有内容改动（排除 lastmod 行）
 * 同时处理未跟踪的新文件
 */
function hasContentChanged(filePath) {
  try {
    const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/')

    // 未跟踪的新文件 → 视为有改动
    const tracked = execSync(`git ls-files --error-unmatch "${relativePath}"`, { stdio: 'pipe' })
    if (!tracked) {
      return true
    }

    // 已跟踪：用 git diff 比较工作区与 HEAD
    const diff = execSync(`git diff HEAD -- "${relativePath}"`, { encoding: 'utf8' })
    if (!diff) return false

    // 排除仅 lastmod 行变动的 diff
    const lines = diff.split('\n').filter((line) => line.startsWith('+') || line.startsWith('-'))
    const meaningful = lines.filter((line) => !line.match(/^[+-]lastmod:/))
    return meaningful.length > 0
  } catch {
    return false
  }
}

function parseFrontMatter(content) {
  const lines = content.split('\n')
  if (lines[0] !== '---') return { frontMatter: {}, endIndex: 0 }

  const frontMatter = {}
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') return { frontMatter, endIndex: i + 1 }
    const match = lines[i].match(/^(\w+):\s*(.*)$/)
    if (match) frontMatter[match[1]] = match[2]
  }

  return { frontMatter: {}, endIndex: 0 }
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function updateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const { frontMatter } = parseFrontMatter(content)
  const newLastMod = formatDate(new Date())

  // lastmod 已是最新时间（精确到秒），跳过
  if (frontMatter.lastmod && frontMatter.lastmod.trim() === newLastMod) return false

  let updated = content
  if (content.match(/^lastmod:\s*/m)) {
    updated = updated.replace(/^lastmod:\s*.*/m, `lastmod: ${newLastMod}`)
  } else if (content.match(/^date:\s*/m)) {
    updated = updated.replace(/^(date: .*)$/m, `$1\nlastmod: ${newLastMod}`)
  } else {
    updated = updated.replace(/^---\n/, `---\nlastmod: ${newLastMod}\n`)
  }

  if (updated !== content) {
    fs.writeFileSync(filePath, updated)
    return true
  }
  return false
}

function main() {
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(BLOG_DIR, f))

  console.log(`找到 ${files.length} 个 markdown 文件\n`)

  let updatedCount = 0

  if (isGitRepo()) {
    // 精确模式：只更新有实际内容改动的文件
    for (const file of files) {
      if (hasContentChanged(file)) {
        if (updateFile(file)) {
          console.log(`${path.basename(file)}`)
          updatedCount++
        }
      }
    }
  } else {
    // 非 git 环境（CI 已存在所有文件为干净状态）：不改任何文件
    console.log('非 git 环境，跳过 lastmod 更新')
  }

  if (updatedCount > 0) {
    console.log(`\n更新了 ${updatedCount} 个文件`)
  } else {
    console.log('没有文件需要更新')
  }
}

main()
