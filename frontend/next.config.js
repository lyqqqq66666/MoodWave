/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // 缓存 HTML 页面导航请求（网络优先，离线回退缓存）
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
      },
    },
    // 静态资源：缓存优先
    {
      urlPattern: /\.(?:js|css|woff2?|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
      },
    },
    // 图片：过期优先（后台更新）
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'images-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
      },
    },
    // API 请求：不缓存（始终走网络）
    {
      urlPattern: /\/api\/.*/,
      handler: 'NetworkOnly',
    },
  ],
})

const isStaticExport = process.env.NEXT_OUTPUT === 'export'

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 本地开发使用 Next dev server；需要静态导出时运行 NEXT_OUTPUT=export npm run build。
  ...(isStaticExport ? { output: 'export' } : {}),
  images: { unoptimized: true },

  // 不再手动覆盖 NEXT_PUBLIC_*，让 Next.js 自动从 .env.local / .env.development 读取
}

module.exports = withPWA(nextConfig)
