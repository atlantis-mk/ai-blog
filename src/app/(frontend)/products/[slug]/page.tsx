import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'
import { draftMode } from 'next/headers'
import { ArrowDownToLine, CheckCircle2, Package, ShieldCheck } from 'lucide-react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import {
  productInstallStatusLabels,
  productRiskLabels,
} from '@/collections/Products/installDocument'
import { AIDocumentActions } from '@/components/tech-blog/AIDocumentActions'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { Media } from '@/components/Media'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import { ProductDownloadActions } from '@/components/products/ProductDownloadActions'
import RichText from '@/components/RichText'
import type { Product } from '@/payload-types'
import { generateMeta } from '@/utilities/generateMeta'
import { getServerSideURL } from '@/utilities/getURL'
import { formatDateTime } from '@/utilities/formatDateTime'
import { getReleaseDownloadURL, isProductInstallReady } from '@/utilities/productInstallDocument'
import {
  getLatestProductReleaseManifest,
  resolveLatestProductLinks,
} from '@/utilities/productReleaseManifest'

export const revalidate = 300

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return products.docs.map(({ slug }) => ({ slug }))
}

export default async function ProductPage({ params }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await params
  const decodedSlug = decodeURIComponent(slug)
  const product = await queryProductBySlug(decodedSlug)
  const url = `/products/${decodedSlug}`

  if (!product) return <PayloadRedirects url={url} />

  const releases = await queryReleases(product.id, draft)
  const currentRelease = releases.find((release) => release.channel === 'stable') || releases[0]
  const releaseManifest = await getLatestProductReleaseManifest(product, currentRelease || null)
  const currentVersion = releaseManifest?.version || currentRelease?.version
  const productLinks = resolveLatestProductLinks(product.links || [], releaseManifest)
  const downloadURL = getReleaseDownloadURL(currentRelease)
  const hasInstallDocument = Boolean(
    currentRelease && downloadURL && isProductInstallReady(product),
  )
  const installDocumentURL = `/products/${encodeURIComponent(product.slug)}/ai.md`
  const installRisk = product.installDocument?.riskLevel || 'low'
  const installStatus = product.installDocument?.status || 'draft'

  return (
    <main className="pb-24 pt-16 md:pt-24">
      <PayloadRedirects disableNotFound url={url} />
      {draft && <LivePreviewListener />}

      <section className="container">
        <div className="grid items-center gap-12 border-b border-border pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)] lg:gap-20">
          <div>
            <div className="flex items-center gap-4">
              {typeof product.logo === 'object' ? (
                <Media
                  className="size-20 overflow-hidden border border-border bg-card p-2"
                  imgClassName="size-full object-contain"
                  priority
                  resource={product.logo}
                />
              ) : (
                <div className="flex size-20 items-center justify-center border border-border bg-card">
                  <Package aria-hidden="true" className="size-8" />
                </div>
              )}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Product
                </p>
                <h1 className="mt-2 text-4xl font-medium tracking-[-0.05em] md:text-6xl">
                  {product.title}
                </h1>
              </div>
            </div>

            <p className="mt-8 text-2xl font-medium leading-tight tracking-[-0.03em] md:text-3xl">
              {product.tagline}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              {product.summary}
            </p>

            {product.platforms?.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {product.platforms.map(({ id, name }) => (
                  <span
                    className="border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground"
                    key={id || name}
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null}

            {currentVersion && productLinks.length ? (
              <ProductDownloadActions links={productLinks} version={currentVersion} />
            ) : null}

            {currentRelease && (
              <dl className="mt-7 grid gap-2 font-mono text-[11px] text-muted-foreground sm:grid-cols-2">
                {currentRelease.fileSize && (
                  <div className="flex gap-2">
                    <dt>文件大小</dt>
                    <dd>{currentRelease.fileSize}</dd>
                  </div>
                )}
                {currentRelease.architecture && (
                  <div className="flex gap-2">
                    <dt>架构</dt>
                    <dd>{currentRelease.architecture}</dd>
                  </div>
                )}
                {currentRelease.systemRequirements && (
                  <div className="flex gap-2 sm:col-span-2">
                    <dt>系统要求</dt>
                    <dd>{currentRelease.systemRequirements}</dd>
                  </div>
                )}
                {currentRelease.checksum && (
                  <div className="flex min-w-0 gap-2 sm:col-span-2">
                    <dt className="uppercase">{currentRelease.checksumAlgorithm || 'checksum'}</dt>
                    <dd className="break-all">{currentRelease.checksum}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {product.heroImage && typeof product.heroImage === 'object' ? (
            <Media
              className="overflow-hidden border border-border bg-card"
              imgClassName="h-auto w-full object-cover"
              priority
              resource={product.heroImage}
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center border border-border bg-card">
              <Package aria-hidden="true" className="size-16 text-muted-foreground" />
            </div>
          )}
        </div>
      </section>

      {product.features?.length ? (
        <section className="container py-16 md:py-24">
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] md:text-4xl">
              简单、清晰，也足够强大
            </h2>
          </div>
          <div className="grid gap-px border border-border bg-border md:grid-cols-3">
            {product.features.map((feature) => (
              <article className="bg-background p-6" key={feature.id || feature.title}>
                {feature.image && typeof feature.image === 'object' && (
                  <Media
                    className="mb-8 aspect-[4/3] overflow-hidden bg-card"
                    imgClassName="size-full object-cover"
                    resource={feature.image}
                  />
                )}
                <h3 className="text-xl font-medium tracking-[-0.025em]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {product.capabilityGroups?.length ? (
        <section className="border-y border-border bg-muted/30 py-16 md:py-24">
          <div className="container grid gap-10 lg:grid-cols-2">
            {product.capabilityGroups.map((group) => (
              <article key={group.id || group.title}>
                <h2 className="text-2xl font-medium tracking-[-0.03em]">{group.title}</h2>
                {group.description && (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {group.description}
                  </p>
                )}
                <ul className="mt-6 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
                  {group.items?.map(({ id, label }) => (
                    <li
                      className="flex items-center gap-2 bg-background px-3 py-2.5 font-mono text-xs"
                      key={id || label}
                    >
                      <CheckCircle2 aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      {label}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {product.additionalContent && (
        <section className="container py-16 md:py-24">
          <div className="article-content mx-auto max-w-3xl">
            <RichText data={product.additionalContent} enableGutter={false} />
          </div>
        </section>
      )}

      {hasInstallDocument && currentRelease && (
        <section className="container pb-16 md:pb-24">
          <div className="border border-border bg-muted/30 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <ShieldCheck aria-hidden="true" className="size-4" />
                  AI-ready
                </div>
                <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em]">AI 安装运行文档</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  包含官方下载地址、系统要求、安装步骤、首次运行、验证方法和卸载方式。
                </p>
                <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
                  <div className="flex gap-2">
                    <dt>适用版本</dt>
                    <dd>{currentVersion}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>风险</dt>
                    <dd>{productRiskLabels[installRisk]}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>状态</dt>
                    <dd>{productInstallStatusLabels[installStatus]}</dd>
                  </div>
                </dl>
              </div>
              <AIDocumentActions markdownURL={installDocumentURL} />
            </div>
          </div>
        </section>
      )}

      {releases.length ? (
        <section className="container border-t border-border pt-16">
          <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Releases
              </p>
              <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em]">版本历史</h2>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {releases.map((release) => {
                const releaseURL = getReleaseDownloadURL(release)
                return (
                  <article
                    className="grid gap-3 py-5 sm:grid-cols-[7rem_1fr_auto] sm:items-baseline"
                    key={release.id}
                  >
                    <span className="font-mono text-[11px] uppercase text-muted-foreground">
                      {release.channel}
                    </span>
                    <div>
                      <h3 className="font-medium">v{release.version}</h3>
                      {release.notes && (
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {release.notes}
                        </p>
                      )}
                      {release.releasedAt && (
                        <time
                          className="mt-2 block font-mono text-[11px] text-muted-foreground"
                          dateTime={release.releasedAt}
                        >
                          {formatDateTime(release.releasedAt)}
                        </time>
                      )}
                    </div>
                    {releaseURL && (
                      <a
                        className="inline-flex items-center gap-2 text-sm underline-offset-4 hover:underline"
                        href={releaseURL}
                      >
                        下载
                        <ArrowDownToLine aria-hidden="true" className="size-3.5" />
                      </a>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      <div className="container mt-16">
        <Link className="text-sm underline-offset-4 hover:underline" href="/products">
          ← 返回产品列表
        </Link>
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = '' } = await params
  const product = await queryProductBySlug(decodeURIComponent(slug))
  const metadata = await generateMeta({
    canonicalPath: `/products/${encodeURIComponent(slug)}`,
    doc: product,
  })

  if (!product || !isProductInstallReady(product)) return metadata

  const releases = await queryReleases(product.id, false)
  const currentRelease = releases.find((release) => release.channel === 'stable') || releases[0]
  if (!currentRelease || !getReleaseDownloadURL(currentRelease)) return metadata

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: {
        ...metadata.alternates?.types,
        'text/markdown': [
          {
            title: `${product.title} — AI 安装运行文档`,
            url: `${getServerSideURL()}/products/${encodeURIComponent(product.slug)}/ai.md`,
          },
        ],
      },
    },
  }
}

const queryProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'products',
    depth: 2,
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

  return result.docs[0] || null
})

const queryReleases = cache(async (productID: number, draft: boolean) => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'releases',
    depth: 1,
    draft,
    limit: 100,
    overrideAccess: draft,
    pagination: false,
    sort: '-releasedAt',
    where: {
      product: {
        equals: productID,
      },
    },
  })

  return result.docs
})
