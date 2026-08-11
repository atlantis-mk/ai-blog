import type { Post } from '@/payload-types'

const yamlValue = (value: boolean | string | null | undefined) => {
  if (typeof value === 'boolean') return String(value)
  return JSON.stringify(value || '')
}

export const isAIDocumentReady = (post: Partial<Post> | null | undefined) => {
  const aiDocument = post?.aiDocument

  return Boolean(
    aiDocument?.markdown?.trim() &&
    (aiDocument.status === 'reviewed' || aiDocument.status === 'verified'),
  )
}

export const renderAIDocumentMarkdown = (
  post: Post,
  sourceURL: string,
  options: { includeDraft?: boolean } = {},
) => {
  if (!options.includeDraft && !isAIDocumentReady(post)) return null
  if (!post.aiDocument?.markdown?.trim()) return null

  const aiDocument = post.aiDocument!
  const frontmatter = [
    '---',
    `title: ${yamlValue(post.title)}`,
    `slug: ${yamlValue(post.slug)}`,
    `kind: ${yamlValue(aiDocument.kind || 'reference')}`,
    `version: ${yamlValue(aiDocument.version || '1.0')}`,
    `status: ${yamlValue(aiDocument.status)}`,
    `compatibility: ${yamlValue(aiDocument.compatibility)}`,
    `risk_level: ${yamlValue(aiDocument.riskLevel || 'low')}`,
    `requires_approval: ${yamlValue(Boolean(aiDocument.requiresApproval))}`,
    `updated_at: ${yamlValue(post.updatedAt)}`,
    `verified_at: ${yamlValue(aiDocument.verifiedAt)}`,
    `source: ${yamlValue(sourceURL)}`,
    '---',
  ].join('\n')

  return `${frontmatter}\n\n${aiDocument.markdown!.trim()}\n`
}
