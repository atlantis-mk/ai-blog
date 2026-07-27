import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'

const getProductsSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    const siteURL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'
    const results = await payload.find({
      collection: 'products',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })
    const dateFallback = new Date().toISOString()

    return results.docs.map((product) => ({
      loc: `${siteURL}/products/${product.slug}`,
      lastmod: product.updatedAt || dateFallback,
    }))
  },
  ['products-sitemap'],
  {
    tags: ['products-sitemap'],
  },
)

export async function GET() {
  return getServerSideSitemap(await getProductsSitemap())
}
