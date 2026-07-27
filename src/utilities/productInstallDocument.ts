import type { Product, Release } from '@/payload-types'

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
