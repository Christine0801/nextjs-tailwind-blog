import { createHash } from 'crypto'
import { slug as githubSlug } from 'github-slugger'
import { bundleMDX } from 'mdx-bundler'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import readingTime from 'reading-time'
import getAllFilesRecursively from './utils/files'
import { PostFrontMatter } from 'types/PostFrontMatter'
import { AuthorFrontMatter } from 'types/AuthorFrontMatter'
import { Toc } from 'types/Toc'
// Remark packages
import remarkGfm from 'remark-gfm'
import remarkFootnotes from 'remark-footnotes'
import remarkMath from 'remark-math'
import remarkExtractFrontmatter from './remark-extract-frontmatter'
import remarkCodeTitles from './remark-code-title'
import remarkTocHeadings from './remark-toc-headings'
import remarkImgToJsx from './remark-img-to-jsx'
// Rehype packages
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeCitation from 'rehype-citation'
import rehypePrismPlus from 'rehype-prism-plus'
import rehypePresetMinify from 'rehype-preset-minify'

const root = process.cwd()

// 构建时缓存，避免 getStaticProps 中重复计算
const frontMatterCache = new Map<string, PostFrontMatter[]>()
const fileBySlugCache = new Map<string, { mdxSource: string; toc: Toc; frontMatter: any }>()

export function getFiles(type: 'blog' | 'authors') {
  const prefixPaths = path.join(root, 'data', type)
  const files = getAllFilesRecursively(prefixPaths)
  // Only want to return blog/path and ignore root, replace is needed to work on Windows
  return files.map((file) => file.slice(prefixPaths.length + 1).replace(/\\/g, '/'))
}

export function formatSlug(slug: string) {
  return slug.replace(/\.(mdx|md)/, '')
}

/**
 * 基于 tags 和文件名生成唯一的路由 slug
 * 格式：tag1-tag2-tag3-6位哈希
 */
export function generateRouteSlug(tags: string[] | undefined, fileName: string): string {
  const safeFileName = Array.isArray(fileName) ? fileName.join('-') : String(fileName || '')
  const hash = createHash('md5').update(safeFileName).digest('hex').slice(0, 6)

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return hash
  }

  const tagSlugs = tags
    .slice(0, 3)
    .map((tag) => githubSlug(tag))
    .filter(Boolean)

  return tagSlugs.length > 0 ? [...tagSlugs, hash].join('-') : hash
}

export function dateSortDesc(a: string, b: string) {
  if (a > b) return -1
  if (a < b) return 1
  return 0
}

export async function getFileBySlug<T>(type: 'authors' | 'blog', slug: string | string[]) {
  const cacheKey = `${type}:${Array.isArray(slug) ? slug.join('/') : slug}`
  if (fileBySlugCache.has(cacheKey)) {
    return fileBySlugCache.get(cacheKey) as { mdxSource: string; toc: Toc; frontMatter: T }
  }

  const mdxPath = path.join(root, 'data', type, `${slug}.mdx`)
  const mdPath = path.join(root, 'data', type, `${slug}.md`)
  const source = fs.existsSync(mdxPath)
    ? fs.readFileSync(mdxPath, 'utf8')
    : fs.readFileSync(mdPath, 'utf8')

  // https://github.com/kentcdodds/mdx-bundler#nextjs-esbuild-enoent
  if (process.platform === 'win32') {
    process.env.ESBUILD_BINARY_PATH = path.join(root, 'node_modules', 'esbuild', 'esbuild.exe')
  } else {
    process.env.ESBUILD_BINARY_PATH = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild')
  }

  const toc: Toc = []

  const { code, frontmatter } = await bundleMDX({
    source,
    // mdx imports can be automatically source from the components directory
    cwd: path.join(root, 'components'),
    xdmOptions(options, frontmatter) {
      // this is the recommended way to add custom remark/rehype plugins:
      // The syntax might look weird, but it protects you in case we add/remove
      // plugins in the future.
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        remarkExtractFrontmatter,
        [remarkTocHeadings, { exportRef: toc }],
        remarkGfm,
        remarkCodeTitles,
        [remarkFootnotes, { inlineNotes: true }],
        remarkMath,
        remarkImgToJsx,
      ]
      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        rehypeSlug,
        rehypeAutolinkHeadings,
        rehypeKatex,
        [rehypeCitation, { path: path.join(root, 'data') }],
        [rehypePrismPlus, { ignoreMissing: true }],
        rehypePresetMinify,
      ]
      return options
    },
    esbuildOptions: (options) => {
      options.loader = {
        ...options.loader,
        '.js': 'jsx',
      }
      return options
    },
  })

  const result = {
    mdxSource: code,
    toc,
    frontMatter: {
      readingTime: readingTime(code),
      fileName: fs.existsSync(mdxPath) ? `${slug}.mdx` : `${slug}.md`,
      ...frontmatter,
      slug: generateRouteSlug(frontmatter.tags, Array.isArray(slug) ? slug.join('-') : slug),
      date: frontmatter.date ? new Date(frontmatter.date).toISOString() : null,
      lastmod: frontmatter.lastmod ? new Date(frontmatter.lastmod).toISOString() : null,
    },
  }

  fileBySlugCache.set(cacheKey, result)
  return result
}

export async function getAllFilesFrontMatter(folder: 'blog') {
  if (frontMatterCache.has(folder)) {
    return frontMatterCache.get(folder)!
  }

  const prefixPaths = path.join(root, 'data', folder)

  const files = getAllFilesRecursively(prefixPaths)

  const allFrontMatter: PostFrontMatter[] = []

  files.forEach((file: string) => {
    // Replace is needed to work on Windows
    const fileName = file.slice(prefixPaths.length + 1).replace(/\\/g, '/')
    // Remove Unexpected File
    if (path.extname(fileName) !== '.md' && path.extname(fileName) !== '.mdx') {
      return
    }
    const source = fs.readFileSync(file, 'utf8')
    const matterFile = matter(source)
    const frontmatter = matterFile.data as AuthorFrontMatter | PostFrontMatter
    if ('draft' in frontmatter && frontmatter.draft !== true) {
      allFrontMatter.push({
        ...frontmatter,
        slug: generateRouteSlug(frontmatter.tags, fileName),
        fileName,
        date: frontmatter.date ? new Date(frontmatter.date).toISOString() : null,
        lastmod: frontmatter.lastmod ? new Date(frontmatter.lastmod).toISOString() : null,
      })
    }
  })

  const result = allFrontMatter.sort((a, b) => dateSortDesc(a.date, b.date))
  frontMatterCache.set(folder, result)
  return result
}
