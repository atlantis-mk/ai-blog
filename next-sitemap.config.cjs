const normalizeURL = (value) => {
  const absoluteURL = /^https?:\/\//i.test(value) ? value : `https://${value}`

  return absoluteURL.replace(/\/+$/, '')
}

const SITE_URL = normalizeURL(
  process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    'http://localhost:3000',
)

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: [
    '/posts-sitemap.xml',
    '/pages-sitemap.xml',
    '/products-sitemap.xml',
    '/*',
    '/posts/*',
    '/products/*',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        disallow: '/admin/*',
      },
    ],
    additionalSitemaps: [
      `${SITE_URL}/pages-sitemap.xml`,
      `${SITE_URL}/posts-sitemap.xml`,
      `${SITE_URL}/products-sitemap.xml`,
    ],
  },
}
