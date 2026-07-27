import Link from 'next/link'
import React from 'react'

import { Logo } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/tech-blog/ThemeToggle'

export async function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="container flex flex-col gap-5 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <Link aria-label="AIBLOG 首页" href="/">
          <Logo loading="lazy" />
        </Link>
        <div className="flex items-center gap-4">
          <span>持续记录，持续构建。</span>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
