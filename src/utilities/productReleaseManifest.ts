import type { Product, Release } from '@/payload-types'

export type ProductLink = {
  id?: null | string
  label: string
  url: string
}

type ManifestAsset = {
  name: string
  url: string
}

export type ProductReleaseManifest = {
  assets: ManifestAsset[]
  githubRelease?: string
  version: string
}

export type DownloadKind =
  'linux-appimage' | 'linux-deb' | 'mac-arm64' | 'mac-x64' | 'windows-exe' | 'windows-msi' | null

const manifestVersion = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/^v/, '') : ''

export const classifyDownload = (label: string, url: string): DownloadKind => {
  const value = `${label} ${url}`.toLowerCase()

  if (/mac|darwin/.test(value)) {
    if (/arm64|aarch64|apple\s*(silicon|芯片)/.test(value)) return 'mac-arm64'
    if (/x64|x86_64|intel/.test(value)) return 'mac-x64'
  }
  if (/windows|win-x64|windows-x86_64/.test(value)) {
    if (/\.msi(?:$|[?#])/.test(value)) return 'windows-msi'
    if (/\.exe(?:$|[?#])/.test(value)) return 'windows-exe'
  }
  if (/linux/.test(value)) {
    if (/appimage/.test(value)) return 'linux-appimage'
    if (/\.deb(?:$|[?#])/.test(value)) return 'linux-deb'
  }

  return null
}

const updateVersionInURL = (url: string, version: string) => {
  try {
    const parsed = new URL(url)
    const releaseAsset = parsed.pathname.match(/\/releases\/v([^/]+)\/([^/]+)$/)

    if (releaseAsset) {
      const [, previousVersion, filename] = releaseAsset
      parsed.pathname = parsed.pathname.replace(
        `/releases/v${previousVersion}/${filename}`,
        `/releases/v${version}/${filename.replaceAll(previousVersion, version)}`,
      )
      return parsed.toString()
    }

    if (/\/releases\/tag\/v[^/]+\/?$/.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(
        /\/releases\/tag\/v[^/]+\/?$/,
        `/releases/tag/v${version}`,
      )
      return parsed.toString()
    }
  } catch {
    return url
  }

  return url
}

export const resolveLatestProductLinks = (
  links: ProductLink[],
  manifest: ProductReleaseManifest | null,
) => {
  if (!manifest) return links

  const assetsByKind = new Map<Exclude<DownloadKind, null>, ManifestAsset>()
  for (const asset of manifest.assets) {
    const kind = classifyDownload(asset.name, asset.url)
    if (kind && !assetsByKind.has(kind)) assetsByKind.set(kind, asset)
  }

  return links.map((link) => {
    const kind = classifyDownload(link.label, link.url)
    const manifestAsset = kind ? assetsByKind.get(kind) : undefined
    const url = manifestAsset?.url || updateVersionInURL(link.url, manifest.version)
    const label = link.label.replace(/v?\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?/gi, `v${manifest.version}`)

    if (manifest.githubRelease && /\/releases\/tag\//.test(link.url)) {
      return { ...link, label, url: manifest.githubRelease }
    }

    return { ...link, label, url }
  })
}

const getManifestCandidates = (product: Product, release: null | Release) => {
  const candidates = new Set<string>()

  for (const link of product.links || []) {
    if (/\/latest\.json(?:$|[?#])/.test(link.url)) candidates.add(link.url)
  }

  const downloadURL = release?.downloadURL
  if (downloadURL) {
    try {
      const parsed = new URL(downloadURL)
      const match = parsed.pathname.match(/^(.*)\/releases\/v[^/]+\/[^/]+$/)
      if (match?.[1]) candidates.add(`${parsed.origin}${match[1]}/latest.json`)
    } catch {
      // A relative CMS download URL cannot identify an external manifest.
    }
  }

  return [...candidates]
}

const parseManifest = (value: unknown): ProductReleaseManifest | null => {
  if (!value || typeof value !== 'object') return null

  const data = value as Record<string, unknown>
  const version = manifestVersion(data.version)
  if (!version) return null

  const assets = Array.isArray(data.assets)
    ? data.assets.flatMap((item): ManifestAsset[] => {
        if (!item || typeof item !== 'object') return []
        const asset = item as Record<string, unknown>
        if (typeof asset.name !== 'string' || typeof asset.url !== 'string') return []
        return [{ name: asset.name, url: asset.url }]
      })
    : []

  return {
    assets,
    githubRelease: typeof data.githubRelease === 'string' ? data.githubRelease : undefined,
    version,
  }
}

export const getLatestProductReleaseManifest = async (
  product: Product,
  release: null | Release,
) => {
  for (const url of getManifestCandidates(product, release)) {
    try {
      const response = await fetch(url, { next: { revalidate: 300 } })
      if (!response.ok) continue
      const manifest = parseManifest(await response.json())
      if (manifest) return manifest
    } catch {
      // Fall back to the published CMS release when R2 is temporarily unavailable.
    }
  }

  return null
}
