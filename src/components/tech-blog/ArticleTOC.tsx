'use client'

import { useEffect, useState } from 'react'

type TocItem = {
  id: string
  level: number
  text: string
}

export function ArticleTOC() {
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('[data-article-content] h2, [data-article-content] h3'),
    )

    setItems(
      headings.map((heading, index) => {
        const id = heading.id || `section-${index + 1}`
        heading.id = id
        return {
          id,
          level: Number(heading.tagName.slice(1)),
          text: heading.textContent?.trim() || `章节 ${index + 1}`,
        }
      }),
    )
  }, [])

  if (!items.length) return null

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 border-l border-border pl-5">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          本页目录
        </p>
        <nav aria-label="文章目录" className="space-y-2">
          {items.map((item) => (
            <a
              className={`block text-sm leading-5 text-muted-foreground hover:text-foreground ${
                item.level === 3 ? 'pl-3' : ''
              }`}
              href={`#${item.id}`}
              key={item.id}
            >
              {item.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
