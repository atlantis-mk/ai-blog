import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AIDocumentActions } from '@/components/tech-blog/AIDocumentActions'

afterEach(cleanup)

describe('AI document actions', () => {
  it('does not show the prompt button when no prompt is configured', () => {
    render(createElement(AIDocumentActions, { markdownURL: '/posts/payload-guide/ai.md' }))

    expect(screen.queryByRole('button', { name: '复制提示词' })).toBeNull()
    expect(screen.getByRole('button', { name: '复制链接' })).toBeTruthy()
  })

  it('copies the customized prompt with the absolute B document URL', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      createElement(AIDocumentActions, {
        markdownURL: '/posts/payload-guide/ai.md',
        promptTemplate: 'AI 操作文档：<粘贴链接>\nSSH 用户：<例如 root>',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: '复制提示词' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `AI 操作文档：${window.location.origin}/posts/payload-guide/ai.md\nSSH 用户：<例如 root>`,
      ),
    )
    expect(screen.getByRole('button', { name: '已复制提示词' })).toBeTruthy()
  })
})
