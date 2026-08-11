import { APIError, type CollectionBeforeChangeHook } from 'payload'

import type { Product } from '@/payload-types'
import { validateProductInstallDocument } from '@/utilities/productInstallDocument'

type InstallDocument = {
  markdown?: string | null
  requiresApproval?: boolean | null
  riskLevel?: 'high' | 'low' | 'medium' | null
  status?: 'draft' | 'reviewed' | 'verified' | null
  verifiedAt?: string | null
}

export const validateInstallDocument: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data._status !== 'published') return data

  const installDocument = {
    ...((originalDoc?.installDocument as InstallDocument | null | undefined) || {}),
    ...((data.installDocument as InstallDocument | null | undefined) || {}),
  }
  const report = validateProductInstallDocument(
    { installDocument } as Partial<Product>,
    'admin-publish',
  )
  if (report.errors.length) {
    throw new APIError(`发布产品前：${report.errors.join(' ')}`, 400, null, true)
  }

  if (installDocument.status === 'verified' && !installDocument.verifiedAt) {
    data.installDocument = {
      ...installDocument,
      verifiedAt: new Date().toISOString(),
    }
  }

  return data
}
