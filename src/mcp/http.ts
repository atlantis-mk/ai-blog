import { getServerSideURL } from '@/utilities/getURL'

const commaSeparated = (value?: string) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const configuredURLs = () => {
  const urls = [getServerSideURL(), process.env.NEXT_PUBLIC_SERVER_URL]

  for (const hostname of [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ]) {
    if (hostname) urls.push(`https://${hostname}`)
  }

  return urls.filter((url): url is string => Boolean(url))
}

export const getMCPAllowedHosts = () => {
  const hosts = new Set(
    commaSeparated(process.env.MCP_ALLOWED_HOSTS).map((host) => host.toLowerCase()),
  )

  for (const url of configuredURLs()) {
    try {
      hosts.add(new URL(url).host.toLowerCase())
    } catch {
      // Invalid optional configuration is ignored; deployment validation still checks the request host.
    }
  }

  return hosts
}

export const getMCPAllowedOrigins = () => {
  const origins = new Set(
    commaSeparated(process.env.MCP_ALLOWED_ORIGINS).map((origin) =>
      origin.replace(/\/$/, '').toLowerCase(),
    ),
  )

  for (const url of configuredURLs()) {
    try {
      origins.add(new URL(url).origin.toLowerCase())
    } catch {
      // See getMCPAllowedHosts.
    }
  }

  return origins
}

export const validateMCPRequestSource = (request: Request): string | null => {
  const host = request.headers.get('host')?.toLowerCase()
  if (!host || !getMCPAllowedHosts().has(host)) return '请求 Host 不在 MCP 允许列表中。'

  const origin = request.headers.get('origin')?.replace(/\/$/, '').toLowerCase()
  if (origin && !getMCPAllowedOrigins().has(origin)) return '请求 Origin 不在 MCP 允许列表中。'

  return null
}

export const withMCPHeaders = (response: Response, request: Request): Response => {
  const headers = new Headers(response.headers)
  const origin = request.headers.get('origin')?.replace(/\/$/, '').toLowerCase()

  if (origin && getMCPAllowedOrigins().has(origin)) {
    headers.set('Access-Control-Allow-Origin', request.headers.get('origin')!)
    headers.set('Vary', 'Origin')
  }

  headers.set('Cache-Control', 'no-store')
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

export const mcpOptionsResponse = (request: Request) => {
  const sourceError = validateMCPRequestSource(request)
  if (sourceError) return Response.json({ error: sourceError }, { status: 403 })

  const response = new Response(null, {
    headers: {
      'Access-Control-Allow-Headers':
        'Authorization, Content-Type, MCP-Protocol-Version, Mcp-Session-Id',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
    status: 204,
  })

  return withMCPHeaders(response, request)
}
