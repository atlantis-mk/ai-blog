import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { isHumanUser } from '@/access/humanOnly'
import { hasAgentScope, isAgent, isMCPRequest } from '@/mcp/context'

const workflowFields = [
  'kind',
  'markdown',
  'version',
  'compatibility',
  'riskLevel',
  'requiresApproval',
] as const

const differs = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) !== JSON.stringify(right)

const hasWorkflowChange = (
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown>,
) => {
  if (
    Object.prototype.hasOwnProperty.call(data, 'content') &&
    differs(data.content, originalDoc?.content)
  ) {
    return true
  }

  const incoming = data.aiDocument
  if (!incoming || typeof incoming !== 'object') return false

  const previous =
    originalDoc?.aiDocument && typeof originalDoc.aiDocument === 'object'
      ? (originalDoc.aiDocument as Record<string, unknown>)
      : {}

  return workflowFields.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(incoming, field) &&
      differs((incoming as Record<string, unknown>)[field], previous[field]),
  )
}

export const manageAgentWorkflow: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const agent = isAgent(req.user) ? req.user : null
  const agentRequest = Boolean(agent)
  const humanRequest = isHumanUser(req.user)

  if (agentRequest && !isMCPRequest(req.context)) {
    throw new APIError('Agent 只能通过 MCP 服务操作文章。', 403, null, true)
  }

  if (agentRequest && !hasAgentScope(req.user, 'posts:write')) {
    throw new APIError('Agent 缺少 posts:write 权限。', 403, null, true)
  }

  if (agentRequest && operation === 'create') {
    data.createdByAgent = agent!.id
  }

  const contentChanged = hasWorkflowChange(
    data as Record<string, unknown>,
    originalDoc as Record<string, unknown> | undefined,
  )
  const incomingAIDocument =
    data.aiDocument && typeof data.aiDocument === 'object'
      ? (data.aiDocument as Record<string, unknown>)
      : {}
  const requestedReviewStatus = incomingAIDocument.status

  if (
    contentChanged &&
    (agentRequest ||
      !humanRequest ||
      (requestedReviewStatus !== 'reviewed' && requestedReviewStatus !== 'verified'))
  ) {
    data.aiDocument = {
      ...incomingAIDocument,
      status: 'draft',
      verifiedAt: null,
    }
    data.reviewedBy = null
    data.reviewedAt = null
  }

  if (
    humanRequest &&
    (requestedReviewStatus === 'reviewed' || requestedReviewStatus === 'verified')
  ) {
    const reviewedAt = new Date().toISOString()
    data.reviewedBy = req.user!.id
    data.reviewedAt = reviewedAt

    if (requestedReviewStatus === 'verified' && !incomingAIDocument.verifiedAt) {
      data.aiDocument = {
        ...incomingAIDocument,
        verifiedAt: reviewedAt,
      }
    }
  } else if (humanRequest && requestedReviewStatus === 'draft') {
    data.reviewedBy = null
    data.reviewedAt = null
    data.aiDocument = {
      ...incomingAIDocument,
      verifiedAt: null,
    }
  }

  if (agentRequest && data._status === 'published') {
    if (!hasAgentScope(req.user, 'posts:publish')) {
      throw new APIError('Agent 缺少 posts:publish 权限。', 403, null, true)
    }

    const riskLevel =
      (data.aiDocument as { riskLevel?: string } | undefined)?.riskLevel ||
      (originalDoc?.aiDocument as { riskLevel?: string } | undefined)?.riskLevel

    if (riskLevel === 'high') {
      throw new APIError('高风险文章不能通过 MCP 发布，必须由后台人工发布。', 403, null, true)
    }
  }

  return data
}
