'use client'
import Link from 'next/link'
import React from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/tech-blog/ThemeToggle'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  return (
    <header className="border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link aria-label="AIBLOG 首页" href="/">
          <Logo loading="eager" priority="high" />
        </Link>
        <div className="flex items-center gap-5">
          <HeaderNav data={data} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
