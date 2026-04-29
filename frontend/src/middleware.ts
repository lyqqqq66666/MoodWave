import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 需要登录才能访问的路由
const PROTECTED_PATHS = [
  "/dashboard",
  "/mood",
  "/analytics",
  "/music",
  "/discovery",
  "/profile",
]

// 已登录时不能访问的路由（重定向到 dashboard）
const AUTH_PATHS = ["/login"]

// Cookie 名（与 auth store 同步）
const AUTH_COOKIE = "moodwave_token"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 从 cookie 读取 token（服务端可读）
  const token = request.cookies.get(AUTH_COOKIE)?.value
  const hasToken = Boolean(token && token.length > 0)

  // 路由守卫：未登录 → 跳转登录页
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
