import type { Metadata } from 'next/types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import { PostList } from '@/components/tech-blog/PostList'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'search',
    depth: 1,
    limit: 12,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    // pagination: false reduces overhead if you don't need totalDocs
    pagination: false,
    ...(query
      ? {
          where: {
            or: [
              {
                title: {
                  like: query,
                },
              },
              {
                'meta.description': {
                  like: query,
                },
              },
              {
                'meta.title': {
                  like: query,
                },
              },
              {
                slug: {
                  like: query,
                },
              },
            ],
          },
        }
      : {}),
  })

  return (
    <main className="container py-16 md:py-24">
      <div className="max-w-3xl border-b border-border pb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">全文搜索</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.045em] md:text-5xl">查找技术笔记</h1>
        <div className="mt-8">
          <Search initialValue={query || ''} />
        </div>
      </div>

      <section className="mt-12 max-w-4xl">
        {query && posts.totalDocs > 0 ? (
          <PostList posts={posts.docs as never[]} />
        ) : query ? (
          <p className="text-sm text-muted-foreground">没有找到与“{query}”相关的文章。</p>
        ) : (
          <p className="text-sm text-muted-foreground">输入关键词，搜索已发布的文章。</p>
        )}
      </section>
    </main>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: '搜索',
  }
}
