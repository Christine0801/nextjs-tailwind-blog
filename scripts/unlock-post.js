/**
 * 给博客文章解锁 —— 交互式 CLI
 * 用法: npm run unlock-post
 */
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const inquirer = require('inquirer')

const BLOG_DIR = path.join(__dirname, '..', 'data', 'blog')
const ENV_FILE = path.join(__dirname, '..', '.env')

async function main() {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => /\.(md|mdx)$/.test(f))

  // 过滤出已上锁的文章
  const locked = []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')
    const parsed = matter(raw)
    if (parsed.data.password_env) {
      locked.push({
        name: `${file} (${parsed.data.password_env})`,
        value: file,
        envVar: parsed.data.password_env,
      })
    }
  }

  if (locked.length === 0) {
    console.log('没有已上锁的文章。')
    process.exit(0)
  }

  const { file } = await inquirer.prompt([
    {
      type: 'list',
      name: 'file',
      message: '选择要解锁的文章:',
      choices: locked,
      pageSize: 15,
    },
  ])

  const selected = locked.find((l) => l.value === file)

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `确认解锁 "${selected.value}"？文章内容将变为公开可见。`,
      default: false,
    },
  ])

  if (!confirm) {
    console.log('已取消。')
    process.exit(0)
  }

  // 从 frontmatter 移除 password_env
  const filePath = path.join(BLOG_DIR, file)
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  delete parsed.data.password_env
  const newContent = matter.stringify(parsed.content, parsed.data)
  fs.writeFileSync(filePath, newContent, 'utf8')
  console.log(`✅ 已从 frontmatter 移除 password_env: ${file}`)

  // 问是否从 .env 删除
  const { removeEnv } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'removeEnv',
      message: `是否同时从 .env 中删除 ${selected.envVar}？`,
      default: true,
    },
  ])

  if (removeEnv && fs.existsSync(ENV_FILE)) {
    let envContent = fs.readFileSync(ENV_FILE, 'utf8')
    const regex = new RegExp(`^${selected.envVar}=.*\\n?`, 'm')
    envContent = envContent.replace(regex, '').trimEnd() + '\n'
    fs.writeFileSync(ENV_FILE, envContent, 'utf8')
    console.log(`✅ 已从 .env 删除: ${selected.envVar}`)
  }

  console.log('')
  console.log('提示：运行 npm run build 重新构建以生效。')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ 错误:', err.message)
  process.exit(1)
})
