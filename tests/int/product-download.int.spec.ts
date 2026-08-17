import { classifyDownload, resolveLatestProductLinks } from '@/utilities/productReleaseManifest'
import { detectDevice } from '@/components/products/ProductDownloadActions'
import { describe, expect, it } from 'vitest'

const oldIntelURL = 'https://cdn.example.com/tool/releases/v0.1.1/Tool-0.1.1-mac-x64.dmg'

describe('Product downloads', () => {
  it('selects macOS Intel without falling back to ARM', () => {
    expect(
      detectDevice({
        architecture: 'x86',
        platform: 'MacIntel',
        renderer: 'Intel Iris OpenGL Engine',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      }),
    ).toBe('mac-x64')
  })

  it('selects Apple Silicon when the renderer exposes an Apple chip', () => {
    expect(
      detectDevice({
        platform: 'MacIntel',
        renderer: 'Apple M3',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      }),
    ).toBe('mac-arm64')
  })

  it('does not mistake the compatibility macOS user agent for an Intel chip', () => {
    expect(
      detectDevice({
        platform: 'MacIntel',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      }),
    ).toBe('mac-unknown')
  })

  it('classifies installers by operating system and architecture', () => {
    expect(classifyDownload('macOS Intel', oldIntelURL)).toBe('mac-x64')
    expect(classifyDownload('Windows x64', 'https://cdn.example.com/tool-win-x64.exe')).toBe(
      'windows-exe',
    )
  })

  it('replaces every versioned platform link with the latest manifest version', () => {
    const links = resolveLatestProductLinks(
      [
        { label: 'macOS Intel', url: oldIntelURL },
        {
          label: '全部版本',
          url: 'https://github.com/example/tool/releases/tag/v0.1.1',
        },
      ],
      {
        assets: [
          {
            name: 'Tool-0.1.2-mac-x64.dmg',
            url: 'https://cdn.example.com/tool/releases/v0.1.2/Tool-0.1.2-mac-x64.dmg',
          },
        ],
        githubRelease: 'https://github.com/example/tool/releases/tag/v0.1.2',
        version: '0.1.2',
      },
    )

    expect(links[0]?.url).toContain('/v0.1.2/Tool-0.1.2-mac-x64.dmg')
    expect(links[1]?.url).toBe('https://github.com/example/tool/releases/tag/v0.1.2')
  })
})
