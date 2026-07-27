import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

import type { Release } from '../../../payload-types'

const revalidateRelatedProduct = async (
  release: Release,
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
) => {
  const productID = typeof release.product === 'object' ? release.product.id : release.product
  if (!productID) return

  const product = await req.payload.findByID({
    collection: 'products',
    id: productID,
    depth: 0,
    req,
  })

  revalidatePath('/products')
  revalidatePath(`/products/${product.slug}`)
  revalidatePath(`/products/${product.slug}/ai.md`)
  revalidateTag('products-sitemap', 'max')
}

export const revalidateRelease: CollectionAfterChangeHook<Release> = async ({ doc, req }) => {
  if (!req.context.disableRevalidate) {
    await revalidateRelatedProduct(doc, req)
  }

  return doc
}

export const revalidateReleaseDelete: CollectionAfterDeleteHook<Release> = async ({ doc, req }) => {
  if (!req.context.disableRevalidate) {
    await revalidateRelatedProduct(doc, req)
  }

  return doc
}
