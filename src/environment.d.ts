declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      POSTGRES_URL?: string
      BLOB_READ_WRITE_TOKEN?: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      VERCEL?: string
      VERCEL_URL?: string
      VERCEL_BRANCH_URL?: string
      MCP_ALLOWED_HOSTS?: string
      MCP_ALLOWED_ORIGINS?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
