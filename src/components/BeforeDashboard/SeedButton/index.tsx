'use client'

import React, { Fragment, useCallback, useState } from 'react'
import { toast } from '@payloadcms/ui'

import './index.scss'

const SuccessMessage: React.FC = () => (
  <div>
    示例数据已生成！现在可以{' '}
    <a target="_blank" href="/">
      访问网站
    </a>
  </div>
)

export const SeedButton: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (seeded) {
        toast.info('示例数据已经生成过了。')
        return
      }
      if (loading) {
        toast.info('正在生成示例数据。')
        return
      }
      if (error) {
        toast.error('发生错误，请刷新页面后重试。')
        return
      }

      setLoading(true)

      try {
        toast.promise(
          new Promise((resolve, reject) => {
            try {
              fetch('/next/seed', { method: 'POST', credentials: 'include' })
                .then((res) => {
                  if (res.ok) {
                    resolve(true)
                    setSeeded(true)
                  } else {
                    reject('生成示例数据时发生错误。')
                  }
                })
                .catch((error) => {
                  reject(error)
                })
            } catch (error) {
              reject(error)
            }
          }),
          {
            loading: '正在生成示例数据……',
            success: <SuccessMessage />,
            error: '生成示例数据时发生错误。',
          },
        )
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        setError(error)
      }
    },
    [loading, seeded, error],
  )

  let message = ''
  if (loading) message = '（生成中……）'
  if (seeded) message = '（完成）'
  if (error) message = `（错误：${error}）`

  return (
    <Fragment>
      <button className="seedButton" onClick={handleClick}>
        生成示例数据
      </button>
      {message}
    </Fragment>
  )
}
