import React from "react"
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_SC, Playfair_Display } from 'next/font/google'

import './globals.css'

const _notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
})

const _playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'MoodWave - 情绪日记',
  description: '记录你的情绪流动，发现内心的风景',
}

export const viewport: Viewport = {
  themeColor: '#F8FAFC',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${_notoSansSC.variable} ${_playfair.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
