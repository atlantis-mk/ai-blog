import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getServerSideURL } from '@/utilities/getURL'
import { renderAIDocumentMarkdown } from '@/utilities/renderAIDocumentMarkdown'

type Args = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(_request: Request, { params }: Args) {
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: {
        equals: decodedSlug,
      },
    },
  })

  const post = result.docs[0]
  if (!post) {
    return new Response('Not found', { status: 404 })
  }

  const serverURL = getServerSideURL().replace(/\/$/, '')
  const sourceURL = `${serverURL}/posts/${encodeURIComponent(post.slug)}`
  const markdown = renderAIDocumentMarkdown(post, sourceURL)

  if (!markdown) {
    return new Response('AI document not found', { status: 404 })
  }

  const filename = post.slug.replace(/[^a-zA-Z0-9._-]/g, '-')

  return new Response(markdown, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      'Content-Disposition': `inline; filename="${filename}.md"`,
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  })
}
