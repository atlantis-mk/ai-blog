import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post } from '../../../payload-types'

const revalidatePostListings = () => {
  revalidatePath('/')
  revalidatePath('/posts')
  revalidatePath('/posts/page/[pageNumber]', 'page')
}

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const isPublished = doc._status === 'published'
    const wasPublished = previousDoc?._status === 'published'

    if (isPublished) {
      const path = `/posts/${doc.slug}`

      payload.logger.info(`Revalidating post at path: ${path}`)

      revalidatePath(path)
      revalidatePath(`${path}/ai.md`)
    }

    // If the post was previously published, we need to revalidate the old path
    if (wasPublished && (!isPublished || previousDoc.slug !== doc.slug)) {
      const oldPath = `/posts/${previousDoc.slug}`

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      revalidatePath(oldPath)
      revalidatePath(`${oldPath}/ai.md`)
    }

    if (isPublished || wasPublished) {
      revalidatePostListings()
      revalidateTag('posts-sitemap', 'max')
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    const path = `/posts/${doc?.slug}`

    revalidatePath(path)
    revalidatePath(`${path}/ai.md`)
    revalidatePostListings()
    revalidateTag('posts-sitemap', 'max')
  }

  return doc
}
