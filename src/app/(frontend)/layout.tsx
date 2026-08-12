import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/utilities/siteMetadata'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable)}
      lang="zh-CN"
      suppressHydrationWarning
    >
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <link href="/brand/aiblog-mark.svg" rel="apple-touch-icon" />
      </head>
      <body>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  twitter: {
    card: 'summary_large_image',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      ...(process.env.BAIDU_SITE_VERIFICATION
        ? { 'baidu-site-verification': process.env.BAIDU_SITE_VERIFICATION }
        : {}),
      ...(process.env.BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
        : {}),
    },
  },
}
