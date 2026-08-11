import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { APIError, type Payload, type Where } from 'payload'
import { z } from 'zod'

import type { Agent, Media, Product, Release } from '@/payload-types'
import { createMCPContext, hasAgentScope, type AgentScope } from '@/mcp/context'
import { markdownToPostContent, postContentToMarkdown } from '@/utilities/abPost'
import { getServerSideURL } from '@/utilities/getURL'
import {
  getReleaseDownloadURL,
  renderProductInstallMarkdown,
  validateProductInstallDocument,
} from '@/utilities/productInstallDocument'

import type { AuthenticatedAgent } from './auth'

const MAX_MARKDOWN_LENGTH = 100_000
const entityIDSchema = z.number().int().positive()
const optionalURLSchema = z.string().url().max(2_000)

const installDocumentSchema = z
  .object({
    markdown: z.string().min(1).max(MAX_MARKDOWN_LENGTH),
    requiresApproval: z.boolean().default(false),
    riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
    version: z.string().min(1).max(100).default('1.0'),
  })
  .strict()

const installDocumentPatchSchema = installDocumentSchema.partial()
const seoSchema = z
  .object({
    description: z.string().max(1_000).optional(),
    imageId: entityIDSchema.nullable().optional(),
    title: z.string().max(200).optional(),
  })
  .strict()

const productLinkSchema = z
  .object({ label: z.string().min(1).max(100), url: optionalURLSchema })
  .strict()
const featureSchema = z
  .object({
    description: z.string().min(1).max(5_000),
    imageId: entityIDSchema.optional(),
    title: z.string().min(1).max(200),
  })
  .strict()
const capabilityGroupSchema = z
  .object({
    description: z.string().max(5_000).optional(),
    items: z.array(z.string().min(1).max(200)).max(100).default([]),
    title: z.string().min(1).max(200),
  })
  .strict()

const productFieldsSchema = z.object({
  additionalMarkdown: z.string().max(MAX_MARKDOWN_LENGTH).optional(),
  capabilityGroups: z.array(capabilityGroupSchema).max(50).optional(),
  features: z.array(featureSchema).max(50).optional(),
  heroImageId: entityIDSchema.nullable().optional(),
  installDocument: installDocumentSchema,
  links: z.array(productLinkSchema).max(50).optional(),
  logoId: entityIDSchema,
  platforms: z.array(z.string().min(1).max(100)).max(50).optional(),
  seo: seoSchema.optional(),
  slug: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(10_000),
  tagline: z.string().min(1).max(500),
  title: z.string().min(1).max(300),
})

const productPatchSchema = z
  .object({
    additionalMarkdown: z.string().max(MAX_MARKDOWN_LENGTH).nullable().optional(),
    capabilityGroups: z.array(capabilityGroupSchema).max(50).optional(),
    features: z.array(featureSchema).max(50).optional(),
    heroImageId: entityIDSchema.nullable().optional(),
    installDocument: installDocumentPatchSchema.optional(),
    links: z.array(productLinkSchema).max(50).optional(),
    logoId: entityIDSchema.optional(),
    platforms: z.array(z.string().min(1).max(100)).max(50).optional(),
    seo: seoSchema.partial().optional(),
    slug: z.string().min(1).max(200).optional(),
    summary: z.string().min(1).max(10_000).optional(),
    tagline: z.string().min(1).max(500).optional(),
    title: z.string().min(1).max(300).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'patch 不能为空。' })

const releaseFieldsSchema = z
  .object({
    architecture: z.string().max(500).optional(),
    changelogURL: optionalURLSchema.optional(),
    channel: z.enum(['stable', 'beta', 'legacy']).default('stable'),
    checksum: z.string().max(1_000).optional(),
    checksumAlgorithm: z.enum(['sha256', 'sha512', 'md5']).default('sha256'),
    downloadURL: optionalURLSchema.optional(),
    fileId: entityIDSchema.optional(),
    fileSize: z.string().max(100).optional(),
    notes: z.string().max(10_000).optional(),
    productId: entityIDSchema,
    releasedAt: z.string().datetime().optional(),
    systemRequirements: z.string().min(1).max(10_000),
    version: z.string().min(1).max(100),
  })
  .strict()
  .refine((value) => Boolean(value.downloadURL) || Boolean(value.fileId), {
    message: '必须提供 downloadURL 或 fileId。',
  })

const releasePatchSchema = z
  .object({
    architecture: z.string().max(500).nullable().optional(),
    changelogURL: optionalURLSchema.nullable().optional(),
    channel: z.enum(['stable', 'beta', 'legacy']).optional(),
    checksum: z.string().max(1_000).nullable().optional(),
    checksumAlgorithm: z.enum(['sha256', 'sha512', 'md5']).optional(),
    downloadURL: optionalURLSchema.nullable().optional(),
    fileId: entityIDSchema.nullable().optional(),
    fileSize: z.string().max(100).nullable().optional(),
    notes: z.string().max(10_000).nullable().optional(),
    releasedAt: z.string().datetime().optional(),
    systemRequirements: z.string().min(1).max(10_000).optional(),
    version: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'patch 不能为空。' })

class SoftwareToolError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'SoftwareToolError'
  }
}

type ToolSuccess = {
  data: Record<string, unknown>
  summary: string
}

type ToolHandler<Args> = (args: Args, context: Record<string, unknown>) => Promise<ToolSuccess>

const relationID = (value: number | { id: number } | null | undefined): number | null => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object') return value.id
  return null
}

const assetSummary = (value: Media | number | null | undefined) => {
  if (!value) return null
  if (typeof value === 'number') return { id: value }
  return {
    alt: value.alt,
    filename: value.filename,
    id: value.id,
    mimeType: value.mimeType,
    url: value.url,
  }
}

const errorDetails = (error: unknown) => {
  if (error instanceof SoftwareToolError) return { code: error.code, message: error.message }
  if (error instanceof APIError) {
    return { code: `PAYLOAD_${error.status || 400}`, message: error.message }
  }
  if (error instanceof Error) return { code: 'INTERNAL_ERROR', message: error.message }
  return { code: 'INTERNAL_ERROR', message: '未知错误。' }
}

const toolResult = (summary: string, data: Record<string, unknown>) => ({
  content: [{ type: 'text' as const, text: summary }],
  structuredContent: { ok: true, ...data },
})

const toolErrorResult = (code: string, message: string) => ({
  content: [{ type: 'text' as const, text: `${code}: ${message}` }],
  isError: true,
  structuredContent: { error: { code, message }, ok: false },
})

const serializeProduct = (payload: Payload, product: Product) => {
  const serverURL = getServerSideURL().replace(/\/$/, '')
  return {
    additionalMarkdown: product.additionalContent
      ? postContentToMarkdown(payload, product.additionalContent)
      : null,
    capabilityGroups: product.capabilityGroups || [],
    createdByAgent: relationID(product.createdByAgent),
    features:
      product.features?.map(({ description, image, title }) => ({
        description,
        image: assetSummary(image),
        title,
      })) || [],
    heroImage: assetSummary(product.heroImage),
    id: product.id,
    installDocument: product.installDocument || null,
    links: product.links || [],
    logo: assetSummary(product.logo),
    platforms: product.platforms?.map(({ name }) => name) || [],
    reviewedAt: product.reviewedAt || null,
    slug: product.slug,
    status: product._status || 'draft',
    summary: product.summary,
    tagline: product.tagline,
    title: product.title,
    updatedAt: product.updatedAt,
    urls: {
      human: `${serverURL}/products/${encodeURIComponent(product.slug)}`,
      install: `${serverURL}/products/${encodeURIComponent(product.slug)}/ai.md`,
    },
    validation: validateProductInstallDocument(product, 'draft'),
  }
}

const serializeRelease = (release: Release) => ({
  architecture: release.architecture || null,
  changelogURL: release.changelogURL || null,
  channel: release.channel || 'stable',
  checksum: release.checksum || null,
  checksumAlgorithm: release.checksumAlgorithm || 'sha256',
  createdByAgent: relationID(release.createdByAgent),
  downloadURL: getReleaseDownloadURL(release),
  externalDownloadURL: release.downloadURL || null,
  file: assetSummary(release.file),
  fileSize: release.fileSize || null,
  id: release.id,
  notes: release.notes || null,
  productId: relationID(release.product),
  releasedAt: release.releasedAt || null,
  status: release._status || 'draft',
  systemRequirements: release.systemRequirements || null,
  updatedAt: release.updatedAt,
  version: release.version,
})

export const registerSoftwarePublishing = ({
  agent,
  payload,
  requestId,
  server,
}: {
  agent: AuthenticatedAgent
  payload: Payload
  requestId: string
  server: McpServer
}) => {
  const payloadAgent = agent as Agent
  const localContext = (tool: string) => createMCPContext(requestId, tool)

  const audit = async (
    tool: string,
    result: 'error' | 'success',
    message: string,
    errorCode?: string,
  ) => {
    try {
      await payload.create({
        collection: 'mcp-audit-logs',
        data: {
          agent: agent.id,
          errorCode,
          message: message.slice(0, 1000),
          requestId,
          result,
          tool,
        },
        overrideAccess: true,
      })
    } catch (error) {
      payload.logger.error({ err: error, requestId, tool }, 'Unable to write MCP audit log')
    }
  }

  const runTool = <Args>(tool: string, scope: AgentScope, handler: ToolHandler<Args>) => {
    return async (args: Args) => {
      if (!hasAgentScope(agent, scope)) {
        const message = `Agent 缺少 ${scope} 权限。`
        await audit(tool, 'error', message, 'INSUFFICIENT_SCOPE')
        return toolErrorResult('INSUFFICIENT_SCOPE', message)
      }

      try {
        const result = await handler(args, localContext(tool))
        await audit(tool, 'success', result.summary)
        return toolResult(result.summary, result.data)
      } catch (error) {
        const details = errorDetails(error)
        await audit(tool, 'error', details.message, details.code)
        return toolErrorResult(details.code, details.message)
      }
    }
  }

  const findProduct = async (
    identifier: { id?: number; slug?: string },
    context: Record<string, unknown>,
  ): Promise<Product> => {
    if (identifier.id) {
      for (const draft of [true, false]) {
        try {
          return await payload.findByID({
            collection: 'products',
            context,
            depth: 2,
            draft,
            id: identifier.id,
            overrideAccess: false,
            user: payloadAgent,
          })
        } catch {
          // Fall back to the published version when a newer draft is not visible.
        }
      }
    } else if (identifier.slug) {
      for (const draft of [true, false]) {
        const result = await payload.find({
          collection: 'products',
          context,
          depth: 2,
          draft,
          limit: 1,
          overrideAccess: false,
          pagination: false,
          user: payloadAgent,
          where: { slug: { equals: identifier.slug } },
        })
        if (result.docs[0]) return result.docs[0]
      }
    }

    throw new SoftwareToolError('PRODUCT_NOT_FOUND', '产品不存在或当前 Agent 无权访问。')
  }

  const findRelease = async (id: number, context: Record<string, unknown>): Promise<Release> => {
    for (const draft of [true, false]) {
      try {
        return await payload.findByID({
          collection: 'releases',
          context,
          depth: 2,
          draft,
          id,
          overrideAccess: false,
          user: payloadAgent,
        })
      } catch {
        // Fall back to the published version when a newer draft is not visible.
      }
    }
    throw new SoftwareToolError('RELEASE_NOT_FOUND', '产品版本不存在或当前 Agent 无权访问。')
  }

  const validateImage = async (
    id: number | null | undefined,
    context: Record<string, unknown>,
    label: string,
  ) => {
    if (!id) return
    let media: Media
    try {
      media = await payload.findByID({
        collection: 'media',
        context,
        depth: 0,
        id,
        overrideAccess: false,
        user: payloadAgent,
      })
    } catch {
      throw new SoftwareToolError('INVALID_MEDIA', `${label}媒体 ${id} 不存在。`)
    }
    if (!media.mimeType?.startsWith('image/')) {
      throw new SoftwareToolError('INVALID_MEDIA', `${label}媒体 ${id} 不是图片。`)
    }
  }

  const validateProductReferences = async (
    input: {
      features?: { imageId?: number }[]
      heroImageId?: number | null
      logoId?: number
      seo?: { imageId?: number | null }
    },
    context: Record<string, unknown>,
  ) => {
    await validateImage(input.logoId, context, '产品图标')
    await validateImage(input.heroImageId, context, '产品主图')
    await validateImage(input.seo?.imageId, context, 'SEO')
    for (const feature of input.features || []) {
      await validateImage(feature.imageId, context, '功能配图')
    }
  }

  const validateReleaseFile = async (
    id: number | null | undefined,
    context: Record<string, unknown>,
  ) => {
    if (!id) return
    try {
      await payload.findByID({
        collection: 'media',
        context,
        depth: 0,
        id,
        overrideAccess: false,
        user: payloadAgent,
      })
    } catch {
      throw new SoftwareToolError('INVALID_MEDIA', `安装文件媒体 ${id} 不存在。`)
    }
  }

  const releaseValidation = async (release: Release, context: Record<string, unknown>) => {
    const errors: string[] = []
    const warnings: string[] = []
    if (!getReleaseDownloadURL(release)) errors.push('必须填写外部下载地址或引用安装文件。')
    if (!release.systemRequirements?.trim()) errors.push('必须填写系统要求。')
    if (!release.checksum?.trim()) warnings.push('建议填写安装文件校验值。')

    const productID = relationID(release.product)
    if (!productID) {
      errors.push('必须关联有效产品。')
    } else {
      let product: Product | null = null
      try {
        product = await payload.findByID({
          collection: 'products',
          context,
          depth: 0,
          draft: false,
          id: productID,
          overrideAccess: false,
          user: payloadAgent,
        })
      } catch {
        errors.push('关联产品尚未发布或当前 Agent 无权访问。')
      }
      if (product) {
        const productReport = validateProductInstallDocument(product, 'mcp-publish')
        errors.push(...productReport.errors.map((message) => `关联产品：${message}`))
      }
    }

    return { errors, readyForMCPPublish: errors.length === 0, warnings }
  }

  const productData = (input: z.infer<typeof productFieldsSchema>) => ({
    _status: 'draft' as const,
    additionalContent: input.additionalMarkdown
      ? markdownToPostContent(payload, input.additionalMarkdown)
      : undefined,
    capabilityGroups: input.capabilityGroups?.map(({ description, items, title }) => ({
      description,
      items: items.map((label) => ({ label })),
      title,
    })),
    features: input.features?.map(({ description, imageId, title }) => ({
      description,
      image: imageId,
      title,
    })),
    generateSlug: !input.slug,
    heroImage: input.heroImageId,
    installDocument: { ...input.installDocument, status: 'draft' as const },
    links: input.links,
    logo: input.logoId,
    meta: input.seo
      ? {
          description: input.seo.description,
          image: input.seo.imageId,
          title: input.seo.title,
        }
      : undefined,
    platforms: input.platforms?.map((name) => ({ name })),
    slug: input.slug,
    summary: input.summary,
    tagline: input.tagline,
    title: input.title,
  })

  server.registerTool(
    'list_products',
    {
      annotations: { readOnlyHint: true },
      description: '列出当前 Agent 可见的已发布软件产品和自己创建的草稿。',
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
          page: z.number().int().min(1).default(1),
          query: z.string().max(200).optional(),
          status: z.enum(['all', 'draft', 'published']).default('all'),
        })
        .strict(),
    },
    runTool('list_products', 'products:read', async ({ limit, page, query, status }, context) => {
      const conditions: Where[] = []
      if (query) {
        conditions.push({
          or: [
            { title: { contains: query } },
            { slug: { contains: query } },
            { summary: { contains: query } },
          ],
        })
      }
      if (status !== 'all') conditions.push({ _status: { equals: status } })
      const result = await payload.find({
        collection: 'products',
        context,
        depth: 0,
        draft: status !== 'published',
        limit,
        overrideAccess: false,
        page,
        sort: '-updatedAt',
        user: payloadAgent,
        ...(conditions.length ? { where: { and: conditions } } : {}),
      })
      return {
        data: {
          hasNextPage: result.hasNextPage,
          page: result.page,
          products: result.docs.map(({ _status, id, slug, summary, title, updatedAt }) => ({
            id,
            slug,
            status: _status,
            summary,
            title,
            updatedAt,
          })),
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
        },
        summary: `找到 ${result.docs.length} 个软件产品。`,
      }
    }),
  )

  server.registerTool(
    'get_product',
    {
      annotations: { readOnlyHint: true },
      description: '按 ID 或 slug 读取软件产品、安装文档和发布校验状态。',
      inputSchema: z
        .object({
          id: entityIDSchema.optional(),
          slug: z.string().min(1).max(200).optional(),
        })
        .strict()
        .refine((value) => Boolean(value.id) !== Boolean(value.slug), {
          message: '必须且只能提供 id 或 slug。',
        }),
    },
    runTool('get_product', 'products:read', async (identifier, context) => {
      const product = await findProduct(identifier, context)
      return {
        data: { product: serializeProduct(payload, product) },
        summary: `已读取软件产品“${product.title}”。`,
      }
    }),
  )

  server.registerTool(
    'create_product',
    {
      annotations: { destructiveHint: false, idempotentHint: false },
      description: '创建包含人类产品页和 AI 安装运行文档的软件产品草稿。',
      inputSchema: productFieldsSchema.strict(),
    },
    runTool('create_product', 'products:write', async (input, context) => {
      const report = validateProductInstallDocument(
        { installDocument: { ...input.installDocument, status: 'draft' } } as Partial<Product>,
        'draft',
      )
      if (report.errors.length) {
        throw new SoftwareToolError('PRODUCT_VALIDATION_FAILED', report.errors.join(' '))
      }
      await validateProductReferences(input, context)
      const product = await payload.create({
        collection: 'products',
        context,
        data: productData(input),
        depth: 2,
        draft: true,
        overrideAccess: false,
        user: payloadAgent,
      })
      return {
        data: { product: serializeProduct(payload, product) },
        summary: `已创建软件产品草稿“${product.title}”。`,
      }
    }),
  )

  server.registerTool(
    'update_product',
    {
      annotations: { destructiveHint: true, idempotentHint: false },
      description: '以乐观锁方式更新自己创建的软件产品；安装文档变更后审核状态自动退回草稿。',
      inputSchema: z
        .object({
          expectedUpdatedAt: z.string().datetime(),
          id: entityIDSchema,
          patch: productPatchSchema,
        })
        .strict(),
    },
    runTool(
      'update_product',
      'products:write',
      async ({ expectedUpdatedAt, id, patch }, context) => {
        const current = await findProduct({ id }, context)
        if (current.updatedAt !== expectedUpdatedAt) {
          throw new SoftwareToolError(
            'EDIT_CONFLICT',
            `产品已在 ${current.updatedAt} 更新，请重新读取后再修改。`,
          )
        }
        await validateProductReferences(patch, context)

        const nextInstallDocument = patch.installDocument
          ? {
              ...(current.installDocument || {}),
              ...patch.installDocument,
              status: 'draft' as const,
            }
          : current.installDocument
        if (patch.installDocument) {
          const report = validateProductInstallDocument(
            { installDocument: nextInstallDocument } as Partial<Product>,
            'draft',
          )
          if (report.errors.length) {
            throw new SoftwareToolError('PRODUCT_VALIDATION_FAILED', report.errors.join(' '))
          }
        }

        const data: Record<string, unknown> = { _status: 'draft' }
        if (patch.title !== undefined) data.title = patch.title
        if (patch.tagline !== undefined) data.tagline = patch.tagline
        if (patch.summary !== undefined) data.summary = patch.summary
        if (patch.slug !== undefined) data.slug = patch.slug
        if (patch.logoId !== undefined) data.logo = patch.logoId
        if (patch.heroImageId !== undefined) data.heroImage = patch.heroImageId
        if (patch.platforms !== undefined)
          data.platforms = patch.platforms.map((name) => ({ name }))
        if (patch.links !== undefined) data.links = patch.links
        if (patch.features !== undefined) {
          data.features = patch.features.map(({ description, imageId, title }) => ({
            description,
            image: imageId,
            title,
          }))
        }
        if (patch.capabilityGroups !== undefined) {
          data.capabilityGroups = patch.capabilityGroups.map(({ description, items, title }) => ({
            description,
            items: items.map((label) => ({ label })),
            title,
          }))
        }
        if (patch.additionalMarkdown !== undefined) {
          data.additionalContent = patch.additionalMarkdown
            ? markdownToPostContent(payload, patch.additionalMarkdown)
            : null
        }
        if (patch.installDocument !== undefined) data.installDocument = nextInstallDocument
        if (patch.seo !== undefined) {
          data.meta = {
            ...(current.meta || {}),
            ...(patch.seo.description !== undefined ? { description: patch.seo.description } : {}),
            ...(patch.seo.imageId !== undefined ? { image: patch.seo.imageId } : {}),
            ...(patch.seo.title !== undefined ? { title: patch.seo.title } : {}),
          }
        }

        const product = await payload.update({
          collection: 'products',
          context,
          data,
          depth: 2,
          draft: true,
          id,
          overrideAccess: false,
          user: payloadAgent,
        })
        return {
          data: { product: serializeProduct(payload, product) },
          summary: `已更新软件产品草稿“${product.title}”。`,
        }
      },
    ),
  )

  server.registerTool(
    'validate_product',
    {
      annotations: { readOnlyHint: true },
      description: '检查软件产品的安装文档、人工审核状态、风险和 MCP 发布准备度。',
      inputSchema: z.object({ id: entityIDSchema }).strict(),
    },
    runTool('validate_product', 'products:read', async ({ id }, context) => {
      const product = await findProduct({ id }, context)
      const validation = validateProductInstallDocument(product, 'mcp-publish')
      return {
        data: { id: product.id, validation },
        summary: validation.errors.length
          ? `产品“${product.title}”有 ${validation.errors.length} 个发布阻塞项。`
          : `产品“${product.title}”已通过 MCP 发布校验。`,
      }
    }),
  )

  server.registerTool(
    'publish_product',
    {
      annotations: { destructiveHint: true, idempotentHint: true },
      description: '发布安装文档已由后台人工审核、风险为低或中的软件产品。',
      inputSchema: z
        .object({
          confirm: z.literal(true),
          expectedUpdatedAt: z.string().datetime(),
          id: entityIDSchema,
        })
        .strict(),
    },
    runTool('publish_product', 'products:publish', async ({ expectedUpdatedAt, id }, context) => {
      const current = await findProduct({ id }, context)
      if (current.updatedAt !== expectedUpdatedAt) {
        throw new SoftwareToolError(
          'EDIT_CONFLICT',
          `产品已在 ${current.updatedAt} 更新，请重新读取并重新确认发布。`,
        )
      }
      const validation = validateProductInstallDocument(current, 'mcp-publish')
      if (validation.errors.length) {
        throw new SoftwareToolError('PRODUCT_VALIDATION_FAILED', validation.errors.join(' '))
      }
      const product = await payload.update({
        collection: 'products',
        context,
        data: { _status: 'published' },
        depth: 2,
        draft: false,
        id,
        overrideAccess: false,
        user: payloadAgent,
      })
      return {
        data: { product: serializeProduct(payload, product) },
        summary: `已发布软件产品“${product.title}”。`,
      }
    }),
  )

  server.registerTool(
    'list_product_assets',
    {
      annotations: { readOnlyHint: true },
      description: '查询可供产品图片或版本安装文件引用的现有媒体资源。',
      inputSchema: z
        .object({
          kind: z.enum(['all', 'files', 'images']).default('all'),
          limit: z.number().int().min(1).max(100).default(50),
          query: z.string().max(200).optional(),
        })
        .strict(),
    },
    runTool('list_product_assets', 'products:read', async ({ kind, limit, query }, context) => {
      const conditions: Where[] = []
      if (kind === 'images') conditions.push({ mimeType: { contains: 'image/' } })
      if (kind === 'files') conditions.push({ mimeType: { not_like: 'image/%' } })
      if (query) {
        conditions.push({ or: [{ alt: { contains: query } }, { filename: { contains: query } }] })
      }
      const result = await payload.find({
        collection: 'media',
        context,
        depth: 0,
        limit,
        overrideAccess: false,
        sort: '-updatedAt',
        user: payloadAgent,
        ...(conditions.length ? { where: { and: conditions } } : {}),
      })
      return {
        data: { assets: result.docs.map(assetSummary) },
        summary: `找到 ${result.docs.length} 个媒体资源。`,
      }
    }),
  )

  server.registerTool(
    'list_releases',
    {
      annotations: { readOnlyHint: true },
      description: '列出指定产品的已发布版本和当前 Agent 创建的版本草稿。',
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          productId: entityIDSchema,
          status: z.enum(['all', 'draft', 'published']).default('all'),
        })
        .strict(),
    },
    runTool('list_releases', 'releases:read', async ({ limit, productId, status }, context) => {
      const result = await payload.find({
        collection: 'releases',
        context,
        depth: 1,
        draft: status !== 'published',
        limit,
        overrideAccess: false,
        pagination: false,
        sort: '-releasedAt',
        user: payloadAgent,
        where: {
          and: [
            { product: { equals: productId } },
            ...(status === 'all' ? [] : [{ _status: { equals: status } }]),
          ],
        },
      })
      return {
        data: { releases: result.docs.map(serializeRelease) },
        summary: `找到 ${result.docs.length} 个产品版本。`,
      }
    }),
  )

  server.registerTool(
    'get_release',
    {
      annotations: { readOnlyHint: true },
      description: '读取产品版本、下载来源和发布校验状态。',
      inputSchema: z.object({ id: entityIDSchema }).strict(),
    },
    runTool('get_release', 'releases:read', async ({ id }, context) => {
      const release = await findRelease(id, context)
      const validation = await releaseValidation(release, context)
      return {
        data: { release: { ...serializeRelease(release), validation } },
        summary: `已读取产品版本 ${release.version}。`,
      }
    }),
  )

  server.registerTool(
    'create_release',
    {
      annotations: { destructiveHint: false, idempotentHint: false },
      description: '为自己创建的软件产品新增版本草稿，可引用已有安装文件或 HTTPS 下载地址。',
      inputSchema: releaseFieldsSchema,
    },
    runTool('create_release', 'releases:write', async (input, context) => {
      if (!hasAgentScope(agent, 'products:read')) {
        throw new SoftwareToolError('INSUFFICIENT_SCOPE', 'Agent 缺少 products:read 权限。')
      }
      await validateReleaseFile(input.fileId, context)
      await findProduct({ id: input.productId }, context)
      const release = await payload.create({
        collection: 'releases',
        context,
        data: {
          _status: 'draft',
          architecture: input.architecture,
          changelogURL: input.changelogURL,
          channel: input.channel,
          checksum: input.checksum,
          checksumAlgorithm: input.checksumAlgorithm,
          downloadURL: input.downloadURL,
          file: input.fileId,
          fileSize: input.fileSize,
          notes: input.notes,
          product: input.productId,
          releasedAt: input.releasedAt,
          systemRequirements: input.systemRequirements,
          version: input.version,
        },
        depth: 2,
        draft: true,
        overrideAccess: false,
        user: payloadAgent,
      })
      return {
        data: { release: serializeRelease(release) },
        summary: `已创建产品版本草稿 ${release.version}。`,
      }
    }),
  )

  server.registerTool(
    'update_release',
    {
      annotations: { destructiveHint: true, idempotentHint: false },
      description: '以乐观锁方式更新自己创建的产品版本草稿。',
      inputSchema: z
        .object({
          expectedUpdatedAt: z.string().datetime(),
          id: entityIDSchema,
          patch: releasePatchSchema,
        })
        .strict(),
    },
    runTool(
      'update_release',
      'releases:write',
      async ({ expectedUpdatedAt, id, patch }, context) => {
        const current = await findRelease(id, context)
        if (current.updatedAt !== expectedUpdatedAt) {
          throw new SoftwareToolError(
            'EDIT_CONFLICT',
            `产品版本已在 ${current.updatedAt} 更新，请重新读取后再修改。`,
          )
        }
        await validateReleaseFile(patch.fileId, context)
        const nextFile = patch.fileId !== undefined ? patch.fileId : relationID(current.file)
        const nextDownloadURL =
          patch.downloadURL !== undefined ? patch.downloadURL : current.downloadURL
        if (!nextFile && !nextDownloadURL) {
          throw new SoftwareToolError(
            'RELEASE_VALIDATION_FAILED',
            '必须保留 downloadURL 或 fileId 作为下载来源。',
          )
        }
        const data: Record<string, unknown> = { _status: 'draft' }
        const mappings = {
          architecture: 'architecture',
          changelogURL: 'changelogURL',
          channel: 'channel',
          checksum: 'checksum',
          checksumAlgorithm: 'checksumAlgorithm',
          downloadURL: 'downloadURL',
          fileId: 'file',
          fileSize: 'fileSize',
          notes: 'notes',
          releasedAt: 'releasedAt',
          systemRequirements: 'systemRequirements',
          version: 'version',
        } as const
        for (const [source, target] of Object.entries(mappings)) {
          const value = patch[source as keyof typeof patch]
          if (value !== undefined) data[target] = value
        }
        const release = await payload.update({
          collection: 'releases',
          context,
          data,
          depth: 2,
          draft: true,
          id,
          overrideAccess: false,
          user: payloadAgent,
        })
        return {
          data: { release: serializeRelease(release) },
          summary: `已更新产品版本草稿 ${release.version}。`,
        }
      },
    ),
  )

  server.registerTool(
    'validate_release',
    {
      annotations: { readOnlyHint: true },
      description: '检查版本下载来源、系统要求、关联产品状态和 MCP 发布准备度。',
      inputSchema: z.object({ id: entityIDSchema }).strict(),
    },
    runTool('validate_release', 'releases:read', async ({ id }, context) => {
      const release = await findRelease(id, context)
      const validation = await releaseValidation(release, context)
      return {
        data: { id: release.id, validation },
        summary: validation.errors.length
          ? `版本 ${release.version} 有 ${validation.errors.length} 个发布阻塞项。`
          : `版本 ${release.version} 已通过 MCP 发布校验。`,
      }
    }),
  )

  server.registerTool(
    'publish_release',
    {
      annotations: { destructiveHint: true, idempotentHint: true },
      description: '发布下载来源有效且关联产品已完成发布和人工审核的软件版本。',
      inputSchema: z
        .object({
          confirm: z.literal(true),
          expectedUpdatedAt: z.string().datetime(),
          id: entityIDSchema,
        })
        .strict(),
    },
    runTool('publish_release', 'releases:publish', async ({ expectedUpdatedAt, id }, context) => {
      const current = await findRelease(id, context)
      if (current.updatedAt !== expectedUpdatedAt) {
        throw new SoftwareToolError(
          'EDIT_CONFLICT',
          `产品版本已在 ${current.updatedAt} 更新，请重新读取并重新确认发布。`,
        )
      }
      const validation = await releaseValidation(current, context)
      if (validation.errors.length) {
        throw new SoftwareToolError('RELEASE_VALIDATION_FAILED', validation.errors.join(' '))
      }
      const release = await payload.update({
        collection: 'releases',
        context,
        data: { _status: 'published' },
        depth: 2,
        draft: false,
        id,
        overrideAccess: false,
        user: payloadAgent,
      })
      return {
        data: { release: serializeRelease(release) },
        summary: `已发布产品版本 ${release.version}。`,
      }
    }),
  )

  server.registerResource(
    'product-install-document',
    new ResourceTemplate('aiblog://products/{id}/install', {
      list: async () => {
        if (!hasAgentScope(agent, 'products:read')) {
          throw new Error('Agent 缺少 products:read 权限。')
        }
        const result = await payload.find({
          collection: 'products',
          context: localContext('resource:product-install:list'),
          depth: 0,
          draft: true,
          limit: 50,
          overrideAccess: false,
          sort: '-updatedAt',
          user: payloadAgent,
        })
        return {
          resources: result.docs.map((product) => ({
            mimeType: 'text/markdown',
            name: `${product.title}（AI 安装运行文档）`,
            uri: `aiblog://products/${product.id}/install`,
          })),
        }
      },
    }),
    { description: '软件产品的 AI 安装运行 Markdown', mimeType: 'text/markdown' },
    async (uri, variables) => {
      if (!hasAgentScope(agent, 'products:read') || !hasAgentScope(agent, 'releases:read')) {
        throw new Error('Agent 缺少 products:read 或 releases:read 权限。')
      }
      const id = Number(variables.id)
      if (!Number.isInteger(id) || id <= 0) throw new Error('产品 ID 无效。')
      const context = localContext('resource:product-install')
      const product = await findProduct({ id }, context)
      const releases = await payload.find({
        collection: 'releases',
        context,
        depth: 2,
        draft: true,
        limit: 1,
        overrideAccess: false,
        pagination: false,
        sort: '-releasedAt',
        user: payloadAgent,
        where: {
          and: [{ product: { equals: product.id } }, { channel: { equals: 'stable' } }],
        },
      })
      const release = releases.docs[0]
      if (!release) throw new Error('产品没有可读取的稳定版本。')
      const markdown = renderProductInstallMarkdown({
        product,
        release,
        serverURL: getServerSideURL(),
      })
      if (!markdown) throw new Error('产品安装文档尚未通过人工审核。')
      return {
        contents: [{ mimeType: 'text/markdown', text: markdown, uri: uri.href }],
      }
    },
  )
}
