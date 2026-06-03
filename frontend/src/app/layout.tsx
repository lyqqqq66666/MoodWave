import type { Metadata, Viewport } from 'next'
import './globals.css'
import '../styles/ios-theme.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF97AD',
}

export const metadata: Metadata = {
  title: 'MoodWave 灵音 — 情绪日记与可视化音乐',
  description: '记录情绪的潮汐，遇见内心的风景',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '灵音',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
