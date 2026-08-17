'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType }> = () => {
  return (
    <nav aria-label="主导航" className="flex items-center gap-4 text-sm text-muted-foreground">
      <Link className="hover:text-foreground" href="/posts">
        文章
      </Link>
      <Link className="hover:text-foreground" href="/products">
        产品
      </Link>
      <Link className="inline-flex items-center gap-1.5 hover:text-foreground" href="/search">
        <SearchIcon className="size-3.5" />
        搜索
      </Link>
    </nav>
  )
}
