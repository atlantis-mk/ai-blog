'use client'

import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/providers/Theme'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      className="inline-flex size-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      type="button"
    >
      {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </button>
  )
}
