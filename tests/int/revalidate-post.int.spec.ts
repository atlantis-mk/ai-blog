import type { PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Post } from '@/payload-types'

const { revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}))

import {
  revalidateDelete,
  revalidatePost,
} from '@/collections/Posts/hooks/revalidatePost'

const post = (slug: string, status: 'draft' | 'published') =>
  ({ _status: status, slug } as Post)

const request = (disableRevalidate = false) =>
  ({
    context: { disableRevalidate },
    payload: { logger: { info: vi.fn() } },
  }) as unknown as PayloadRequest

const runAfterChange = (
  doc: Post,
  previousDoc: Post,
  disableRevalidate = false,
) =>
  revalidatePost({
    doc,
    previousDoc,
    req: request(disableRevalidate),
  } as Parameters<typeof revalidatePost>[0])

const runAfterDelete = (doc: Post, disableRevalidate = false) =>
  revalidateDelete({
    doc,
    req: request(disableRevalidate),
  } as Parameters<typeof revalidateDelete>[0])

describe('post cache revalidation', () => {
  beforeEach(() => {
    revalidatePathMock.mockClear()
    revalidateTagMock.mockClear()
  })

  it('revalidates public indexes when a post is published', () => {
    runAfterChange(post('published-post', 'published'), post('published-post', 'draft'))

    expect(revalidatePathMock.mock.calls).toEqual([
      ['/posts/published-post'],
      ['/posts/published-post/ai.md'],
      ['/'],
      ['/posts'],
      ['/posts/page/[pageNumber]', 'page'],
    ])
    expect(revalidateTagMock).toHaveBeenCalledWith('posts-sitemap', 'max')
  })

  it('revalidates public indexes when a post is unpublished', () => {
    runAfterChange(post('published-post', 'draft'), post('published-post', 'published'))

    expect(revalidatePathMock.mock.calls).toEqual([
      ['/posts/published-post'],
      ['/posts/published-post/ai.md'],
      ['/'],
      ['/posts'],
      ['/posts/page/[pageNumber]', 'page'],
    ])
  })

  it('revalidates both detail paths when a published slug changes', () => {
    runAfterChange(post('new-slug', 'published'), post('old-slug', 'published'))

    expect(revalidatePathMock.mock.calls).toEqual([
      ['/posts/new-slug'],
      ['/posts/new-slug/ai.md'],
      ['/posts/old-slug'],
      ['/posts/old-slug/ai.md'],
      ['/'],
      ['/posts'],
      ['/posts/page/[pageNumber]', 'page'],
    ])
  })

  it('does not invalidate public pages for a draft-only change', () => {
    runAfterChange(post('draft-post', 'draft'), post('draft-post', 'draft'))

    expect(revalidatePathMock).not.toHaveBeenCalled()
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('revalidates public indexes when a post is deleted', () => {
    runAfterDelete(post('deleted-post', 'published'))

    expect(revalidatePathMock.mock.calls).toEqual([
      ['/posts/deleted-post'],
      ['/posts/deleted-post/ai.md'],
      ['/'],
      ['/posts'],
      ['/posts/page/[pageNumber]', 'page'],
    ])
    expect(revalidateTagMock).toHaveBeenCalledWith('posts-sitemap', 'max')
  })

  it('honors the disableRevalidate request context', () => {
    runAfterChange(post('published-post', 'published'), post('published-post', 'draft'), true)
    runAfterDelete(post('published-post', 'published'), true)

    expect(revalidatePathMock).not.toHaveBeenCalled()
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })
})
