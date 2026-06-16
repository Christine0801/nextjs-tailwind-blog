/* eslint-disable react/display-name */
import React, { useMemo } from 'react'
import { ComponentMap, getMDXComponent } from 'mdx-bundler/client'
import Image from './Image'
import Video from './Video'
import CustomLink from './Link'
import TOCInline from './TOCInline'
import Pre from './Pre'
import { BlogNewsletterForm } from './NewsletterForm'
import PasswordGate from './PasswordGate'
import type { EncryptedData } from 'types/EncryptedData'
import type { PostFrontMatter } from 'types/PostFrontMatter'

const Wrapper: React.ComponentType<{ layout: string }> = ({ layout, ...rest }) => {
  const Layout = require(`../layouts/${layout}`).default
  return <Layout {...rest} />
}

export const MDXComponents: ComponentMap = {
  Image,
  Video,
  //@ts-ignore
  TOCInline,
  a: CustomLink,
  pre: Pre,
  wrapper: Wrapper,
  //@ts-ignore
  BlogNewsletterForm,
}

interface Props {
  layout: string
  mdxSource: string | EncryptedData
  [key: string]: unknown
}

export const MDXLayoutRenderer = ({ layout, mdxSource, ...rest }: Props) => {
  const frontMatter = rest.frontMatter as PostFrontMatter | undefined
  const isProtected = frontMatter?.password_protected === true

  const MDXLayout = useMemo(() => {
    if (isProtected) return null
    return getMDXComponent(mdxSource as string)
  }, [isProtected, mdxSource])

  if (isProtected) {
    const Layout = require(`../layouts/${layout}`).default
    return (
      <Layout {...rest}>
        <PasswordGate encryptedData={mdxSource as EncryptedData} slug={frontMatter!.slug} />
      </Layout>
    )
  }

  if (!MDXLayout) return null
  return <MDXLayout layout={layout} components={MDXComponents} {...rest} />
}
