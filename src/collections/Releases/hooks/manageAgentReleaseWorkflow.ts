import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { hasAgentScope, isAgent, isMCPRequest } from '@/mcp/context'

const relationID = (value: unknown): number | null => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

export const manageAgentReleaseWorkflow: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const agent = isAgent(req.user) ? req.user : null
  if (!agent) return data

  if (!isMCPRequest(req.context)) {
    throw new APIError('Agent 只能通过 MCP 服务操作产品版本。', 403, null, true)
  }
  if (!hasAgentScope(req.user, 'releases:write')) {
    throw new APIError('Agent 缺少 releases:write 权限。', 403, null, true)
  }

  if (operation === 'create') data.createdByAgent = agent.id

  const productID = relationID(data.product) || relationID(originalDoc?.product)
  if (!productID) {
    throw new APIError('产品版本必须关联一个有效产品。', 400, null, true)
  }

  const product = await req.payload.findByID({
    collection: 'products',
    depth: 0,
    draft: true,
    id: productID,
    overrideAccess: false,
    req,
  })

  if (relationID(product.createdByAgent) !== agent.id) {
    throw new APIError('Agent 只能为自己创建的产品管理版本。', 403, null, true)
  }

  if (data._status === 'published') {
    if (!hasAgentScope(req.user, 'releases:publish')) {
      throw new APIError('Agent 缺少 releases:publish 权限。', 403, null, true)
    }

    const publishedProduct = await req.payload.findByID({
      collection: 'products',
      depth: 0,
      draft: false,
      id: productID,
      overrideAccess: false,
      req,
    })
    const installDocument = publishedProduct.installDocument
    if (
      publishedProduct._status !== 'published' ||
      (installDocument?.status !== 'reviewed' && installDocument?.status !== 'verified')
    ) {
      throw new APIError(
        '发布产品版本前，关联产品必须已发布且安装文档已人工审核。',
        400,
        null,
        true,
      )
    }
    if (installDocument?.riskLevel === 'high') {
      throw new APIError(
        '高风险软件产品的版本不能通过 MCP 发布，必须由后台人工发布。',
        403,
        null,
        true,
      )
    }
  }

  return data
}
