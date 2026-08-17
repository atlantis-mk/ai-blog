'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpRight } from 'lucide-react'

import {
  classifyDownload,
  type DownloadKind,
  type ProductLink,
} from '@/utilities/productReleaseManifest'

type Device = 'linux' | 'mac-arm64' | 'mac-unknown' | 'mac-x64' | 'unknown' | 'windows'

type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>
  }
}

const readWebGLRenderer = () => {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    const extension = gl?.getExtension('WEBGL_debug_renderer_info')
    return extension ? String(gl?.getParameter(extension.UNMASKED_RENDERER_WEBGL) || '') : ''
  } catch {
    return ''
  }
}

export const detectDevice = ({
  architecture = '',
  platform = '',
  renderer = '',
  userAgent = '',
}: {
  architecture?: string
  platform?: string
  renderer?: string
  userAgent?: string
}): Device => {
  const browser = `${platform} ${userAgent}`.toLowerCase()
  if (/windows|win32|win64/.test(browser)) return 'windows'
  if (/linux|x11/.test(browser) && !/android/.test(browser)) return 'linux'
  if (!/mac|darwin/.test(browser)) return 'unknown'

  // macOS user agents commonly contain "Intel" even on Apple Silicon, so only
  // use architecture and GPU renderer hints for the chip decision.
  const chip = `${architecture} ${renderer}`.toLowerCase()
  if (/arm64|aarch64|apple\s*m\d|apple gpu/.test(chip)) return 'mac-arm64'
  if (/x86|x64|amd64|intel/.test(chip)) return 'mac-x64'
  return 'mac-unknown'
}

const preferredKinds: Record<Device, DownloadKind[]> = {
  linux: ['linux-appimage', 'linux-deb'],
  'mac-arm64': ['mac-arm64'],
  'mac-unknown': [],
  'mac-x64': ['mac-x64'],
  unknown: [],
  windows: ['windows-exe', 'windows-msi'],
}

const deviceLabel: Record<Device, string> = {
  linux: 'Linux',
  'mac-arm64': 'macOS Apple 芯片',
  'mac-unknown': 'macOS',
  'mac-x64': 'macOS Intel',
  unknown: '当前系统',
  windows: 'Windows',
}

export function ProductDownloadActions({
  links,
  version,
}: {
  links: ProductLink[]
  version: string
}) {
  const [device, setDevice] = useState<Device | null>(null)

  useEffect(() => {
    let active = true

    const detect = async () => {
      const browserNavigator = navigator as NavigatorWithUAData
      let architecture = ''
      try {
        const values = await browserNavigator.userAgentData?.getHighEntropyValues?.([
          'architecture',
        ])
        architecture = values?.architecture || ''
      } catch {
        // Continue with renderer and user-agent hints.
      }

      if (active) {
        setDevice(
          detectDevice({
            architecture,
            platform: navigator.platform,
            renderer: readWebGLRenderer(),
            userAgent: navigator.userAgent,
          }),
        )
      }
    }

    void detect()
    return () => {
      active = false
    }
  }, [])

  const selected = useMemo(() => {
    if (!device) return null
    for (const kind of preferredKinds[device]) {
      const match = links.find((link) => classifyDownload(link.label, link.url) === kind)
      if (match) return match
    }
    return null
  }, [device, links])

  const chooseLabel = device === 'mac-unknown' ? '选择 macOS 芯片版本' : '选择下载版本'

  return (
    <div className="mt-8 flex flex-wrap gap-3" id="platform-downloads">
      {selected ? (
        <a
          className="inline-flex items-center gap-2 bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-85"
          href={selected.url}
        >
          <ArrowDownToLine aria-hidden="true" className="size-4" />
          下载 v{version} · {device ? deviceLabel[device] : ''}
        </a>
      ) : (
        <span
          className="inline-flex items-center gap-2 border border-foreground px-5 py-3 text-sm font-medium"
          title="浏览器无法可靠识别时，请从旁边的平台按钮选择，避免下载错误架构。"
        >
          <ArrowDownToLine aria-hidden="true" className="size-4" />
          {device === null ? '正在识别系统…' : chooseLabel}
        </span>
      )}

      {links.map(({ id, label, url }) => (
        <a
          className="inline-flex items-center gap-2 border border-border px-5 py-3 text-sm hover:bg-muted"
          href={url}
          key={id || url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {label}
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      ))}
    </div>
  )
}
