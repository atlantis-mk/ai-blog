export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(
    {
      endpoint: '/api/mcp',
      service: 'aiblog-ab-publishing',
      status: 'ok',
      transport: 'streamable-http-stateless',
      version: '1.0.0',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
