/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
// 前端 JS 使用的 API 地址：Vercel 上为空（相对路径走代理），本地为 localhost
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000')

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL,
  },

  // Vercel 服务端代理：浏览器 HTTPS → Vercel → 后端 HTTP
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
