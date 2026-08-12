import type { Metadata } from 'next'

import type { Media, Page, Post, Product, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { formatSiteTitle, SITE_DESCRIPTION, SITE_TITLE } from './siteMetadata'

export const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let path = '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    path = ogUrl || image.url || path
  }

  return new URL(path, `${serverUrl}/`).toString()
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | Partial<Product> | null
  canonicalPath?: string
}): Promise<Metadata> => {
  const { canonicalPath = '/', doc } = args

  const ogImage = getImageURL(doc?.meta?.image)
  const canonicalURL = new URL(canonicalPath, `${getServerSideURL()}/`).toString()
  const documentTitle = doc?.meta?.title || doc?.title
  const description = doc?.meta?.description || SITE_DESCRIPTION

  const title = documentTitle || SITE_TITLE

  return {
    alternates: {
      canonical: canonicalURL,
    },
    description,
    openGraph: mergeOpenGraph({
      description,
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title: formatSiteTitle(title),
      url: canonicalURL,
    }),
    title: documentTitle || { absolute: SITE_TITLE },
  }
}
