import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ==================== 路由分组 ====================

// 需要登录的云端/社区路由。基础 App 页面已支持游客兜底，Web/WAP 也放行。
const PROTECTED_PATHS = [
  "/discovery",
]

// App 模式下仍需登录的路由（始终保护）
const LOGIN_REQUIRED_PATHS = [
  "/discovery",
]

// 已登录时不能访问的路由（重定向到 dashboard）
const AUTH_PATHS = ["/login"]

// Cookie 名（与 auth store 同步）
const AUTH_COOKIE = "moodwave_token"

// 环境变量：区分 App/Web 模式
const IS_APP_MODE = process.env.NEXT_PUBLIC_APP_TARGET === "android"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 从 cookie 读取 token（服务端可读）
  const token = request.cookies.get(AUTH_COOKIE)?.value
  const hasToken = Boolean(token && token.length > 0)

  // ==================== App 模式守卫 ====================
  if (IS_APP_MODE) {
    // 检查是否在「始终需要登录」的路由
    const isLoginRequired = LOGIN_REQUIRED_PATHS.some((p) =>
      pathname.startsWith(p)
    )

    if (isLoginRequired && !hasToken) {
      // 灵音伙伴/分析/社区 → 重定向到登录页
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // 其他路由（游客允许的）→ 放行
    // 已登录访问登录页 → 跳转 dashboard
    const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))
    if (isAuthPage && hasToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return NextResponse.next()
  }

  // ==================== Web 模式守卫（原逻辑） ====================
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (isProtected && !hasToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 已登录访问登录页 → 跳转 dashboard
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p))
  if (isAuthPage && hasToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|public|api/).*)",
  ],
}
