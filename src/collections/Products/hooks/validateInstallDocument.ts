import { APIError, type CollectionBeforeChangeHook } from 'payload'

type InstallDocument = {
  markdown?: string | null
  requiresApproval?: boolean | null
  riskLevel?: 'high' | 'low' | 'medium' | null
  status?: 'draft' | 'reviewed' | 'verified' | null
  verifiedAt?: string | null
}

const requiredHeadings = ['安装目标', '系统要求', '安装步骤', '首次运行', '验证方法', '卸载或回滚']

const hasHeading = (markdown: string, heading: string) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^#{1,6}\\s+${escapedHeading}\\s*$`, 'm').test(markdown)
}

export const validateInstallDocument: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data._status !== 'published') return data

  const installDocument = {
    ...((originalDoc?.installDocument as InstallDocument | null | undefined) || {}),
    ...((data.installDocument as InstallDocument | null | undefined) || {}),
  }
  const markdown = installDocument.markdown?.trim() || ''

  if (!markdown) {
    throw new APIError('发布产品前必须填写 AI 安装运行文档。', 400, null, true)
  }

  if (installDocument.status !== 'reviewed' && installDocument.status !== 'verified') {
    throw new APIError('发布产品前，AI 安装运行文档必须标记为“已审核”或“已验证”。', 400, null, true)
  }

  const missingHeadings = requiredHeadings.filter((heading) => !hasHeading(markdown, heading))
  if (missingHeadings.length) {
    throw new APIError(
      `AI 安装运行文档缺少必要章节：${missingHeadings.join('、')}。`,
      400,
      null,
      true,
    )
  }

  if (installDocument.riskLevel === 'high' && !installDocument.requiresApproval) {
    throw new APIError('高风险安装文档必须启用“执行前需要人工确认”。', 400, null, true)
  }

  if (installDocument.status === 'verified' && !installDocument.verifiedAt) {
    data.installDocument = {
      ...installDocument,
      verifiedAt: new Date().toISOString(),
    }
  }

  return data
}
