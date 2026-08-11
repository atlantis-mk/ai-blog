import type { Access, Where } from 'payload'

import { isHumanUser } from '@/access/humanOnly'
import { hasAgentScope, isAgent, isMCPRequest } from '@/mcp/context'

export const createPostAccess: Access = ({ req }) => {
  if (isHumanUser(req.user)) return true

  return isMCPRequest(req.context) && isAgent(req.user) && hasAgentScope(req.user, 'posts:write')
}

export const readPostAccess: Access = ({ req }) => {
  if (isHumanUser(req.user)) return true

  if (isMCPRequest(req.context) && isAgent(req.user) && hasAgentScope(req.user, 'posts:read')) {
    const where: Where = {
      or: [
        {
          _status: {
            equals: 'published',
          },
        },
        {
          createdByAgent: {
            equals: req.user.id,
          },
        },
      ],
    }
    return where
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}

export const updatePostAccess: Access = ({ req }) => {
  if (isHumanUser(req.user)) return true

  if (isMCPRequest(req.context) && isAgent(req.user) && hasAgentScope(req.user, 'posts:write')) {
    return {
      createdByAgent: {
        equals: req.user.id,
      },
    }
  }

  return false
}
