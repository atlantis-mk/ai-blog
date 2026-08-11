import type { Access, Where } from 'payload'

import { isHumanUser } from '@/access/humanOnly'
import { hasAgentScope, isAgent, isMCPRequest } from '@/mcp/context'

export const createProductAccess: Access = ({ req }) => {
  if (isHumanUser(req.user)) return true

  return isMCPRequest(req.context) && isAgent(req.user) && hasAgentScope(req.user, 'products:write')
}

export const readProductAccess: Access = ({ req }) => {
  if (isHumanUser(req.user)) return true

  if (isMCPRequest(req.context) && isAgent(req.user) && hasAgentScope(req.user, 'products:read')) {
    const where: Where = {
      or: [{ _status: { equals: 'published' } }, { createdByAgent: { equals: req.user.id } }],
    }
    return where
  }

  return { _status: { equals: 'published' } }
}

export const updateProductAccess: Access = ({ req }) => {
  if (isHumanUser(req.user)) return true

  if (isMCPRequest(req.context) && isAgent(req.user) && hasAgentScope(req.user, 'products:write')) {
    return { createdByAgent: { equals: req.user.id } }
  }

  return false
}
