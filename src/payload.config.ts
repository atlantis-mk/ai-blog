import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { zh } from '@payloadcms/translations/languages/zh'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Agents } from './collections/Agents'
import { Media } from './collections/Media'
import { MCPAuditLogs } from './collections/MCPAuditLogs'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Products } from './collections/Products'
import { Releases } from './collections/Releases'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const databaseURL = process.env.POSTGRES_URL || process.env.DATABASE_URL || 'file:./.db'
const usesPostgres = /^postgres(?:ql)?:\/\//.test(databaseURL)
const isVercel = Boolean(process.env.VERCEL)

if (isVercel && !usesPostgres) {
  throw new Error('Vercel deployment requires POSTGRES_URL or a PostgreSQL DATABASE_URL.')
}

if (isVercel && !process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('Vercel deployment requires BLOB_READ_WRITE_TOKEN for persistent media storage.')
}

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  i18n: {
    fallbackLanguage: 'zh',
    supportedLanguages: { zh },
    translations: {
      zh: {
        'plugin-redirects': {
          customUrl: '自定义 URL',
          documentToRedirect: '跳转到的内容',
          fromUrl: '来源 URL',
          internalLink: '内部链接',
          redirectType: '重定向类型',
          toUrlType: '目标 URL 类型',
        },
      },
    },
  },
  db: usesPostgres
    ? vercelPostgresAdapter({
        migrationDir: path.resolve(dirname, 'migrations-postgres'),
        pool: {
          connectionString: databaseURL,
        },
      })
    : sqliteAdapter({
        client: {
          url: databaseURL,
        },
        // Keep the existing local SQLite database and migrations available for development.
        migrationDir: path.resolve(dirname, 'migrations'),
        push: false,
      }),
  collections: [Pages, Posts, Products, Releases, Media, Categories, Users, Agents, MCPAuditLogs],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins: [
    ...plugins,
    vercelBlobStorage({
      alwaysInsertFields: true,
      clientUploads: true,
      collections: {
        media: true,
      },
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user?.collection === Users.slug) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
