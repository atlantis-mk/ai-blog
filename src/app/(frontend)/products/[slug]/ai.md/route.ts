import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getServerSideURL } from '@/utilities/getURL'
import {
  getReleaseDownloadURL,
  renderProductInstallMarkdown,
} from '@/utilities/productInstallDocument'

type Args = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(_request: Request, { params }: Args) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const products = await payload.find({
    collection: 'products',
    depth: 1,
    draft: false,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: {
        equals: decodeURIComponent(slug),
      },
    },
  })
  const product = products.docs[0]

  if (!product) return new Response('Not found', { status: 404 })

  const releases = await payload.find({
    collection: 'releases',
    depth: 1,
    draft: false,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    sort: '-releasedAt',
    where: {
      and: [
        {
          product: {
            equals: product.id,
          },
        },
        {
          channel: {
            equals: 'stable',
          },
        },
      ],
    },
  })
  const release = releases.docs[0]

  if (!release || !getReleaseDownloadURL(release)) {
    return new Response('Stable release not found', { status: 404 })
  }

  const markdown = renderProductInstallMarkdown({
    product,
    release,
    serverURL: getServerSideURL(),
  })

  if (!markdown) return new Response('AI install document not found', { status: 404 })

  const filename = product.slug.replace(/[^a-zA-Z0-9._-]/g, '-')

  return new Response(markdown, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      'Content-Disposition': `inline; filename="${filename}-install.md"`,
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  })
}
