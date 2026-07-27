import { APIError, type CollectionBeforeChangeHook } from 'payload'

type ReleaseData = {
  downloadURL?: string | null
  file?: number | Record<string, unknown> | null
  releasedAt?: string | null
  systemRequirements?: string | null
}

export const validateRelease: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const release = {
    ...((originalDoc as ReleaseData | null | undefined) || {}),
    ...((data as ReleaseData | null | undefined) || {}),
  }

  if (!release.releasedAt) {
    data.releasedAt = new Date().toISOString()
  }

  if (data._status !== 'published') return data

  if (!release.downloadURL && !release.file) {
    throw new APIError('发布版本前必须填写外部下载地址或上传安装文件。', 400, null, true)
  }

  if (!release.systemRequirements?.trim()) {
    throw new APIError('发布版本前必须填写系统要求。', 400, null, true)
  }

  return data
}
