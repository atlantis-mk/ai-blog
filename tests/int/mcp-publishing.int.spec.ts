import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { POST as mcpPOST } from '@/app/(payload)/api/mcp/route'
import config from '@/payload.config'
import type { Agent, Post, User } from '@/payload-types'
import { authenticateMCPAgent } from '@/mcp/auth'
import { createMCPContext } from '@/mcp/context'
import { createAIBlogMCPServer } from '@/mcp/server'
import { getServerSideURL } from '@/utilities/getURL'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const bMarkdown = `# 目标

验证 MCP A/B 发文流程。

# 前置条件

- 已配置 Agent。

# 操作步骤

## 1. 创建草稿

调用 MCP 工具。

# 验证方法

确认文章状态为 published。

# 回滚方式

由后台恢复历史版本。
`

describe('MCP A/B publishing', () => {
  let payload: Payload
  let agent: Agent
  let agentAPIKey: string
  let disabledAgent: Agent
  let disabledAgentAPIKey: string
  let expiredAgent: Agent
  let expiredAgentAPIKey: string
  let otherAgent: Agent
  let human: User
  let client: Client
  let server: ReturnType<typeof createAIBlogMCPServer>
  const postIDs: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const suffix = crypto.randomUUID()
    agentAPIKey = crypto.randomUUID().replaceAll('-', '')
    disabledAgentAPIKey = crypto.randomUUID().replaceAll('-', '')
    expiredAgentAPIKey = crypto.randomUUID().replaceAll('-', '')

    agent = await payload.create({
      collection: 'agents',
      data: {
        active: true,
        apiKey: agentAPIKey,
        enableAPIKey: true,
        name: `MCP Test Agent ${suffix}`,
        scopes: ['posts:read', 'posts:write', 'posts:publish'],
      },
      overrideAccess: true,
    })
    otherAgent = await payload.create({
      collection: 'agents',
      data: {
        active: true,
        name: `Other MCP Agent ${suffix}`,
        scopes: ['posts:read', 'posts:write'],
      },
      overrideAccess: true,
    })
    disabledAgent = await payload.create({
      collection: 'agents',
      data: {
        active: false,
        apiKey: disabledAgentAPIKey,
        enableAPIKey: true,
        name: `Disabled MCP Agent ${suffix}`,
        scopes: ['posts:read'],
      },
      overrideAccess: true,
    })
    expiredAgent = await payload.create({
      collection: 'agents',
      data: {
        active: true,
        apiKey: expiredAgentAPIKey,
        enableAPIKey: true,
        expiresAt: '2020-01-01T00:00:00.000Z',
        name: `Expired MCP Agent ${suffix}`,
        scopes: ['posts:read'],
      },
      overrideAccess: true,
    })
    human = await payload.create({
      collection: 'users',
      data: {
        email: `mcp-test-${suffix}@example.com`,
        password: crypto.randomUUID(),
      },
      overrideAccess: true,
    })

    server = createAIBlogMCPServer({
      agent,
      payload,
      requestId: crypto.randomUUID(),
    })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    client = new Client({ name: 'aiblog-mcp-test', version: '1.0.0' })
    await client.connect(clientTransport)
  })

  afterAll(async () => {
    await client?.close()
    await server?.close()

    await payload.delete({
      collection: 'mcp-audit-logs',
      overrideAccess: true,
      where: { agent: { equals: agent.id } },
    })
    for (const id of postIDs) {
      await payload.delete({
        collection: 'posts',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
      })
    }
    await payload.delete({ collection: 'agents', id: agent.id, overrideAccess: true })
    await payload.delete({ collection: 'agents', id: otherAgent.id, overrideAccess: true })
    await payload.delete({ collection: 'agents', id: disabledAgent.id, overrideAccess: true })
    await payload.delete({ collection: 'agents', id: expiredAgent.id, overrideAccess: true })
    await payload.delete({ collection: 'users', id: human.id, overrideAccess: true })
  })

  it('authenticates an Agent API key through a Bearer header', async () => {
    const authenticated = await authenticateMCPAgent(
      payload,
      new Request('http://localhost/api/mcp', {
        headers: { Authorization: `Bearer ${agentAPIKey}` },
      }),
    )

    expect(authenticated.id).toBe(agent.id)
    await expect(
      authenticateMCPAgent(
        payload,
        new Request('http://localhost/api/mcp', {
          headers: { Authorization: 'Bearer invalid-key' },
        }),
      ),
    ).rejects.toThrow('无效')
    await expect(
      authenticateMCPAgent(
        payload,
        new Request('http://localhost/api/mcp', {
          headers: { Authorization: `Bearer ${disabledAgentAPIKey}` },
        }),
      ),
    ).rejects.toThrow('停用')
    await expect(
      authenticateMCPAgent(
        payload,
        new Request('http://localhost/api/mcp', {
          headers: { Authorization: `Bearer ${expiredAgentAPIKey}` },
        }),
      ),
    ).rejects.toThrow('过期')
  })

  it('exposes the planned tools and resources', async () => {
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'list_posts',
        'get_ab_post',
        'create_ab_post',
        'update_ab_post',
        'validate_ab_post',
        'publish_ab_post',
        'list_categories',
        'list_media',
        'list_products',
        'create_product',
        'publish_product',
        'list_releases',
        'create_release',
        'publish_release',
      ]),
    )

    const templates = await client.listResourceTemplates()
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual(
      expect.arrayContaining(['aiblog://posts/{id}/human', 'aiblog://posts/{id}/agent']),
    )
  })

  it('serves authenticated stateless Streamable HTTP requests', async () => {
    const endpoint = new URL('/api/mcp', getServerSideURL())
    const request = (body: Record<string, unknown>, authorization = `Bearer ${agentAPIKey}`) =>
      new Request(endpoint, {
        body: JSON.stringify(body),
        headers: {
          Accept: 'application/json, text/event-stream',
          Authorization: authorization,
          'Content-Type': 'application/json',
          Host: endpoint.host,
          'MCP-Protocol-Version': '2025-11-25',
        },
        method: 'POST',
      })

    const initialized = await mcpPOST(
      request({
        id: 1,
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          capabilities: {},
          clientInfo: { name: 'http-integration-test', version: '1.0.0' },
          protocolVersion: '2025-11-25',
        },
      }),
    )
    expect(initialized.status).toBe(200)
    await expect(initialized.json()).resolves.toMatchObject({
      id: 1,
      result: { serverInfo: { name: 'aiblog-ab-publishing' } },
    })

    const listed = await mcpPOST(
      request({ id: 2, jsonrpc: '2.0', method: 'tools/list', params: {} }),
    )
    expect(listed.status).toBe(200)
    const listBody = (await listed.json()) as { result: { tools: { name: string }[] } }
    expect(listBody.result.tools.map(({ name }) => name)).toContain('create_ab_post')

    const unauthorized = await mcpPOST(
      request({ id: 3, jsonrpc: '2.0', method: 'tools/list', params: {} }, 'Bearer invalid-key'),
    )
    expect(unauthorized.status).toBe(401)
  })

  it('creates, reviews, reads and publishes an atomic A/B post', async () => {
    const created = await client.callTool({
      arguments: {
        aMarkdown: '# MCP 测试文章\n\n这是供人类阅读的 A 文。',
        bDocument: {
          compatibility: 'Payload 3.86 / Node.js 22+',
          kind: 'runbook',
          markdown: bMarkdown,
          requiresApproval: false,
          riskLevel: 'low',
          version: '1.0',
        },
        slug: `mcp-test-${crypto.randomUUID()}`,
        title: 'MCP A/B 发文测试',
      },
      name: 'create_ab_post',
    })
    expect(created.isError).not.toBe(true)

    const createdData = created.structuredContent as {
      post: {
        id: number
        status: string
        updatedAt: string
        validation: { readyForReview: boolean }
      }
    }
    const id = createdData.post.id
    postIDs.push(id)
    expect(createdData.post.status).toBe('draft')
    expect(createdData.post.validation.readyForReview).toBe(true)

    await expect(
      payload.findByID({
        collection: 'posts',
        context: createMCPContext(crypto.randomUUID(), 'get_ab_post'),
        draft: true,
        id,
        overrideAccess: false,
        user: otherAgent,
      }),
    ).rejects.toThrow(/无权|未找到/)

    await expect(
      payload.update({
        collection: 'posts',
        context: {},
        data: { title: '绕过 MCP' },
        id,
        overrideAccess: false,
        user: agent,
      }),
    ).rejects.toThrow('无权')

    const draft = await payload.findByID({
      collection: 'posts',
      draft: true,
      id,
      overrideAccess: true,
    })
    const reviewed = await payload.update({
      collection: 'posts',
      data: {
        aiDocument: {
          ...draft.aiDocument,
          status: 'reviewed',
        },
      },
      depth: 1,
      draft: true,
      id,
      overrideAccess: false,
      user: human,
    })
    expect(reviewed.reviewedBy).toBeTruthy()
    expect(reviewed.reviewedAt).toBeTruthy()

    const changed = await client.callTool({
      arguments: {
        expectedUpdatedAt: reviewed.updatedAt,
        id,
        patch: { aMarkdown: '# MCP 测试文章\n\n更新后的 A 文。' },
      },
      name: 'update_ab_post',
    })
    expect(changed.isError).not.toBe(true)
    const changedData = changed.structuredContent as {
      post: { aiDocument: { status: string }; updatedAt: string }
    }
    expect(changedData.post.aiDocument.status).toBe('draft')

    const changedDraft = await payload.findByID({
      collection: 'posts',
      draft: true,
      id,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'posts',
      data: { aiDocument: { ...changedDraft.aiDocument, status: 'reviewed' } },
      draft: true,
      id,
      overrideAccess: false,
      user: human,
    })

    const fetched = await client.callTool({ arguments: { id }, name: 'get_ab_post' })
    const fetchedData = fetched.structuredContent as {
      post: { aMarkdown: string; updatedAt: string }
    }
    expect(fetchedData.post.aMarkdown).toContain('更新后的 A 文')

    const bResource = await client.readResource({ uri: `aiblog://posts/${id}/agent` })
    expect(bResource.contents[0]).toMatchObject({ mimeType: 'text/markdown' })
    expect('text' in bResource.contents[0] && bResource.contents[0].text).toContain('# 验证方法')

    const published = await client.callTool({
      arguments: {
        confirm: true,
        expectedUpdatedAt: fetchedData.post.updatedAt,
        id,
      },
      name: 'publish_ab_post',
    })
    expect(published.isError).not.toBe(true)
    const publishedData = published.structuredContent as { post: { status: string } }
    expect(publishedData.post.status).toBe('published')
  })

  it('rejects stale updates and high-risk MCP publishing', async () => {
    const created = await client.callTool({
      arguments: {
        aMarkdown: '# 高风险测试\n\nA 文。',
        bDocument: {
          compatibility: '测试环境',
          kind: 'runbook',
          markdown: bMarkdown,
          requiresApproval: true,
          riskLevel: 'high',
          version: '1.0',
        },
        slug: `mcp-high-risk-${crypto.randomUUID()}`,
        title: 'MCP 高风险发布测试',
      },
      name: 'create_ab_post',
    })
    const createdData = created.structuredContent as { post: { id: number; updatedAt: string } }
    postIDs.push(createdData.post.id)

    const conflict = await client.callTool({
      arguments: {
        expectedUpdatedAt: '2020-01-01T00:00:00.000Z',
        id: createdData.post.id,
        patch: { title: '不会写入' },
      },
      name: 'update_ab_post',
    })
    expect(conflict.isError).toBe(true)
    expect(conflict.structuredContent).toMatchObject({ error: { code: 'EDIT_CONFLICT' } })

    const draft = (await payload.findByID({
      collection: 'posts',
      draft: true,
      id: createdData.post.id,
      overrideAccess: true,
    })) as Post
    await payload.update({
      collection: 'posts',
      data: { aiDocument: { ...draft.aiDocument, status: 'reviewed' } },
      draft: true,
      id: draft.id,
      overrideAccess: false,
      user: human,
    })

    const refreshed = await client.callTool({
      arguments: { id: createdData.post.id },
      name: 'get_ab_post',
    })
    const refreshedData = refreshed.structuredContent as { post: { updatedAt: string } }
    const publish = await client.callTool({
      arguments: {
        confirm: true,
        expectedUpdatedAt: refreshedData.post.updatedAt,
        id: createdData.post.id,
      },
      name: 'publish_ab_post',
    })
    expect(publish.isError).toBe(true)
    expect(publish.structuredContent).toMatchObject({
      error: { code: 'AB_VALIDATION_FAILED' },
    })
  })
})
