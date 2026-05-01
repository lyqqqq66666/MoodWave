/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || ''

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 静态导出模式（服务器 Nginx 托管）
  output: 'export',
  images: { unoptimized: true },

  env: {
    NEXT_PUBLIC_API_URL,
  },
}

module.exports = withPWA(nextConfig)
