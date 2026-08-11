import { APIError, type CollectionBeforeChangeHook } from 'payload'

import type { Post } from '@/payload-types'
import { postContentToMarkdown, validateABPost } from '@/utilities/abPost'

export const validateAIDocument: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (data._status !== 'published') return data

  const content = (data.content || originalDoc?.content) as Post['content'] | undefined
  const aiDocument = {
    ...(originalDoc?.aiDocument || {}),
    ...(data.aiDocument || {}),
  } as NonNullable<Post['aiDocument']>
  const report = validateABPost({
    aMarkdown: content ? postContentToMarkdown(req.payload, content) : '',
    aiDocument,
    mode: req.user?.collection === 'agents' ? 'mcp-publish' : 'human-publish',
  })

  if (report.errors.length) {
    throw new APIError(report.errors.join(' '), 400, null, true)
  }

  return data
}
