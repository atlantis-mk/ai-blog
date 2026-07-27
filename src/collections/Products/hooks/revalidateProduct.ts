import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

import type { Product } from '../../../payload-types'

const revalidateProductPath = (slug: string) => {
  revalidatePath('/products')
  revalidatePath(`/products/${slug}`)
  revalidatePath(`/products/${slug}/ai.md`)
  revalidateTag('products-sitemap', 'max')
}

export const revalidateProduct: CollectionAfterChangeHook<Product> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc

  if (doc._status === 'published') {
    payload.logger.info(`Revalidating product at path: /products/${doc.slug}`)
    revalidateProductPath(doc.slug)
  }

  if (previousDoc?._status === 'published' && previousDoc.slug !== doc.slug) {
    revalidateProductPath(previousDoc.slug)
  }

  if (previousDoc?._status === 'published' && doc._status !== 'published') {
    revalidateProductPath(previousDoc.slug)
  }

  return doc
}

export const revalidateProductDelete: CollectionAfterDeleteHook<Product> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate && doc?.slug) {
    revalidateProductPath(doc.slug)
  }

  return doc
}
