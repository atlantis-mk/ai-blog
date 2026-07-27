import type { Post } from '@/payload-types'
import { validateAIDocument } from '@/collections/Posts/hooks/validateAIDocument'
import { isAIDocumentReady, renderAIDocumentMarkdown } from '@/utilities/renderAIDocumentMarkdown'
import { describe, expect, it } from 'vitest'

const createPost = (overrides: Partial<Post> = {}) =>
  ({
    aiDocument: {
      compatibility: 'Payload 3.86',
      kind: 'runbook',
      markdown:
        '# 目标\n\n完成任务。\n\n# 前置条件\n\nNode.js。\n\n# 操作步骤\n\n执行命令。\n\n# 验证方法\n\n运行测试。\n\n# 回滚方式\n\n恢复文件。',
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

  it('blocks publishing a runbook without required sections', () => {
    expect(() =>
      validateAIDocument({
        data: {
          _status: 'published',
          aiDocument: {
            kind: 'runbook',
            markdown: '# 目标\n\n完成任务。\n\n# 验证方法\n\n运行测试。',
            status: 'reviewed',
          },
        },
      } as never),
    ).toThrow('前置条件、操作步骤、回滚方式')
  })

  it('requires approval for high-risk documents', () => {
    const post = createPost()

    expect(() =>
      validateAIDocument({
        data: {
          _status: 'published',
          aiDocument: {
            ...post.aiDocument,
            requiresApproval: false,
            riskLevel: 'high',
          },
        },
      } as never),
    ).toThrow('高风险')
  })
})
