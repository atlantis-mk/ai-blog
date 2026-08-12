'use client'

import { buildAIDocumentPrompt } from '@/collections/Posts/aiDocument'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = {
  markdownURL: string
  promptTemplate?: string | null
}

type CopiedAction = 'link' | 'prompt'

export function AIDocumentActions({ markdownURL, promptTemplate }: Props) {
  const [copiedAction, setCopiedAction] = useState<CopiedAction | null>(null)

  useEffect(() => {
    if (!copiedAction) return

    const timeout = window.setTimeout(() => setCopiedAction(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [copiedAction])

  const getAbsoluteURL = () => new URL(markdownURL, window.location.origin).href

  const copyLink = async () => {
    await navigator.clipboard.writeText(getAbsoluteURL())
    setCopiedAction('link')
  }

  const copyPrompt = async () => {
    if (!promptTemplate) return

    await navigator.clipboard.writeText(buildAIDocumentPrompt(promptTemplate, getAbsoluteURL()))
    setCopiedAction('prompt')
  }

  const actionClassName =
    'inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] transition-colors hover:bg-muted'

  return (
    <div className="flex flex-wrap gap-2">
      <button className={actionClassName} onClick={copyLink} type="button">
        {copiedAction === 'link' ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        {copiedAction === 'link' ? '已复制链接' : '复制链接'}
      </button>
      {promptTemplate && (
        <button className={actionClassName} onClick={copyPrompt} type="button">
          {copiedAction === 'prompt' ? (
            <Check aria-hidden="true" className="size-3.5" />
          ) : (
            <Copy aria-hidden="true" className="size-3.5" />
          )}
          {copiedAction === 'prompt' ? '已复制提示词' : '复制提示词'}
        </button>
      )}
    </div>
  )
}
