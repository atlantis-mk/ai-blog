import type { Payload } from 'payload'

import { isAgent, type AgentScope } from './context'

export type AuthenticatedAgent = {
  active?: boolean | null
  collection: 'agents'
  expiresAt?: string | null
  id: number
  name: string
  scopes?: AgentScope[] | null
}

export class MCPAuthenticationError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = 'MCPAuthenticationError'
    this.status = status
  }
}

export const authenticateMCPAgent = async (
  payload: Payload,
  request: Request,
): Promise<AuthenticatedAgent> => {
  const authorization = request.headers.get('authorization')
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i)

  if (!match) {
    throw new MCPAuthenticationError('缺少有效的 Bearer Agent API Key。')
  }

  const headers = new Headers(request.headers)
  headers.set('authorization', `agents API-Key ${match[1]}`)

  const { user } = await payload.auth({ headers })
  if (!isAgent(user)) {
    throw new MCPAuthenticationError('Agent API Key 无效。')
  }

  if (user.active === false) {
    throw new MCPAuthenticationError('Agent 已停用。')
  }

  if (user.expiresAt) {
    const expiresAt = Date.parse(user.expiresAt)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new MCPAuthenticationError('Agent API Key 已过期。')
    }
  }

  return user as AuthenticatedAgent
}
