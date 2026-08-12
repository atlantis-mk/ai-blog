import type { Post } from '@/payload-types'
import {
  convertLexicalToMarkdown,
  convertMarkdownToLexical,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical'
import type { Payload } from 'payload'

import { normalizeMarkdownCodeFenceLanguages } from '@/blocks/Code/languages'

export type ABValidationMode = 'draft' | 'human-publish' | 'mcp-publish'

export type ABValidationReport = {
  errors: string[]
  warnings: string[]
  readyForPublish: boolean
  readyForReview: boolean
}

type AIDocument = NonNullable<Post['aiDocument']>

const editorConfigCache = new WeakMap<Payload, SanitizedServerEditorConfig>()

const findPostEditorConfig = (payload: Payload): SanitizedServerEditorConfig => {
  const cached = editorConfigCache.get(payload)
  if (cached) return cached

  const posts = payload.config.collections.find((collection) => collection.slug === 'posts')
  if (!posts) throw new Error('Posts collection is not configured.')

  const visit = (fields: unknown[]): SanitizedServerEditorConfig | null => {
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue

      const current = field as {
        editor?: { editorConfig?: SanitizedServerEditorConfig }
        fields?: unknown[]
        name?: string
        tabs?: { fields?: unknown[] }[]
      }

      if (current.name === 'content' && current.editor?.editorConfig) {
        return current.editor.editorConfig
      }

      if (current.fields) {
        const nested = visit(current.fields)
        if (nested) return nested
      }

      for (const tab of current.tabs || []) {
        const nested = visit(tab.fields || [])
        if (nested) return nested
      }
    }

    return null
  }

  const editorConfig = visit(posts.fields as unknown[])
  if (!editorConfig) throw new Error('Posts content editor configuration was not found.')

  editorConfigCache.set(payload, editorConfig)
  return editorConfig
}

export const markdownToPostContent = (payload: Payload, markdown: string): Post['content'] =>
  convertMarkdownToLexical({
    editorConfig: findPostEditorConfig(payload),
    markdown: normalizeMarkdownCodeFenceLanguages(markdown),
  }) as Post['content']

export const postContentToMarkdown = (payload: Payload, content: Post['content']): string =>
  convertLexicalToMarkdown({
    data: content,
    editorConfig: findPostEditorConfig(payload),
  })

export const validateABPost = ({
  aMarkdown,
  aiDocument,
  mode = 'draft',
}: {
  aMarkdown: string
  aiDocument?: AIDocument | null
  mode?: ABValidationMode
}): ABValidationReport => {
  const errors: string[] = []
  const warnings: string[] = []
  const normalizedA = aMarkdown.trim()
  const normalizedB = aiDocument?.markdown?.trim() || ''

  if (!normalizedA) errors.push('A 文不能为空。')
  if (!normalizedB) errors.push('B 文 Markdown 不能为空。')
  if (!aiDocument?.kind) errors.push('B 文必须指定文档类型。')
  if (!aiDocument?.version?.trim()) errors.push('B 文必须指定版本。')

  if (aiDocument?.riskLevel === 'high' && !aiDocument.requiresApproval) {
    errors.push('高风险 B 文必须启用“执行前需要人工确认”。')
  }

  if (!aiDocument?.compatibility?.trim()) {
    warnings.push('建议填写 B 文适用环境。')
  }

  const structuralErrorCount = errors.length
  const reviewed = aiDocument?.status === 'reviewed' || aiDocument?.status === 'verified'

  if (mode !== 'draft' && !reviewed) {
    errors.push('发布前 B 文必须由后台标记为“已审核”或“已验证”。')
  }

  if (mode === 'mcp-publish' && aiDocument?.riskLevel === 'high') {
    errors.push('高风险文章不能通过 MCP 发布。')
  }

  if (!reviewed) warnings.push('B 文尚未完成人工审核。')
  if (aiDocument?.riskLevel === 'high') warnings.push('高风险文章只能由后台人工发布。')

  return {
    errors,
    warnings,
    readyForPublish: structuralErrorCount === 0 && reviewed && aiDocument?.riskLevel !== 'high',
    readyForReview: structuralErrorCount === 0,
  }
}
