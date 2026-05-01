/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const isStaticExport = process.env.NEXT_OUTPUT === 'export'

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 本地开发使用 Next dev server；需要静态导出时运行 NEXT_OUTPUT=export npm run build。
  ...(isStaticExport ? { output: 'export' } : {}),
  images: { unoptimized: true },

  env: {
    NEXT_PUBLIC_API_URL,
  },
}

module.exports = withPWA(nextConfig)
