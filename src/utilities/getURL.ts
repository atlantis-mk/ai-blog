import canUseDOM from './canUseDOM'

const normalizeURL = (value: string) => {
  const absoluteURL = /^https?:\/\//i.test(value) ? value : `https://${value}`

  return absoluteURL.replace(/\/+$/, '')
}

export const getServerSideURL = () => {
  return normalizeURL(
    process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'http://localhost:3000',
  )
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalizeURL(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  }

  return process.env.NEXT_PUBLIC_SERVER_URL
    ? normalizeURL(process.env.NEXT_PUBLIC_SERVER_URL)
    : ''
}
