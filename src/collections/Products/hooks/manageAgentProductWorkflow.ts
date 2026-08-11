import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { isHumanUser } from '@/access/humanOnly'
import { hasAgentScope, isAgent, isMCPRequest } from '@/mcp/context'

const installDocumentFields = ['markdown', 'version', 'riskLevel', 'requiresApproval'] as const

const differs = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) !== JSON.stringify(right)

const hasInstallDocumentChange = (
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown>,
) => {
  const incoming = data.installDocument
  if (!incoming || typeof incoming !== 'object') return false

  const previous =
    originalDoc?.installDocument && typeof originalDoc.installDocument === 'object'
      ? (originalDoc.installDocument as Record<string, unknown>)
      : {}

  return installDocumentFields.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(incoming, field) &&
      differs((incoming as Record<string, unknown>)[field], previous[field]),
  )
}

export const manageAgentProductWorkflow: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const agent = isAgent(req.user) ? req.user : null
  const agentRequest = Boolean(agent)
  const humanRequest = isHumanUser(req.user)

  if (agentRequest && !isMCPRequest(req.context)) {
    throw new APIError('Agent 只能通过 MCP 服务操作产品。', 403, null, true)
  }

  if (agentRequest && !hasAgentScope(req.user, 'products:write')) {
    throw new APIError('Agent 缺少 products:write 权限。', 403, null, true)
  }

  if (agentRequest && operation === 'create') data.createdByAgent = agent!.id

  const installDocumentChanged = hasInstallDocumentChange(
    data as Record<string, unknown>,
    originalDoc as Record<string, unknown> | undefined,
  )
  const incomingInstallDocument =
    data.installDocument && typeof data.installDocument === 'object'
      ? (data.installDocument as Record<string, unknown>)
      : {}
  const requestedReviewStatus = incomingInstallDocument.status

  if (
    installDocumentChanged &&
    (agentRequest ||
      !humanRequest ||
      (requestedReviewStatus !== 'reviewed' && requestedReviewStatus !== 'verified'))
  ) {
    data.installDocument = {
      ...incomingInstallDocument,
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

    if (requestedReviewStatus === 'verified' && !incomingInstallDocument.verifiedAt) {
      data.installDocument = { ...incomingInstallDocument, verifiedAt: reviewedAt }
    }
  } else if (humanRequest && requestedReviewStatus === 'draft') {
    data.reviewedBy = null
    data.reviewedAt = null
    data.installDocument = { ...incomingInstallDocument, verifiedAt: null }
  }

  if (agentRequest && data._status === 'published') {
    if (!hasAgentScope(req.user, 'products:publish')) {
      throw new APIError('Agent 缺少 products:publish 权限。', 403, null, true)
    }

    const riskLevel =
      (data.installDocument as { riskLevel?: string } | undefined)?.riskLevel ||
      (originalDoc?.installDocument as { riskLevel?: string } | undefined)?.riskLevel

    if (riskLevel === 'high') {
      throw new APIError('高风险软件产品不能通过 MCP 发布，必须由后台人工发布。', 403, null, true)
    }
  }

  return data
}
