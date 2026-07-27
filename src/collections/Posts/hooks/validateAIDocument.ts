import { APIError, type CollectionBeforeChangeHook } from 'payload'

type AIDocument = {
  kind?: 'checklist' | 'reference' | 'runbook' | null
  markdown?: string | null
  requiresApproval?: boolean | null
  riskLevel?: 'high' | 'low' | 'medium' | null
  status?: 'draft' | 'reviewed' | 'verified' | null
  verifiedAt?: string | null
}

const hasHeading = (markdown: string, heading: string) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^#{1,6}\\s+${escapedHeading}\\s*$`, 'm').test(markdown)
}

export const validateAIDocument: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data._status !== 'published') return data

  const aiDocument = {
    ...((originalDoc?.aiDocument as AIDocument | null | undefined) || {}),
    ...((data.aiDocument as AIDocument | null | undefined) || {}),
  }
  const markdown = aiDocument.markdown?.trim() || ''

  if (!markdown) {
    throw new APIError('发布文章前必须填写 AI 文档的 Markdown 正文。', 400, null, true)
  }

  if (aiDocument.status !== 'reviewed' && aiDocument.status !== 'verified') {
    throw new APIError('发布文章前，AI 文档必须标记为“已审核”或“已验证”。', 400, null, true)
  }

  const requiredHeadings = ['目标', '验证方法']
  if (aiDocument.kind === 'runbook') {
    requiredHeadings.push('前置条件', '操作步骤', '回滚方式')
  }

  const missingHeadings = requiredHeadings.filter((heading) => !hasHeading(markdown, heading))
  if (missingHeadings.length) {
    throw new APIError(`AI 文档缺少必要章节：${missingHeadings.join('、')}。`, 400, null, true)
  }

  if (aiDocument.riskLevel === 'high' && !aiDocument.requiresApproval) {
    throw new APIError('高风险 AI 文档必须启用“执行前需要人工确认”。', 400, null, true)
  }

  if (aiDocument.status === 'verified' && !aiDocument.verifiedAt) {
    data.aiDocument = {
      ...aiDocument,
      verifiedAt: new Date().toISOString(),
    }
  }

  return data
}
