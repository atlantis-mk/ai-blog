import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Payload, Where } from 'payload'
import { APIError } from 'payload'
import { z } from 'zod'

import type { Agent, Media, Post } from '@/payload-types'
import { aiDocumentURLPlaceholder } from '@/collections/Posts/aiDocument'
import { createMCPContext, hasAgentScope, type AgentScope } from '@/mcp/context'
import { markdownToPostContent, postContentToMarkdown, validateABPost } from '@/utilities/abPost'
import { getServerSideURL } from '@/utilities/getURL'
import { renderAIDocumentMarkdown } from '@/utilities/renderAIDocumentMarkdown'

import type { AuthenticatedAgent } from './auth'
import { registerSoftwarePublishing } from './software'

const MAX_A_MARKDOWN_LENGTH = 200_000
const MAX_B_MARKDOWN_LENGTH = 100_000
const MAX_AI_PROMPT_LENGTH = 20_000

const postIDSchema = z.number().int().positive()
const aiPromptSchema = z
  .string()
  .max(MAX_AI_PROMPT_LENGTH)
  .refine((value) => !value || value.includes(aiDocumentURLPlaceholder), {
    message: `提示词必须包含 ${aiDocumentURLPlaceholder}，系统会在复制时替换为当前 B 文链接。`,
  })
  .nullable()
  .optional()
const bDocumentSchema = z
  .object({
    compatibility: z.string().max(5_000).optional(),
    kind: z.enum(['runbook', 'reference', 'checklist']),
    markdown: z.string().min(1).max(MAX_B_MARKDOWN_LENGTH),
    prompt: aiPromptSchema,
    requiresApproval: z.boolean().default(false),
    riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
    version: z.string().min(1).max(100),
  })
  .strict()

const bDocumentPatchSchema = bDocumentSchema.partial()

const seoSchema = z
  .object({
    description: z.string().max(1_000).optional(),
    title: z.string().max(200).optional(),
  })
  .strict()

const idOrSlugSchema = z
  .object({
    id: postIDSchema.optional(),
    slug: z.string().min(1).max(200).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.id) !== Boolean(value.slug), {
    message: '必须且只能提供 id 或 slug。',
  })

const postPatchSchema = z
  .object({
    aMarkdown: z.string().min(1).max(MAX_A_MARKDOWN_LENGTH).optional(),
    bDocument: bDocumentPatchSchema.optional(),
    categoryIds: z.array(postIDSchema).max(50).optional(),
    heroImageId: postIDSchema.nullable().optional(),
    seo: seoSchema.partial().optional(),
    slug: z.string().min(1).max(200).optional(),
    title: z.string().min(1).max(300).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'patch 不能为空。' })

class MCPToolError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'MCPToolError'
  }
}

type ToolSuccess = {
  data: Record<string, unknown>
  postID?: number
  summary: string
}

type ToolHandler<Args> = (args: Args, context: Record<string, unknown>) => Promise<ToolSuccess>

const relationID = (value: number | { id: number } | null | undefined): number | null => {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object') return value.id
  return null
}

const errorDetails = (error: unknown) => {
  if (error instanceof MCPToolError) return { code: error.code, message: error.message }
  if (error instanceof APIError) {
    return {
      code: `PAYLOAD_${error.status || 400}`,
      message: error.message,
    }
  }
  if (error instanceof Error) return { code: 'INTERNAL_ERROR', message: error.message }
  return { code: 'INTERNAL_ERROR', message: '未知错误。' }
}

const auditToolCall = async ({
  agent,
  message,
  payload,
  postID,
  requestId,
  result,
  tool,
  errorCode,
}: {
  agent: AuthenticatedAgent
  errorCode?: string
  message: string
  payload: Payload
  postID?: number
  requestId: string
  result: 'error' | 'success'
  tool: string
}) => {
  try {
    await payload.create({
      collection: 'mcp-audit-logs',
      data: {
        agent: agent.id,
        errorCode,
        message: message.slice(0, 1000),
        post: postID,
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

const toolResult = (summary: string, data: Record<string, unknown>) => ({
  content: [{ type: 'text' as const, text: summary }],
  structuredContent: {
    ok: true,
    ...data,
  },
})

const toolErrorResult = (code: string, message: string) => ({
  content: [{ type: 'text' as const, text: `${code}: ${message}` }],
  isError: true,
  structuredContent: {
    error: { code, message },
    ok: false,
  },
})

const serializePost = (payload: Payload, post: Post) => {
  const serverURL = getServerSideURL().replace(/\/$/, '')
  const sourceURL = `${serverURL}/posts/${encodeURIComponent(post.slug)}`
  const aMarkdown = postContentToMarkdown(payload, post.content)
  const report = validateABPost({ aMarkdown, aiDocument: post.aiDocument, mode: 'draft' })

  return {
    aMarkdown,
    aiDocument: post.aiDocument || null,
    categories: (post.categories || []).map((category) =>
      typeof category === 'number'
        ? { id: category }
        : { id: category.id, slug: category.slug, title: category.title },
    ),
    createdByAgent: relationID(post.createdByAgent),
    heroImage: post.heroImage
      ? typeof post.heroImage === 'number'
        ? { id: post.heroImage }
        : {
            alt: post.heroImage.alt,
            filename: post.heroImage.filename,
            id: post.heroImage.id,
            url: post.heroImage.url,
          }
      : null,
    id: post.id,
    reviewedAt: post.reviewedAt || null,
    slug: post.slug,
    status: post._status || 'draft',
    title: post.title,
    updatedAt: post.updatedAt,
    urls: {
      agent: `${sourceURL}/ai.md`,
      human: sourceURL,
    },
    validation: report,
  }
}

export const createAIBlogMCPServer = ({
  agent,
  payload,
  requestId,
}: {
  agent: AuthenticatedAgent
  payload: Payload
  requestId: string
}) => {
  const server = new McpServer({
    name: 'aiblog-ab-publishing',
    version: '1.0.0',
  })

  const localContext = (tool: string) => createMCPContext(requestId, tool)
  const payloadAgent = agent as Agent

  const runTool = <Args>(tool: string, scope: AgentScope, handler: ToolHandler<Args>) => {
    return async (args: Args) => {
      if (!hasAgentScope(agent, scope)) {
        const message = `Agent 缺少 ${scope} 权限。`
        await auditToolCall({
          agent,
          errorCode: 'INSUFFICIENT_SCOPE',
          message,
          payload,
          requestId,
          result: 'error',
          tool,
        })
        return toolErrorResult('INSUFFICIENT_SCOPE', message)
      }

      try {
        const result = await handler(args, localContext(tool))
        await auditToolCall({
          agent,
          message: result.summary,
          payload,
          postID: result.postID,
          requestId,
          result: 'success',
          tool,
        })
        return toolResult(result.summary, result.data)
      } catch (error) {
        const details = errorDetails(error)
        await auditToolCall({
          agent,
          errorCode: details.code,
          message: details.message,
          payload,
          requestId,
          result: 'error',
          tool,
        })
        return toolErrorResult(details.code, details.message)
      }
    }
  }

  const findPost = async (
    identifier: { id?: number; slug?: string },
    context: Record<string, unknown>,
  ): Promise<Post> => {
    if (identifier.id) {
      for (const draft of [true, false]) {
        try {
          return await payload.findByID({
            collection: 'posts',
            context,
            depth: 1,
            draft,
            id: identifier.id,
            overrideAccess: false,
            user: payloadAgent,
          })
        } catch {
          // A non-owner may not read a newer draft, but can still read the published version.
        }
      }

      throw new MCPToolError('POST_NOT_FOUND', '文章不存在或当前 Agent 无权访问。')
    }

    for (const draft of [true, false]) {
      const result = await payload.find({
        collection: 'posts',
        context,
        depth: 1,
        draft,
        limit: 1,
        overrideAccess: false,
        pagination: false,
        user: payloadAgent,
        where: {
          slug: {
            equals: identifier.slug!,
          },
        },
      })

      if (result.docs[0]) return result.docs[0]
    }

    throw new MCPToolError('POST_NOT_FOUND', '文章不存在或当前 Agent 无权访问。')
  }

  const validateReferences = async (
    categoryIds: number[] | undefined,
    heroImageId: number | null | undefined,
    context: Record<string, unknown>,
  ) => {
    for (const id of categoryIds || []) {
      try {
        await payload.findByID({
          collection: 'categories',
          context,
          depth: 0,
          id,
          overrideAccess: false,
          user: payloadAgent,
        })
      } catch {
        throw new MCPToolError('INVALID_CATEGORY', `分类 ${id} 不存在。`)
      }
    }

    if (heroImageId) {
      let media: Media
      try {
        media = await payload.findByID({
          collection: 'media',
          context,
          depth: 0,
          id: heroImageId,
          overrideAccess: false,
          user: payloadAgent,
        })
      } catch {
        throw new MCPToolError('INVALID_MEDIA', `媒体 ${heroImageId} 不存在。`)
      }

      if (!media.mimeType?.startsWith('image/')) {
        throw new MCPToolError('INVALID_MEDIA', `媒体 ${heroImageId} 不是图片。`)
      }
    }
  }

  server.registerTool(
    'list_posts',
    {
      annotations: { readOnlyHint: true },
      description: '列出当前 Agent 可见的已发布文章和自己创建的草稿。',
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
          page: z.number().int().min(1).default(1),
          query: z.string().max(200).optional(),
          status: z.enum(['all', 'draft', 'published']).default('all'),
        })
        .strict(),
    },
    runTool('list_posts', 'posts:read', async ({ limit, page, query, status }, context) => {
      const conditions: Where[] = []
      if (query) {
        conditions.push({
          or: [{ title: { contains: query } }, { slug: { contains: query } }],
        })
      }
      if (status !== 'all') conditions.push({ _status: { equals: status } })

      const result = await payload.find({
        collection: 'posts',
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
          posts: result.docs.map((post) => ({
            id: post.id,
            slug: post.slug,
            status: post._status,
            title: post.title,
            updatedAt: post.updatedAt,
          })),
          totalDocs: result.totalDocs,
          totalPages: result.totalPages,
        },
        summary: `找到 ${result.docs.length} 篇文章。`,
      }
    }),
  )

  server.registerTool(
    'get_ab_post',
    {
      annotations: { readOnlyHint: true },
      description: '按 ID 或 slug 读取同一篇文章的 A 文、B 文和验证状态。',
      inputSchema: idOrSlugSchema,
    },
    runTool('get_ab_post', 'posts:read', async (identifier, context) => {
      const post = await findPost(identifier, context)
      return {
        data: { post: serializePost(payload, post) },
        postID: post.id,
        summary: `已读取文章“${post.title}”的 A/B 文。`,
      }
    }),
  )

  server.registerTool(
    'create_ab_post',
    {
      annotations: { destructiveHint: false, idempotentHint: false },
      description: '原子创建包含 A 文和 B 文的文章草稿。A 文使用 Markdown 输入。',
      inputSchema: z
        .object({
          aMarkdown: z.string().min(1).max(MAX_A_MARKDOWN_LENGTH),
          bDocument: bDocumentSchema,
          categoryIds: z.array(postIDSchema).max(50).optional(),
          heroImageId: postIDSchema.optional(),
          seo: seoSchema.optional(),
          slug: z.string().min(1).max(200).optional(),
          title: z.string().min(1).max(300),
        })
        .strict(),
    },
    runTool(
      'create_ab_post',
      'posts:write',
      async ({ aMarkdown, bDocument, categoryIds, heroImageId, seo, slug, title }, context) => {
        const report = validateABPost({
          aMarkdown,
          aiDocument: { ...bDocument, status: 'draft' },
          mode: 'draft',
        })
        if (report.errors.length) {
          throw new MCPToolError('AB_VALIDATION_FAILED', report.errors.join(' '))
        }

        await validateReferences(categoryIds, heroImageId, context)

        const post = await payload.create({
          collection: 'posts',
          context,
          data: {
            _status: 'draft',
            aiDocument: { ...bDocument, status: 'draft' },
            categories: categoryIds,
            content: markdownToPostContent(payload, aMarkdown),
            generateSlug: !slug,
            heroImage: heroImageId,
            meta: seo,
            slug,
            title,
          },
          depth: 1,
          draft: true,
          overrideAccess: false,
          user: payloadAgent,
        })

        return {
          data: { post: serializePost(payload, post) },
          postID: post.id,
          summary: `已创建 A/B 文章草稿“${post.title}”。`,
        }
      },
    ),
  )

  server.registerTool(
    'update_ab_post',
    {
      annotations: { destructiveHint: true, idempotentHint: false },
      description: '以乐观锁方式更新自己创建的文章；A/B 内容变更后审核状态自动退回草稿。',
      inputSchema: z
        .object({
          expectedUpdatedAt: z.string().datetime(),
          id: postIDSchema,
          patch: postPatchSchema,
        })
        .strict(),
    },
    runTool('update_ab_post', 'posts:write', async ({ expectedUpdatedAt, id, patch }, context) => {
      const current = await findPost({ id }, context)
      if (current.updatedAt !== expectedUpdatedAt) {
        throw new MCPToolError(
          'EDIT_CONFLICT',
          `文章已在 ${current.updatedAt} 更新，请重新读取后再修改。`,
        )
      }

      await validateReferences(patch.categoryIds, patch.heroImageId, context)

      const nextA = patch.aMarkdown ?? postContentToMarkdown(payload, current.content)
      const nextB = {
        ...(current.aiDocument || {}),
        ...(patch.bDocument || {}),
      }
      const report = validateABPost({ aMarkdown: nextA, aiDocument: nextB, mode: 'draft' })
      if (report.errors.length) {
        throw new MCPToolError('AB_VALIDATION_FAILED', report.errors.join(' '))
      }

      const data: Record<string, unknown> = { _status: 'draft' }
      if (patch.title !== undefined) data.title = patch.title
      if (patch.slug !== undefined) data.slug = patch.slug
      if (patch.aMarkdown !== undefined) {
        data.content = markdownToPostContent(payload, patch.aMarkdown)
      }
      if (patch.bDocument !== undefined) data.aiDocument = patch.bDocument
      if (patch.categoryIds !== undefined) data.categories = patch.categoryIds
      if (patch.heroImageId !== undefined) data.heroImage = patch.heroImageId
      if (patch.seo !== undefined) data.meta = { ...(current.meta || {}), ...patch.seo }

      const post = await payload.update({
        collection: 'posts',
        context,
        data,
        depth: 1,
        draft: true,
        id,
        overrideAccess: false,
        user: payloadAgent,
      })

      return {
        data: { post: serializePost(payload, post) },
        postID: post.id,
        summary: `已更新 A/B 文章草稿“${post.title}”。`,
      }
    }),
  )

  server.registerTool(
    'validate_ab_post',
    {
      annotations: { readOnlyHint: true },
      description: '确定性检查 A/B 文结构、风险、审核状态和 MCP 发布准备度。',
      inputSchema: z.object({ id: postIDSchema }).strict(),
    },
    runTool('validate_ab_post', 'posts:read', async ({ id }, context) => {
      const post = await findPost({ id }, context)
      const report = validateABPost({
        aMarkdown: postContentToMarkdown(payload, post.content),
        aiDocument: post.aiDocument,
        mode: 'mcp-publish',
      })
      return {
        data: { id: post.id, validation: report },
        postID: post.id,
        summary: report.errors.length
          ? `文章“${post.title}”有 ${report.errors.length} 个发布阻塞项。`
          : `文章“${post.title}”已通过 MCP 发布校验。`,
      }
    }),
  )

  server.registerTool(
    'publish_ab_post',
    {
      annotations: { destructiveHint: true, idempotentHint: true },
      description: '发布已经后台人工审核、风险为低或中的 A/B 文章。',
      inputSchema: z
        .object({
          confirm: z.literal(true),
          expectedUpdatedAt: z.string().datetime(),
          id: postIDSchema,
        })
        .strict(),
    },
    runTool('publish_ab_post', 'posts:publish', async ({ expectedUpdatedAt, id }, context) => {
      const current = await findPost({ id }, context)
      if (current.updatedAt !== expectedUpdatedAt) {
        throw new MCPToolError(
          'EDIT_CONFLICT',
          `文章已在 ${current.updatedAt} 更新，请重新读取并重新确认发布。`,
        )
      }

      const report = validateABPost({
        aMarkdown: postContentToMarkdown(payload, current.content),
        aiDocument: current.aiDocument,
        mode: 'mcp-publish',
      })
      if (report.errors.length) {
        throw new MCPToolError('AB_VALIDATION_FAILED', report.errors.join(' '))
      }

      const post = await payload.update({
        collection: 'posts',
        context,
        data: { _status: 'published' },
        depth: 1,
        draft: false,
        id,
        overrideAccess: false,
        user: payloadAgent,
      })

      return {
        data: { post: serializePost(payload, post) },
        postID: post.id,
        summary: `已发布 A/B 文章“${post.title}”。`,
      }
    }),
  )

  server.registerTool(
    'list_categories',
    {
      annotations: { readOnlyHint: true },
      description: '查询可供文章引用的现有分类。',
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          query: z.string().max(200).optional(),
        })
        .strict(),
    },
    runTool('list_categories', 'posts:read', async ({ limit, query }, context) => {
      const result = await payload.find({
        collection: 'categories',
        context,
        depth: 0,
        limit,
        overrideAccess: false,
        sort: 'title',
        user: payloadAgent,
        ...(query ? { where: { title: { contains: query } } } : {}),
      })
      return {
        data: {
          categories: result.docs.map(({ id, slug, title }) => ({ id, slug, title })),
        },
        summary: `找到 ${result.docs.length} 个分类。`,
      }
    }),
  )

  server.registerTool(
    'list_media',
    {
      annotations: { readOnlyHint: true },
      description: '查询可作为文章头图引用的现有图片媒体。',
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          query: z.string().max(200).optional(),
        })
        .strict(),
    },
    runTool('list_media', 'posts:read', async ({ limit, query }, context) => {
      const conditions: Where[] = [{ mimeType: { contains: 'image/' } }]
      if (query) {
        conditions.push({
          or: [{ alt: { contains: query } }, { filename: { contains: query } }],
        })
      }

      const result = await payload.find({
        collection: 'media',
        context,
        depth: 0,
        limit,
        overrideAccess: false,
        sort: '-updatedAt',
        user: payloadAgent,
        where: { and: conditions },
      })
      return {
        data: {
          media: result.docs.map(({ alt, filename, id, mimeType, url }) => ({
            alt,
            filename,
            id,
            mimeType,
            url,
          })),
        },
        summary: `找到 ${result.docs.length} 张图片。`,
      }
    }),
  )

  registerSoftwarePublishing({ agent, payload, requestId, server })

  const listPostResources = async (kind: 'agent' | 'human') => {
    if (!hasAgentScope(agent, 'posts:read')) {
      throw new Error('Agent 缺少 posts:read 权限。')
    }

    const result = await payload.find({
      collection: 'posts',
      context: localContext(`resource:${kind}:list`),
      depth: 0,
      draft: true,
      limit: 50,
      overrideAccess: false,
      sort: '-updatedAt',
      user: payloadAgent,
    })

    return {
      resources: result.docs.map((post) => ({
        mimeType: 'text/markdown',
        name: `${post.title}（${kind === 'human' ? 'A 文' : 'B 文'}）`,
        uri: `aiblog://posts/${post.id}/${kind}`,
      })),
    }
  }

  server.registerResource(
    'ab-post-human',
    new ResourceTemplate('aiblog://posts/{id}/human', {
      list: () => listPostResources('human'),
    }),
    { description: '面向人类阅读的 A 文 Markdown', mimeType: 'text/markdown' },
    async (uri, variables) => {
      if (!hasAgentScope(agent, 'posts:read')) {
        throw new Error('Agent 缺少 posts:read 权限。')
      }
      const id = Number(variables.id)
      if (!Number.isInteger(id) || id <= 0) throw new Error('文章 ID 无效。')
      const post = await findPost({ id }, localContext('resource:human'))
      return {
        contents: [
          {
            mimeType: 'text/markdown',
            text: postContentToMarkdown(payload, post.content),
            uri: uri.href,
          },
        ],
      }
    },
  )

  server.registerResource(
    'ab-post-agent',
    new ResourceTemplate('aiblog://posts/{id}/agent', {
      list: () => listPostResources('agent'),
    }),
    { description: '面向 Agent 的 B 文 Markdown', mimeType: 'text/markdown' },
    async (uri, variables) => {
      if (!hasAgentScope(agent, 'posts:read')) {
        throw new Error('Agent 缺少 posts:read 权限。')
      }
      const id = Number(variables.id)
      if (!Number.isInteger(id) || id <= 0) throw new Error('文章 ID 无效。')
      const post = await findPost({ id }, localContext('resource:agent'))
      const sourceURL = `${getServerSideURL().replace(/\/$/, '')}/posts/${encodeURIComponent(post.slug)}`
      const markdown = renderAIDocumentMarkdown(post, sourceURL, { includeDraft: true })
      if (!markdown) throw new Error('文章没有可读取的 B 文。')
      return {
        contents: [{ mimeType: 'text/markdown', text: markdown, uri: uri.href }],
      }
    },
  )

  return server
}
