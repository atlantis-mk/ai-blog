import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Package } from 'lucide-react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { Media } from '@/components/Media'

export const revalidate = 600

export default async function ProductsPage() {
  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    pagination: false,
    sort: '-publishedAt',
  })

  return (
    <main className="pb-24 pt-24">
      <div className="container">
        <header className="max-w-3xl border-b border-border pb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Products
          </p>
          <h1 className="mt-5 text-4xl font-medium tracking-[-0.045em] md:text-6xl">产品</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground md:text-lg">
            软件产品介绍、官方下载、版本信息，以及供 AI 使用的安装运行文档。
          </p>
        </header>

        {products.docs.length ? (
          <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
            {products.docs.map((product) => (
              <Link
                className="group bg-background p-6 transition-colors hover:bg-muted/60"
                href={`/products/${product.slug}`}
                key={product.id}
              >
                <div className="flex items-start justify-between gap-6">
                  {typeof product.logo === 'object' ? (
                    <Media
                      className="size-16 overflow-hidden border border-border bg-card p-2"
                      imgClassName="size-full object-contain"
                      resource={product.logo}
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center border border-border bg-card">
                      <Package className="size-6" aria-hidden="true" />
                    </div>
                  )}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </div>
                <h2 className="mt-8 text-2xl font-medium tracking-[-0.03em]">{product.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.tagline}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-12 border-y border-border py-8 text-sm text-muted-foreground">
            产品发布后会显示在这里。
          </p>
        )}
      </div>
    </main>
  )
}

export function generateMetadata(): Metadata {
  return {
    description: '软件产品介绍、官方下载、版本信息和 AI 安装运行文档。',
    title: '产品',
  }
}
