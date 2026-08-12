import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Post } from '@/payload-types'
import {
  generateArticleStructuredData,
  serializeStructuredData,
} from '@/utilities/generateArticleStructuredData'
import { generateMeta } from '@/utilities/generateMeta'
import { formatSiteTitle, SITE_TITLE } from '@/utilities/siteMetadata'

describe('SEO metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the production origin for canonical and Open Graph URLs', async () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://blog.example.com/')

    const metadata = await generateMeta({
      canonicalPath: '/posts/hello-world',
      doc: {
        meta: {
          description: '文章摘要',
          title: '文章标题',
        },
        slug: 'hello-world',
        title: '原始标题',
      },
    })

    expect(metadata.alternates?.canonical).toBe('https://blog.example.com/posts/hello-world')
    expect(metadata.openGraph).toMatchObject({
      description: '文章摘要',
      title: '文章标题 | AIBLOG',
      url: 'https://blog.example.com/posts/hello-world',
    })
    expect(metadata.title).toBe('文章标题')
  })

  it('builds safe BlogPosting structured data for an article', () => {
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://blog.example.com')

    const post = {
      createdAt: '2026-08-10T00:00:00.000Z',
      id: 1,
      meta: {
        description: '文章摘要',
      },
      populatedAuthors: [{ name: '作者 <一>' }],
      publishedAt: '2026-08-11T00:00:00.000Z',
      slug: 'hello-world',
      title: '文章标题',
      updatedAt: '2026-08-12T00:00:00.000Z',
    } as Post

    const structuredData = generateArticleStructuredData(post)
    const serialized = serializeStructuredData(structuredData)

    expect(structuredData).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      datePublished: post.publishedAt,
      headline: post.title,
      url: 'https://blog.example.com/posts/hello-world',
    })
    expect(serialized).not.toContain('<')
    expect(serialized).toContain('作者 \\u003c一>')
  })

  it('formats the site title without duplicating the brand', () => {
    expect(formatSiteTitle('文章标题')).toBe('文章标题 | AIBLOG')
    expect(formatSiteTitle('AIBLOG')).toBe(SITE_TITLE)
  })
})
