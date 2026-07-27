import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, className } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden="true"
        width={32}
        height={32}
        loading={loading}
        fetchPriority={priority}
        decoding="async"
        className="size-7 object-contain dark:invert"
        src="/brand/aiblog-mark.svg"
      />
      <span className="font-mono text-sm font-medium tracking-[-0.08em]">/ AIBLOG</span>
    </span>
  )
}
