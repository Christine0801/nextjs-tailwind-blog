/**
 * 给博客文章上锁 —— 交互式 CLI
 * 用法: npm run lock-post
 */
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const inquirer = require('inquirer')

const BLOG_DIR = path.join(__dirname, '..', 'data', 'blog')
const ENV_FILE = path.join(__dirname, '..', '.env')

function getEnvVarName(fileName) {
  const base = path.basename(fileName, path.extname(fileName))
  const safe = base
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
  return `BLOG_PW_${safe}`
}

function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return {}
  const content = fs.readFileSync(ENV_FILE, 'utf8')
  const vars = {}
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) return
    vars[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim()
  })
  return vars
}

function getExistingPwVars(envVars) {
  return Object.keys(envVars)
    .filter((k) => k.startsWith('BLOG_PW_'))
    .map((k) => ({ name: `${k} (已配置)`, value: k }))
}

async function main() {
  const files = fs.readdirSync(BLOG_DIR).filter((f) => /\.(md|mdx)$/.test(f))

  if (files.length === 0) {
    console.log('没有找到任何文章。')
    process.exit(0)
  }

  // 过滤出未上锁的文章
  const unlocked = []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8')
    const parsed = matter(raw)
    if (!parsed.data.password_env) {
      unlocked.push({ name: file, value: file })
    }
  }

  if (unlocked.length === 0) {
    console.log('所有文章已经上锁。')
    process.exit(0)
  }

  const envVars = loadEnvFile()
  const existingPwVars = getExistingPwVars(envVars)

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'file',
      message: '选择要上锁的文章:',
      choices: unlocked,
      pageSize: 15,
    },
  ])

  let chosenEnvVar, chosenPassword

  if (existingPwVars.length > 0) {
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: '选择密码方式:',
        choices: [
          { name: '创建新密码', value: 'new' },
          { name: '复用已有密码', value: 'reuse' },
        ],
      },
    ])

    if (mode === 'reuse') {
      const { envVar } = await inquirer.prompt([
        {
          type: 'list',
          name: 'envVar',
          message: '选择已有密码:',
          choices: existingPwVars,
          pageSize: 15,
        },
      ])
      chosenEnvVar = envVar
      chosenPassword = envVars[envVar]
      console.log(`✅ 复用已有密码: ${chosenEnvVar}`)
    }
  }

  if (!chosenEnvVar) {
    const pwAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'envVar',
        message: '环境变量名 (.env 中的 key):',
        default: getEnvVarName(answers.file),
        validate: (input) => {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(input)) {
            return '变量名只能包含字母、数字和下划线，且不能以数字开头'
          }
          return true
        },
      },
      {
        type: 'password',
        name: 'password',
        message: '输入密码:',
        validate: (input) => {
          if (input.length < 4) return '密码至少 4 个字符'
          return true
        },
      },
      {
        type: 'password',
        name: 'passwordConfirm',
        message: '再次输入密码确认:',
        validate: (input, ans) => {
          if (input !== ans.password) return '两次输入的密码不一致'
          return true
        },
      },
    ])

    chosenEnvVar = pwAnswers.envVar
    chosenPassword = pwAnswers.password

    // 写入 .env
    const envVars = loadEnvFile()
    if (envVars[chosenEnvVar] && envVars[chosenEnvVar] !== chosenPassword) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `.env 中已存在 ${chosenEnvVar}，是否覆盖？`,
          default: false,
        },
      ])
      if (!overwrite) {
        console.log('⚠️  跳过 .env 写入，请手动更新密码。')
        console.log(`   ${chosenEnvVar}=${chosenPassword}`)
      }
    }

    if (!envVars[chosenEnvVar] || envVars[chosenEnvVar] === chosenPassword) {
      let envContent = ''
      if (fs.existsSync(ENV_FILE)) {
        envContent = fs.readFileSync(ENV_FILE, 'utf8')
        const regex = new RegExp(`^${chosenEnvVar}=.*$`, 'm')
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${chosenEnvVar}=${chosenPassword}`)
        } else {
          envContent = envContent.trimEnd() + `\n${chosenEnvVar}=${chosenPassword}\n`
        }
      } else {
        envContent = `${chosenEnvVar}=${chosenPassword}\n`
      }
      fs.writeFileSync(ENV_FILE, envContent, 'utf8')
      console.log(`✅ 已写入 .env: ${chosenEnvVar}`)
    }
  }

  // 写入 frontmatter
  const filePath = path.join(BLOG_DIR, answers.file)
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  parsed.data.password_env = chosenEnvVar
  const newContent = matter.stringify(parsed.content, parsed.data)
  fs.writeFileSync(filePath, newContent, 'utf8')
  console.log(`✅ 已更新 frontmatter: ${answers.file}`)

  console.log('')
  console.log('提示：运行 npm run build 重新构建以生效。')
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ 错误:', err.message)
  process.exit(1)
})
