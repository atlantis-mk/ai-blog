export const agentScopes = [
  'posts:read',
  'posts:write',
  'posts:publish',
  'products:read',
  'products:write',
  'products:publish',
  'releases:read',
  'releases:write',
  'releases:publish',
] as const

export type AgentScope = (typeof agentScopes)[number]

export type MCPRequestContext = {
  authorized: true
  requestId: string
  tool?: string
}

type AgentLike = {
  active?: boolean | null
  collection?: string
  expiresAt?: string | null
  id: number | string
  scopes?: AgentScope[] | null
}

export const isAgent = (user: unknown): user is AgentLike =>
  Boolean(user && typeof user === 'object' && (user as AgentLike).collection === 'agents')

export const isMCPRequest = (context: unknown): context is { mcp: MCPRequestContext } => {
  if (!context || typeof context !== 'object') return false

  const mcp = (context as { mcp?: Partial<MCPRequestContext> }).mcp
  return Boolean(mcp?.authorized && mcp.requestId)
}

export const hasAgentScope = (user: unknown, scope: AgentScope): boolean =>
  isAgent(user) && user.active !== false && Boolean(user.scopes?.includes(scope))

export const createMCPContext = (requestId: string, tool?: string) => ({
  ...(process.env.NODE_ENV === 'test' ? { disableRevalidate: true } : {}),
  mcp: {
    authorized: true as const,
    requestId,
    ...(tool ? { tool } : {}),
  },
})
