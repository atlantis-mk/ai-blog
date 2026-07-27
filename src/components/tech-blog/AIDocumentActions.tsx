'use client'

import { Check, Copy, Download, FileText } from 'lucide-react'
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

  const copyMarkdown = async () => {
    const response = await fetch(markdownURL)
    if (!response.ok) return

    await navigator.clipboard.writeText(await response.text())
    setCopied(true)
  }

  const actionClassName =
    'inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] transition-colors hover:bg-muted'

  return (
    <div className="flex flex-wrap gap-2">
      <a className={actionClassName} href={markdownURL} rel="alternate" target="_blank">
        <FileText aria-hidden="true" className="size-3.5" />
        查看 Markdown
      </a>
      <button className={actionClassName} onClick={copyMarkdown} type="button">
        {copied ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        {copied ? '已复制' : '复制给 AI'}
      </button>
      <a className={actionClassName} download href={markdownURL}>
        <Download aria-hidden="true" className="size-3.5" />
        下载 .md
      </a>
    </div>
  )
}
