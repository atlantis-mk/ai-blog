import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import { aiDocumentRiskLabels, aiDocumentStatusLabels } from '@/collections/Posts/aiDocument'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { generateMeta } from '@/utilities/generateMeta'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { ArticleTOC } from '@/components/tech-blog/ArticleTOC'
import { AIDocumentActions } from '@/components/tech-blog/AIDocumentActions'
import { formatDateTime } from '@/utilities/formatDateTime'
import { getServerSideURL } from '@/utilities/getURL'
import { isAIDocumentReady } from '@/utilities/renderAIDocumentMarkdown'
import Link from 'next/link'
import {
  generateArticleStructuredData,
  serializeStructuredData,
} from '@/utilities/generateArticleStructuredData'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = posts.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/posts/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  const hasAIDocument = isAIDocumentReady(post)
  const aiDocumentURL = `/posts/${encodeURIComponent(post.slug)}/ai.md`
  const aiDocumentRisk = post.aiDocument?.riskLevel || 'low'
  const aiDocumentStatus = post.aiDocument?.status || 'draft'
  const articleStructuredData = generateArticleStructuredData(post)

  return (
    <article className="pb-20 pt-14 md:pt-20">
      <script
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(articleStructuredData),
        }}
        type="application/ld+json"
      />
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <div className="container grid gap-12 xl:grid-cols-[11rem_minmax(0,46rem)_12rem] xl:gap-10">
        <aside className="order-2 border-t border-border pt-6 xl:order-none xl:border-t-0 xl:pt-1">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            分类
          </p>
          <div className="flex flex-wrap gap-2 xl:flex-col xl:items-start">
            {post.categories?.length ? (
              post.categories.map((category) => {
                if (typeof category !== 'object') return null
                return (
                  <Link
                    className="text-sm underline-offset-4 hover:underline"
                    href={`/categories/${category.slug}`}
                    key={category.id}
                  >
                    {category.title}
                  </Link>
                )
              })
            ) : (
              <span className="text-sm text-muted-foreground">未分类</span>
            )}
          </div>
        </aside>

        <div>
          <header className="border-b border-border pb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              技术笔记
            </p>
            <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.045em] md:text-5xl">
              {post.title}
            </h1>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] text-muted-foreground">
              {post.publishedAt && (
                <time dateTime={post.publishedAt}>发布 {formatDateTime(post.publishedAt)}</time>
              )}
              <time dateTime={post.updatedAt}>更新 {formatDateTime(post.updatedAt)}</time>
            </div>
          </header>

          <div data-article-content className="article-content pt-10">
            <RichText
              className="max-w-none"
              data={post.content}
              enableGutter={false}
              leadingH1ToRemove={post.title}
            />
          </div>
        </div>

        <aside className="order-1 xl:order-none">
          <div className="space-y-8 xl:sticky xl:top-24">
            {hasAIDocument && (
              <section
                className="border border-border bg-muted/30 p-4"
                aria-labelledby="ai-document-title"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  AI-ready
                </p>
                <h2
                  className="mt-2 text-base font-medium tracking-[-0.025em]"
                  id="ai-document-title"
                >
                  AI 操作文档
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  本文面向 AI/Agent 的精简执行版。
                </p>
                <dl className="my-4 space-y-2 font-mono text-[11px] text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>版本</dt>
                    <dd>{post.aiDocument?.version || '1.0'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>风险</dt>
                    <dd>{aiDocumentRiskLabels[aiDocumentRisk]}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>状态</dt>
                    <dd>{aiDocumentStatusLabels[aiDocumentStatus]}</dd>
                  </div>
                </dl>
                <div className="[&_button]:w-full [&_button]:justify-center">
                  <AIDocumentActions markdownURL={aiDocumentURL} />
                </div>
              </section>
            )}

            <div className="hidden xl:block">
              <ArticleTOC />
            </div>
          </div>
        </aside>
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  const metadata = await generateMeta({
    canonicalPath: `/posts/${encodeURIComponent(decodedSlug)}`,
    doc: post,
  })

  if (!post) return metadata

  const authorNames =
    post.populatedAuthors
      ?.map((author) => author.name)
      .filter((name): name is string => Boolean(name)) || []
  const articleMetadata: Metadata = {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      authors: authorNames,
      modifiedTime: post.updatedAt,
      publishedTime: post.publishedAt || post.createdAt,
      type: 'article',
    },
  }

  if (!isAIDocumentReady(post)) return articleMetadata

  return {
    ...articleMetadata,
    alternates: {
      ...articleMetadata.alternates,
      types: {
        ...articleMetadata.alternates?.types,
        'text/markdown': [
          {
            title: `${post.title} — AI 文档`,
            url: `${getServerSideURL()}/posts/${encodeURIComponent(post.slug)}/ai.md`,
          },
        ],
      },
    },
  }
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
