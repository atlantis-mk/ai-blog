import type { Product, Release } from '@/payload-types'

export const requiredInstallDocumentHeadings = [
  '安装目标',
  '系统要求',
  '安装步骤',
  '首次运行',
  '验证方法',
  '卸载或回滚',
] as const

const hasHeading = (markdown: string, heading: string) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^#{1,6}\\s+${escapedHeading}\\s*$`, 'm').test(markdown)
}

export const validateProductInstallDocument = (
  product: Partial<Product> | null | undefined,
  mode: 'admin-publish' | 'draft' | 'mcp-publish' = 'draft',
) => {
  const installDocument = product?.installDocument
  const markdown = installDocument?.markdown?.trim() || ''
  const errors: string[] = []
  const warnings: string[] = []

  if (!markdown) {
    errors.push('必须填写 AI 安装运行文档。')
  } else {
    const missingHeadings = requiredInstallDocumentHeadings.filter(
      (heading) => !hasHeading(markdown, heading),
    )
    if (missingHeadings.length) {
      errors.push(`AI 安装运行文档缺少必要章节：${missingHeadings.join('、')}。`)
    }
  }

  if (installDocument?.riskLevel === 'high' && !installDocument.requiresApproval) {
    errors.push('高风险安装文档必须启用“执行前需要人工确认”。')
  }

  if (mode !== 'draft') {
    if (installDocument?.status !== 'reviewed' && installDocument?.status !== 'verified') {
      errors.push('AI 安装运行文档必须由后台人工标记为“已审核”或“已验证”。')
    }
    if (mode === 'mcp-publish' && installDocument?.riskLevel === 'high') {
      errors.push('高风险软件产品不能通过 MCP 发布，必须由后台人工发布。')
    }
  } else if (installDocument?.status === 'draft') {
    warnings.push('安装文档仍是草稿，发布前需要后台人工审核。')
  }

  return {
    errors,
    readyForMCPPublish: mode === 'mcp-publish' && errors.length === 0,
    readyForReview: errors.length === 0 || (mode === 'draft' && !errors.length),
    warnings,
  }
}

const yamlValue = (value: boolean | string | null | undefined) => {
  if (typeof value === 'boolean') return String(value)
  return JSON.stringify(value || '')
}

export const isProductInstallReady = (product: Partial<Product> | null | undefined) => {
  const installDocument = product?.installDocument

  return Boolean(
    installDocument?.markdown?.trim() &&
    (installDocument.status === 'reviewed' || installDocument.status === 'verified'),
  )
}

export const getReleaseDownloadURL = (release: Partial<Release> | null | undefined) => {
  if (release?.downloadURL) return release.downloadURL

  if (release?.file && typeof release.file === 'object' && release.file.url) {
    return release.file.url
  }

  return null
}

const absoluteURL = (url: string | null, serverURL: string) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url

  return `${serverURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

export const renderProductInstallMarkdown = ({
  product,
  release,
  serverURL,
}: {
  product: Product
  release: Release
  serverURL: string
}) => {
  if (!isProductInstallReady(product)) return null

  const installDocument = product.installDocument!
  const sourceURL = `${serverURL.replace(/\/$/, '')}/products/${encodeURIComponent(product.slug)}`
  const downloadURL = absoluteURL(getReleaseDownloadURL(release), serverURL)
  const platforms = product.platforms?.map(({ name }) => name).filter(Boolean) || []

  const frontmatter = [
    '---',
    `product: ${yamlValue(product.title)}`,
    `slug: ${yamlValue(product.slug)}`,
    'document_type: "install-and-run"',
    `document_version: ${yamlValue(installDocument.version || '1.0')}`,
    `status: ${yamlValue(installDocument.status)}`,
    `risk_level: ${yamlValue(installDocument.riskLevel || 'low')}`,
    `requires_approval: ${yamlValue(Boolean(installDocument.requiresApproval))}`,
    `platforms: ${JSON.stringify(platforms)}`,
    `release_version: ${yamlValue(release.version)}`,
    `release_channel: ${yamlValue(release.channel || 'stable')}`,
    `download_url: ${yamlValue(downloadURL)}`,
    `file_size: ${yamlValue(release.fileSize)}`,
    `architecture: ${yamlValue(release.architecture)}`,
    `system_requirements: ${yamlValue(release.systemRequirements)}`,
    `checksum_algorithm: ${yamlValue(release.checksumAlgorithm)}`,
    `checksum: ${yamlValue(release.checksum)}`,
    `released_at: ${yamlValue(release.releasedAt)}`,
    `verified_at: ${yamlValue(installDocument.verifiedAt)}`,
    `source: ${yamlValue(sourceURL)}`,
    '---',
  ].join('\n')

  return `${frontmatter}\n\n${installDocument.markdown!.trim()}\n`
}
