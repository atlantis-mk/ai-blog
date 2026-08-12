import type { Post } from '@/payload-types'

import { getImageURL } from './generateMeta'
import { getServerSideURL } from './getURL'
import { SITE_NAME } from './siteMetadata'

export const generateArticleStructuredData = (post: Post) => {
  const canonicalURL = new URL(
    `/posts/${encodeURIComponent(post.slug)}`,
    `${getServerSideURL()}/`,
  ).toString()
  const authors =
    post.populatedAuthors
      ?.map((author) => author.name)
      .filter((name): name is string => Boolean(name)) || []
  const image = getImageURL(post.meta?.image || post.heroImage)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    author: authors.length
      ? authors.map((name) => ({
          '@type': 'Person',
          name,
        }))
      : {
          '@type': 'Organization',
          name: SITE_NAME,
        },
    dateModified: post.updatedAt,
    datePublished: post.publishedAt || post.createdAt,
    description: post.meta?.description || undefined,
    headline: post.meta?.title || post.title,
    image: [image],
    inLanguage: 'zh-CN',
    mainEntityOfPage: {
      '@id': canonicalURL,
      '@type': 'WebPage',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getServerSideURL(),
    },
    url: canonicalURL,
  }
}

export const serializeStructuredData = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c')
