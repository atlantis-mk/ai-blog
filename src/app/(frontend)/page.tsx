import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { PostList } from '@/components/tech-blog/PostList'
import type { Metadata } from 'next'
import { SITE_DESCRIPTION, SITE_TITLE } from '@/utilities/siteMetadata'

export default async function HomePage() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    draft: false,
    limit: 8,
    overrideAccess: false,
    pagination: false,
    sort: '-publishedAt',
  })

  const featured = posts.docs.slice(0, 2)
  const latest = posts.docs.slice(2)

  return (
    <main>
      <section className="container border-b border-border py-20 md:py-32">
        <p className="mb-7 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Tutorials for humans &amp; AI
        </p>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-medium leading-[1.08] tracking-[-0.055em] md:text-6xl">
              驱动 AI 完成任务，解放双手。
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
              把复杂任务整理成 AI 可执行的教程，驱动 AI 按步骤完成工作，减少重复操作，真正解放双手。
            </p>
          </div>
          <p className="border-l border-border pl-5 text-sm leading-6 text-muted-foreground">
            人类与 AI 共读
            <br />
            步骤公开，结果可验。
          </p>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <div className="mb-8 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            精选文章
          </p>
          <Link className="inline-flex items-center gap-1 text-sm hover:underline" href="/posts">
            全部文章 <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <PostList posts={featured} />
      </section>

      <section className="container border-t border-border py-14 md:py-20">
        <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          最近更新
        </p>
        <PostList posts={latest} />
      </section>
    </main>
  )
}

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  description: SITE_DESCRIPTION,
  title: {
    absolute: SITE_TITLE,
  },
}
