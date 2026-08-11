import configPromise from '@payload-config'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { getPayload } from 'payload'

import { authenticateMCPAgent, MCPAuthenticationError } from '@/mcp/auth'
import { mcpOptionsResponse, validateMCPRequestSource, withMCPHeaders } from '@/mcp/http'
import { createAIBlogMCPServer } from '@/mcp/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const jsonRPCError = (message: string, status: number, code = -32000) =>
  Response.json(
    {
      error: { code, message },
      id: null,
      jsonrpc: '2.0',
    },
    { status },
  )

export const OPTIONS = async (request: Request) => mcpOptionsResponse(request)

export const POST = async (request: Request) => {
  const sourceError = validateMCPRequestSource(request)
  if (sourceError) {
    return withMCPHeaders(jsonRPCError(sourceError, 403), request)
  }

  const url = new URL(request.url)
  if (['access_token', 'api_key', 'token'].some((name) => url.searchParams.has(name))) {
    return withMCPHeaders(
      jsonRPCError('认证令牌只能通过 Authorization Header 发送。', 400, -32600),
      request,
    )
  }

  const payload = await getPayload({ config: configPromise })

  let agent
  try {
    agent = await authenticateMCPAgent(payload, request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent 认证失败。'
    const status = error instanceof MCPAuthenticationError ? error.status : 401
    const response = jsonRPCError(message, status)
    response.headers.set('WWW-Authenticate', 'Bearer realm="AIBlog MCP"')
    return withMCPHeaders(response, request)
  }

  const requestId = request.headers.get('x-request-id') || crypto.randomUUID()
  const server = createAIBlogMCPServer({ agent, payload, requestId })
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  })

  try {
    await server.connect(transport)
    const response = await transport.handleRequest(request)
    response.headers.set('X-Request-Id', requestId)
    return withMCPHeaders(response, request)
  } catch (error) {
    payload.logger.error({ err: error, requestId }, 'MCP request failed')
    return withMCPHeaders(jsonRPCError('MCP 请求处理失败。', 500, -32603), request)
  } finally {
    await server.close().catch(() => undefined)
  }
}

export const GET = async (request: Request) => {
  const sourceError = validateMCPRequestSource(request)
  return withMCPHeaders(
    sourceError
      ? jsonRPCError(sourceError, 403)
      : jsonRPCError('无会话 MCP 入口仅支持 POST。', 405),
    request,
  )
}

export const DELETE = GET
