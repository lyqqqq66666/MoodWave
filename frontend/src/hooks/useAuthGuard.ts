/**
 * 客户端路由守卫 Hook
 *
 * 在 React 组件内检查登录状态，用于：
 * - App 模式下显示「登录后解锁」提示（而非重定向）
 * - 条件渲染：已登录显示完整功能，未登录显示游客 UI
 * - 灵音伙伴/分析/社区等需要登录的功能
 */

"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import { isApp } from "@/lib/platform"

interface AuthGuardOptions {
  /** 是否要求登录，默认 false */
  requireAuth?: boolean
  /** 未登录时的重定向路径，默认 '/login' */
  redirectTo?: string
  /** 是否在未登录时静默（不重定向，只返回状态），默认 false */
  silent?: boolean
}

interface AuthGuardResult {
  /** 是否已登录 */
  isAuthenticated: boolean
  /** 是否在 App 环境 */
  isAppMode: boolean
  /** 是否是游客（未登录但可访问） */
  isGuest: boolean
  /** 跳转到登录页 */
  redirectToLogin: (returnUrl?: string) => void
}

export function useAuthGuard(options: AuthGuardOptions = {}): AuthGuardResult {
  const {
    requireAuth = false,
    redirectTo = "/login",
    silent = false,
  } = options

  const router = useRouter()
  const appMode = isApp()

  // 从 Zustand store 或 localStorage 读取登录状态
  // 这里用简单的 localStorage 检查（与 api.ts 保持一致）
  const isAuthenticated = useMemo(() => {
    if (typeof window === "undefined") return false
    try {
      const authData = localStorage.getItem("moodwave-auth")
      if (authData) {
        const { state } = JSON.parse(authData)
        return Boolean(state?.token)
      }
    } catch {
      // ignore
    }
    return false
  }, [])

  const isGuest = !isAuthenticated

  const redirectToLogin = useCallback((returnUrl?: string) => {
    const url = new URL(redirectTo, window.location.origin)
    if (returnUrl) {
      url.searchParams.set("redirect", returnUrl)
    }
    router.push(url.pathname + url.search)
  }, [redirectTo, router])

  useEffect(() => {
    // 如果要求登录且未登录，且不是静默模式，则重定向
    if (requireAuth && !isAuthenticated && !silent && !appMode && typeof window !== "undefined") {
      redirectToLogin(window.location.pathname)
    }
  }, [appMode, isAuthenticated, redirectToLogin, requireAuth, silent])

  return {
    isAuthenticated,
    isAppMode: appMode,
    isGuest,
    redirectToLogin,
  }
}
