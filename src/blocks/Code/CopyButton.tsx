'use client'
import { Copy } from 'lucide-react'
import { useState } from 'react'

export function CopyButton({ code }: { code: string }) {
  const [text, setText] = useState('复制')

  function updateCopyStatus() {
    if (text === '复制') {
      setText(() => '已复制')
      setTimeout(() => {
        setText(() => '复制')
      }, 1000)
    }
  }

  return (
    <div className="absolute right-3 top-3">
      <button
        className="inline-flex items-center gap-1.5 border border-white/20 px-2 py-1 font-mono text-[10px] text-zinc-300 hover:border-white/50 hover:text-white"
        onClick={async () => {
          await navigator.clipboard.writeText(code)
          updateCopyStatus()
        }}
      >
        {text}
        <Copy className="size-3" />
      </button>
    </div>
  )
}
