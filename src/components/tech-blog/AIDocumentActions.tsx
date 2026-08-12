'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

type Props = {
  markdownURL: string
}

export function AIDocumentActions({ markdownURL }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timeout = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const copyLink = async () => {
    const absoluteURL = new URL(markdownURL, window.location.origin).href
    await navigator.clipboard.writeText(absoluteURL)
    setCopied(true)
  }

  const actionClassName =
    'inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] transition-colors hover:bg-muted'

  return (
    <div className="flex flex-wrap gap-2">
      <button className={actionClassName} onClick={copyLink} type="button">
        {copied ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        {copied ? '已复制' : '复制链接'}
      </button>
    </div>
  )
}
