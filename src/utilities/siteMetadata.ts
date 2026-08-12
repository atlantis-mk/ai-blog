export const SITE_NAME = 'AIBLOG'

export const SITE_TITLE = 'AIBLOG — 极客 AI 教程'

export const SITE_DESCRIPTION = '让 AI 能照着执行，也让人类看懂过程的实用教程。'

export const formatSiteTitle = (title?: string | null) =>
  title && title !== SITE_NAME && title !== SITE_TITLE ? `${title} | ${SITE_NAME}` : SITE_TITLE
