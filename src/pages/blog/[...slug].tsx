import fs from 'fs'
import PageTitle from '@/components/PageTitle'
import generateRss from '@/lib/generate-rss'
import { MDXLayoutRenderer } from '@/components/MDXComponents'
import { formatSlug, getAllFilesFrontMatter, getFileBySlug } from '@/lib/mdx'
import { GetStaticProps, InferGetStaticPropsType } from 'next'
import { AuthorFrontMatter } from 'types/AuthorFrontMatter'
import { PostFrontMatter } from 'types/PostFrontMatter'
import { EncryptedData } from 'types/EncryptedData'
import { Toc } from 'types/Toc'

const DEFAULT_LAYOUT = 'PostLayout'

export async function getStaticPaths() {
  const posts = await getAllFilesFrontMatter('blog')
  // RSS 只在构建时生成一次，避免每个页面重复写入
  if (posts.length > 0) {
    const rss = generateRss(posts)
    fs.writeFileSync('./public/feed.xml', rss)
  }
  return {
    paths: posts.map((p) => ({
      params: {
        slug: p.slug.split('/'),
      },
    })),
    fallback: false,
  }
}

// @ts-ignore
export const getStaticProps: GetStaticProps<{
  post: { mdxSource: string | EncryptedData; toc: Toc; frontMatter: PostFrontMatter }
  authorDetails: AuthorFrontMatter[]
  prev?: { slug: string; title: string }
  next?: { slug: string; title: string }
}> = async ({ params }) => {
  const routeSlug = (params.slug as string[]).join('/')
  // getAllFilesFrontMatter 已缓存，这里直接复用 getStaticPaths 的结果，不会重复读文件
  const allPosts = await getAllFilesFrontMatter('blog')
  const postIndex = allPosts.findIndex((post) => post.slug === routeSlug)
  const prev: { slug: string; title: string } = allPosts[postIndex + 1] || null
  const next: { slug: string; title: string } = allPosts[postIndex - 1] || null
  const currentPost = allPosts[postIndex]
  const post = await getFileBySlug<PostFrontMatter>('blog', formatSlug(currentPost.fileName))
  // @ts-ignore
  const authorList = post.frontMatter.authors || ['default']
  const authorPromise = authorList.map(async (author) => {
    const authorResults = await getFileBySlug<AuthorFrontMatter>('authors', [author])
    return authorResults.frontMatter
  })
  const authorDetails = await Promise.all(authorPromise)

  return {
    props: {
      post,
      authorDetails,
      prev,
      next,
    },
  }
}

export default function Blog({
  post,
  authorDetails,
  prev,
  next,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { mdxSource, toc, frontMatter } = post

  const isDraft = 'draft' in frontMatter && frontMatter.draft === true
  const isProtected = frontMatter.password_protected === true

  if (isDraft && !isProtected) {
    return (
      <div className="mt-24 text-center">
        <PageTitle>
          Under Construction{' '}
          <span role="img" aria-label="roadwork sign">
            🚧
          </span>
        </PageTitle>
      </div>
    )
  }

  return (
    <MDXLayoutRenderer
      layout={frontMatter.layout || DEFAULT_LAYOUT}
      toc={toc}
      mdxSource={mdxSource}
      frontMatter={frontMatter}
      authorDetails={authorDetails}
      prev={prev}
      next={next}
    />
  )
}
