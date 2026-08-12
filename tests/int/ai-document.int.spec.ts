import type { Post } from '@/payload-types'
import {
  aiDocumentURLPlaceholder,
  aiPromptTemplate,
  buildAIDocumentPrompt,
} from '@/collections/Posts/aiDocument'
import { validateABPost } from '@/utilities/abPost'
import { isAIDocumentReady, renderAIDocumentMarkdown } from '@/utilities/renderAIDocumentMarkdown'
import { describe, expect, it } from 'vitest'

const createPost = (overrides: Partial<Post> = {}) =>
  ({
    aiDocument: {
      compatibility: 'Payload 3.86',
      kind: 'runbook',
      markdown:
        '# 目标\n\n完成任务。\n\n# 前置条件\n\nNode.js。\n\n# 操作步骤\n\n执行命令。\n\n# 输出结果\n\n生成目标文件。\n\n# 验证方法\n\n运行测试。\n\n# 回滚方式\n\n恢复文件。',
      requiresApproval: false,
      riskLevel: 'low',
      status: 'reviewed',
      version: '1.0',
    },
    createdAt: '2026-07-22T00:00:00.000Z',
    id: 1,
    slug: 'payload-guide',
    title: 'Payload 指南',
    updatedAt: '2026-07-22T01:00:00.000Z',
    ...overrides,
  }) as Post

describe('AI document', () => {
  it('replaces the B document placeholder when building the copyable AI prompt', () => {
    const markdownURL = 'https://example.com/posts/payload-guide/ai.md'
    const prompt = buildAIDocumentPrompt(aiPromptTemplate, markdownURL)

    expect(prompt).toContain(`AI 操作文档：${markdownURL}`)
    expect(prompt).not.toContain(aiDocumentURLPlaceholder)
    expect(prompt).toContain('- SSH 用户：<例如 root>')
  })

  it('renders reviewed documents as Markdown with generated frontmatter', () => {
    const post = createPost()
    const markdown = renderAIDocumentMarkdown(post, 'https://example.com/posts/payload-guide')

    expect(markdown).toContain('title: "Payload 指南"')
    expect(markdown).toContain('risk_level: "low"')
    expect(markdown).toContain('source: "https://example.com/posts/payload-guide"')
    expect(markdown).toContain('# 验证方法')
  })

  it('does not expose draft AI documents', () => {
    const post = createPost({
      aiDocument: {
        ...createPost().aiDocument,
        status: 'draft',
      },
    })

    expect(isAIDocumentReady(post)).toBe(false)
    expect(renderAIDocumentMarkdown(post, 'https://example.com/posts/payload-guide')).toBeNull()
  })

  it('allows a runbook to use its own section structure', () => {
    const report = validateABPost({
      aMarkdown: '# A 文',
      aiDocument: {
        kind: 'runbook',
        markdown: '# 自定义执行说明\n\n完成任务并记录结果。',
        riskLevel: 'low',
        status: 'reviewed',
        version: '1.0',
      },
      mode: 'human-publish',
    })

    expect(report.errors).toEqual([])
    expect(report.readyForPublish).toBe(true)
  })

  it('allows non-runbook B documents without predefined sections', () => {
    const report = validateABPost({
      aMarkdown: '# A 文',
      aiDocument: {
        kind: 'reference',
        markdown: '这是一份不使用标题的知识参考。',
        riskLevel: 'low',
        status: 'reviewed',
        version: '1.0',
      },
      mode: 'human-publish',
    })

    expect(report.errors).toEqual([])
    expect(report.readyForPublish).toBe(true)
  })

  it('requires approval for high-risk documents', () => {
    const post = createPost()
    const report = validateABPost({
      aMarkdown: '# A 文',
      aiDocument: {
        ...post.aiDocument!,
        requiresApproval: false,
        riskLevel: 'high',
      },
      mode: 'human-publish',
    })

    expect(report.errors.join(' ')).toContain('高风险')
  })

  it('can render a draft B document only for authenticated MCP reads', () => {
    const post = createPost({
      aiDocument: {
        ...createPost().aiDocument,
        status: 'draft',
      },
    })

    expect(
      renderAIDocumentMarkdown(post, 'https://example.com/posts/payload-guide', {
        includeDraft: true,
      }),
    ).toContain('status: "draft"')
  })
})
