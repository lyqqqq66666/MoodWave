import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MoodWave - 情绪日记与可视化音乐',
  description: '记录你的情绪，发现音乐的力量',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
