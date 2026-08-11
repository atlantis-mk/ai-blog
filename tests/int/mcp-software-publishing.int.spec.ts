import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import config from '@/payload.config'
import type { Agent, Product, User } from '@/payload-types'
import { createMCPContext } from '@/mcp/context'
import { createAIBlogMCPServer } from '@/mcp/server'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const installMarkdown = `# 安装目标

安装 MCP 测试软件。

# 系统要求

macOS 14 或更新版本。

# 安装步骤

下载安装包并完成安装。

# 首次运行

启动应用并完成权限授权。

# 验证方法

确认应用能够正常打开。

# 卸载或回滚

删除应用并恢复原有配置。`

describe('MCP software publishing', () => {
  let payload: Payload
  let agent: Agent
  let otherAgent: Agent
  let human: User
  let client: Client
  let server: ReturnType<typeof createAIBlogMCPServer>
  let logoID: number
  const productIDs: number[] = []
  const releaseIDs: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const suffix = crypto.randomUUID()
    agent = await payload.create({
      collection: 'agents',
      data: {
        active: true,
        name: `Software MCP Agent ${suffix}`,
        scopes: [
          'products:read',
          'products:write',
          'products:publish',
          'releases:read',
          'releases:write',
          'releases:publish',
        ],
      },
      overrideAccess: true,
    })
    otherAgent = await payload.create({
      collection: 'agents',
      data: {
        active: true,
        name: `Other Software MCP Agent ${suffix}`,
        scopes: ['products:read', 'products:write', 'releases:read', 'releases:write'],
      },
      overrideAccess: true,
    })
    human = await payload.create({
      collection: 'users',
      data: {
        email: `mcp-software-${suffix}@example.com`,
        password: crypto.randomUUID(),
      },
      overrideAccess: true,
    })

    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#222"/></svg>',
    )
    const logo = await payload.create({
      collection: 'media',
      data: { alt: 'MCP software test logo' },
      file: {
        data: svg,
        mimetype: 'image/svg+xml',
        name: `mcp-software-${suffix}.svg`,
        size: svg.length,
      },
      overrideAccess: true,
    })
    logoID = logo.id

    server = createAIBlogMCPServer({
      agent,
      payload,
      requestId: crypto.randomUUID(),
    })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    client = new Client({ name: 'aiblog-software-mcp-test', version: '1.0.0' })
    await client.connect(clientTransport)
  })

  afterAll(async () => {
    await client?.close()
    await server?.close()
    if (agent) {
      await payload.delete({
        collection: 'mcp-audit-logs',
        overrideAccess: true,
        where: { agent: { equals: agent.id } },
      })
    }
    for (const id of releaseIDs) {
      await payload.delete({
        collection: 'releases',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
      })
    }
    for (const id of productIDs) {
      await payload.delete({
        collection: 'products',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
      })
    }
    if (logoID) await payload.delete({ collection: 'media', id: logoID, overrideAccess: true })
    if (agent) await payload.delete({ collection: 'agents', id: agent.id, overrideAccess: true })
    if (otherAgent) {
      await payload.delete({ collection: 'agents', id: otherAgent.id, overrideAccess: true })
    }
    if (human) await payload.delete({ collection: 'users', id: human.id, overrideAccess: true })
  })

  it('exposes software publishing tools and the install-document resource', async () => {
    const tools = await client.listTools()
    expect(tools.tools.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'list_products',
        'get_product',
        'create_product',
        'update_product',
        'validate_product',
        'publish_product',
        'list_product_assets',
        'list_releases',
        'get_release',
        'create_release',
        'update_release',
        'validate_release',
        'publish_release',
      ]),
    )
    const templates = await client.listResourceTemplates()
    expect(templates.resourceTemplates.map(({ uriTemplate }) => uriTemplate)).toContain(
      'aiblog://products/{id}/install',
    )
  })

  it('creates, reviews and publishes a product and downloadable release', async () => {
    const slug = `mcp-software-${crypto.randomUUID()}`
    const created = await client.callTool({
      arguments: {
        installDocument: {
          markdown: installMarkdown,
          requiresApproval: false,
          riskLevel: 'low',
          version: '1.0',
        },
        logoId: logoID,
        platforms: ['macOS'],
        slug,
        summary: '通过 MCP 发布流程创建的软件产品。',
        tagline: '安全、可审核的软件发布',
        title: 'MCP 软件发布测试',
      },
      name: 'create_product',
    })
    expect(created.isError).not.toBe(true)
    const createdData = created.structuredContent as {
      product: { id: number; status: string; updatedAt: string }
    }
    const productID = createdData.product.id
    productIDs.push(productID)
    expect(createdData.product.status).toBe('draft')

    await expect(
      payload.update({
        collection: 'products',
        context: createMCPContext(crypto.randomUUID(), 'update_product'),
        data: { title: '不应被其他 Agent 修改' },
        id: productID,
        overrideAccess: false,
        user: otherAgent,
      }),
    ).rejects.toThrow(/无权|未找到/)

    const blockedPublish = await client.callTool({
      arguments: {
        confirm: true,
        expectedUpdatedAt: createdData.product.updatedAt,
        id: productID,
      },
      name: 'publish_product',
    })
    expect(blockedPublish.isError).toBe(true)
    expect(blockedPublish.structuredContent).toMatchObject({
      error: { code: 'PRODUCT_VALIDATION_FAILED' },
    })

    const draft = (await payload.findByID({
      collection: 'products',
      draft: true,
      id: productID,
      overrideAccess: true,
    })) as Product
    const reviewed = await payload.update({
      collection: 'products',
      data: {
        installDocument: {
          ...draft.installDocument,
          status: 'reviewed',
        },
      },
      depth: 2,
      draft: true,
      id: productID,
      overrideAccess: false,
      user: human,
    })
    expect(reviewed.reviewedAt).toBeTruthy()

    const fetched = await client.callTool({ arguments: { id: productID }, name: 'get_product' })
    const fetchedData = fetched.structuredContent as { product: { updatedAt: string } }
    const publishedProduct = await client.callTool({
      arguments: {
        confirm: true,
        expectedUpdatedAt: fetchedData.product.updatedAt,
        id: productID,
      },
      name: 'publish_product',
    })
    expect(publishedProduct.isError).not.toBe(true)
    expect(publishedProduct.structuredContent).toMatchObject({
      product: { status: 'published' },
    })

    const createdRelease = await client.callTool({
      arguments: {
        architecture: 'Universal',
        checksum: '0123456789abcdef',
        checksumAlgorithm: 'sha256',
        downloadURL: 'https://downloads.example.com/mcp-software.dmg',
        fileSize: '35 MB',
        productId: productID,
        systemRequirements: 'macOS 14 或更新版本',
        version: '1.0.0',
      },
      name: 'create_release',
    })
    expect(createdRelease.isError).not.toBe(true)
    const createdReleaseData = createdRelease.structuredContent as {
      release: { id: number; status: string; updatedAt: string }
    }
    releaseIDs.push(createdReleaseData.release.id)
    expect(createdReleaseData.release.status).toBe('draft')

    const publishedRelease = await client.callTool({
      arguments: {
        confirm: true,
        expectedUpdatedAt: createdReleaseData.release.updatedAt,
        id: createdReleaseData.release.id,
      },
      name: 'publish_release',
    })
    expect(publishedRelease.isError).not.toBe(true)
    expect(publishedRelease.structuredContent).toMatchObject({
      release: { status: 'published' },
    })

    const resource = await client.readResource({
      uri: `aiblog://products/${productID}/install`,
    })
    expect('text' in resource.contents[0] && resource.contents[0].text).toContain(
      'release_version: "1.0.0"',
    )
    expect('text' in resource.contents[0] && resource.contents[0].text).toContain(
      'https://downloads.example.com/mcp-software.dmg',
    )
  })
})
