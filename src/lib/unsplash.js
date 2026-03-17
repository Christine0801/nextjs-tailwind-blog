/**
 * Unsplash API 工具函数
 * 用于根据标签搜索图片
 */

const DEFAULT_IMAGE = '/static/favicons/android-chrome-512x512.png'

/**
 * 检查字符串是否包含中文字符
 */
function containsChinese(text) {
  return /[\u4e00-\u9fa5]/.test(text)
}

/**
 * 过滤中文标签，只保留英文标签
 */
function filterEnglishTags(tags) {
  return tags.filter((tag) => !containsChinese(tag))
}

/**
 * 使用 Unsplash API 搜索图片
 * @param {string[]} tags 文章标签数组
 * @param {number} retries 重试次数
 * @returns {Promise<string>} 图片 URL 或默认图片 URL
 */
async function getUnsplashImage(tags, retries = 3) {
  // 检查环境变量
  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
  if (!UNSPLASH_ACCESS_KEY) {
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
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 秒超时

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
        throw new Error(`Unsplash API 错误: ${response.status}`)
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const imageUrl = data.results[0].urls.regular
        console.log(`✅ 成功获取图片: ${imageUrl}`)
        return imageUrl
      } else {
        console.warn('⚠️  Unsplash 未找到匹配图片')
        return DEFAULT_IMAGE
      }
    } catch (error) {
      if (attempt === retries) {
        console.error(`❌ Unsplash API 请求失败（重试 ${retries} 次后放弃）:`, error)
        return DEFAULT_IMAGE
      }
      console.warn(`⚠️  第 ${attempt} 次请求失败，正在重试...`)
      // 等待 1 秒后重试
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return DEFAULT_IMAGE
}

module.exports = { getUnsplashImage }
