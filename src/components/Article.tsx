/* eslint-disable @next/next/no-img-element */
import React from 'react'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import formatDate from '@/lib/utils/formatDate'
import { PostFrontMatter } from 'types/PostFrontMatter'

export default function Article({
  slug,
  date,
  title,
  summary,
  tags,
  images,
  password_protected,
}: PostFrontMatter) {
  const src = Array.isArray(images) ? images[0] : images
  return (
    <li className="py-12">
      <article>
        <div className="space-y-2 xl:grid xl:grid-cols-4 xl:items-start xl:gap-5 xl:space-y-0">
          <dl className="xl:col-span-1">
            {src ? (
              <dt className="mb-4">
                <Link
                  href={`/blog/${slug}`}
                  className="block overflow-hidden rounded shadow-lg"
                  title={title}
                >
                  <img
                    alt={title}
                    className="transform  object-cover duration-200 hover:scale-110"
                    src={src}
                  />
                </Link>
              </dt>
            ) : null}
            <dd className="sr-only">发布时间</dd>
            <dd className="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
              <time dateTime={date}>{formatDate(date)}</time>
            </dd>
          </dl>
          <div className="space-y-4 xl:col-span-3">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold leading-8 tracking-tight">
                  <Link href={`/blog/${slug}`} className="text-gray-900 dark:text-gray-100">
                    {password_protected && (
                      <svg
                        className="mr-1.5 inline-block h-4 w-4 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    )}
                    {title}
                  </Link>
                </h2>
                <div className="mt-3 flex flex-wrap">
                  {tags.map((tag) => (
                    <Tag key={tag} text={tag} />
                  ))}
                </div>
              </div>
              <div className="prose max-w-none text-gray-500 dark:text-gray-400">{summary}</div>
            </div>
            <div className="text-base font-medium leading-6">
              <Link
                href={`/blog/${slug}`}
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                aria-label={`Read "${title}"`}
              >
                查看更多 &rarr;
              </Link>
            </div>
          </div>
        </div>
      </article>
    </li>
  )
}
