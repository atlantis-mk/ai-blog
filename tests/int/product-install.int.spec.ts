import type { Product, Release } from '@/payload-types'
import { validateInstallDocument } from '@/collections/Products/hooks/validateInstallDocument'
import { validateRelease } from '@/collections/Releases/hooks/validateRelease'
import {
  isProductInstallReady,
  renderProductInstallMarkdown,
} from '@/utilities/productInstallDocument'
import { describe, expect, it } from 'vitest'

const installMarkdown = `# 安装目标

安装示例产品。

# 系统要求

macOS 14 或更新版本。

# 安装步骤

下载安装包并完成安装。

# 首次运行

启动应用并完成权限授权。

# 验证方法

确认应用能够正常打开。

# 卸载或回滚

删除应用并恢复原有配置。`

const product = {
  id: 1,
  title: '示例产品',
  tagline: '简单而强大',
  summary: '用于测试的产品。',
  logo: 1,
  platforms: [{ name: 'macOS' }],
  installDocument: {
    status: 'reviewed',
    version: '1.0',
    riskLevel: 'low',
    requiresApproval: false,
    markdown: installMarkdown,
  },
  slug: 'example-product',
  updatedAt: '2026-07-22T01:00:00.000Z',
  createdAt: '2026-07-22T00:00:00.000Z',
} as Product

const release = {
  id: 1,
  product: 1,
  version: '2.0.0',
  channel: 'stable',
  downloadURL: 'https://downloads.example.com/example.dmg',
  fileSize: '35 MB',
  architecture: 'Universal',
  systemRequirements: 'macOS 14 或更新版本',
  checksumAlgorithm: 'sha256',
  checksum: 'abc123',
  releasedAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T01:00:00.000Z',
  createdAt: '2026-07-22T00:00:00.000Z',
} as Release

describe('Product install document', () => {
  it('renders installation Markdown with current release metadata', () => {
    const markdown = renderProductInstallMarkdown({
      product,
      release,
      serverURL: 'https://example.com',
    })

    expect(markdown).toContain('document_type: "install-and-run"')
    expect(markdown).toContain('release_version: "2.0.0"')
    expect(markdown).toContain('download_url: "https://downloads.example.com/example.dmg"')
    expect(markdown).toContain('# 首次运行')
  })

  it('does not expose draft installation documents', () => {
    const draftProduct = {
      ...product,
      installDocument: {
        ...product.installDocument,
        status: 'draft',
      },
    } as Product

    expect(isProductInstallReady(draftProduct)).toBe(false)
  })

  it('blocks publishing when required installation sections are missing', () => {
    expect(() =>
      validateInstallDocument({
        data: {
          _status: 'published',
          installDocument: {
            status: 'reviewed',
            markdown: '# 安装目标\n\n安装产品。',
          },
        },
      } as never),
    ).toThrow('系统要求、安装步骤、首次运行、验证方法、卸载或回滚')
  })

  it('blocks publishing a release without a download source', () => {
    expect(() =>
      validateRelease({
        data: {
          _status: 'published',
          systemRequirements: 'macOS 14',
        },
      } as never),
    ).toThrow('下载地址')
  })
})
