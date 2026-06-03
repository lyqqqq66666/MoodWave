/**
 * 平台环境检测工具
 *
 * 用于区分 Web / iOS App / Android App / Capacitor 环境
 * 在路由守卫、API 调用、布局切换中广泛使用
 */

function getCapacitorPlatform(): string | null {
  if (typeof window === 'undefined') return null

  const capacitor = (window as any).Capacitor
  if (!capacitor) return null

  if (typeof capacitor.getPlatform === 'function') {
    return capacitor.getPlatform()
  }

  if (typeof capacitor.platform === 'string') {
    return capacitor.platform
  }

  return null
}

/**
 * 是否在 Capacitor App 环境中运行
 *
 * 检测策略：
 * 1. window.location.protocol === 'capacitor:' (Capacitor WebView)
 * 2. window.Capacitor 对象存在 (Capacitor 运行时)
 * 3. 环境变量 NEXT_PUBLIC_APP_TARGET === 'ios' / 'android'
 */
export function isApp(): boolean {
  if (typeof window === 'undefined') return false

  // 检测 1: Capacitor 协议
  if (window.location.protocol === 'capacitor:') return true

  // 检测 2: Capacitor 运行时对象
  if ((window as any).Capacitor !== undefined) return true

  // 检测 3: 环境变量（编译时确定）
  if (process.env.NEXT_PUBLIC_APP_TARGET === 'android') return true
  if (process.env.NEXT_PUBLIC_APP_TARGET === 'ios') return true

  return false
}

/**
 * 是否在 iOS 环境中运行
 */
export function isIOSApp(): boolean {
  if (!isApp()) return false

  const platform = getCapacitorPlatform()
  if (platform === 'ios') return true

  if (typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)) return true

  return process.env.NEXT_PUBLIC_APP_TARGET === 'ios'
}

/**
 * 是否在 Android 环境中运行
 */
export function isAndroid(): boolean {
  if (!isApp()) return false
  const platform = getCapacitorPlatform()
  if (platform === 'android') return true
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) return true
  return process.env.NEXT_PUBLIC_APP_TARGET === 'android'
}

/**
 * 是否在 Web 浏览器环境中运行（非 App）
 */
export function isWeb(): boolean {
  return !isApp()
}

/**
 * 是否在开发环境中运行
 */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * 获取平台名称，用于日志和调试
 */
export function getPlatformName(): string {
  if (isIOSApp()) return 'ios'
  if (isAndroid()) return 'android'
  if (isApp()) return 'app'
  return 'web'
}
