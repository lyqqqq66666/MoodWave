"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Bell, HeartHandshake, Home, LogOut, Music2, PenLine, Sparkles, UserRound } from "lucide-react"
import { ReactNode, useState } from "react"
import { appNavItems } from "@/lib/moodwave"
import { cn } from "@/lib/utils"
import { MoodWaveLogo } from "./moodwave-logo"
import { useAuthStore } from "@/store/auth"

type MoodWaveShellProps = {
  title?: string
  children: ReactNode
  contentClassName?: string
  rightSlot?: ReactNode
}

export function MoodWaveShell({
  title,
  children,
  contentClassName,
  rightSlot,
}: MoodWaveShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [notice, setNotice] = useState("")

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const sideNavItems = [
    { href: "/dashboard", label: "首页", icon: Home },
    { href: "/mood", label: "情绪录入", icon: PenLine },
    { href: "/analytics", label: "情绪趋势", icon: BarChart3 },
    { href: "/music", label: "治愈音乐", icon: Music2 },
    { href: "/companion", label: "灵音伙伴", icon: Sparkles },
    { href: "/discovery", label: "解忧角", icon: HeartHandshake },
    { href: "/profile", label: "个人主页", icon: UserRound },
  ]

  const displayName = user?.username || "MoodWave 用户"
  const avatarChar = displayName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,210,221,0.8),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(180,242,232,0.65),_transparent_28%),radial-gradient(circle_at_bottom_center,_rgba(212,200,255,0.45),_transparent_30%),linear-gradient(180deg,#fffdf9_0%,#fff8f2_100%)] text-slate-800 lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col overflow-x-hidden lg:h-screen lg:flex-row lg:overflow-hidden">
        <aside className="hidden w-[248px] shrink-0 border-r border-white/60 bg-white/72 px-6 py-8 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
          <MoodWaveLogo href="/dashboard" />
          <nav className="mt-10 space-y-2">
            {sideNavItems.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm transition",
                    active
                      ? "bg-[#fff3f5] text-slate-900 shadow-[0_10px_24px_rgba(255,181,194,0.18)]"
                      : "text-slate-500 hover:bg-white/80 hover:text-slate-800",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto rounded-[28px] bg-white/80 p-4 shadow-[0_12px_30px_rgba(255,214,224,0.24)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-white text-sm font-semibold">
                {avatarChar}
              </div>
              <div>
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-slate-500">今天也值得被温柔接住</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden lg:h-screen">
          <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-white/60 bg-white/70 px-5 py-4 backdrop-blur-xl lg:px-10">
            <div className="flex items-center gap-3">
              <div className="lg:hidden">
                <MoodWaveLogo href="/dashboard" compact markOnly />
              </div>
              {title ? <h1 className="text-lg font-semibold lg:text-2xl">{title}</h1> : null}
            </div>
            <div className="flex items-center gap-3">
              {rightSlot}
              <button
                type="button"
                onClick={() => setNotice("通知中心即将上线，今天先把重要心情留在这里。")}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-[0_8px_24px_rgba(255,192,203,0.18)] transition hover:text-slate-800"
                aria-label="通知"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff7f96]" />
              </button>
              <Link
                href="/profile"
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,192,203,0.18)] lg:hidden"
                aria-label="个人主页"
              >
                {avatarChar}
              </Link>
            </div>
          </header>
          {notice ? (
            <div className="mx-4 mt-4 rounded-[22px] border border-[#d6f3ea] bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_30px_rgba(255,216,225,0.16)] md:mx-6 lg:mx-10">
              {notice}
            </div>
          ) : null}

          <main className={cn("min-w-0 flex-1 overflow-x-hidden px-4 pb-28 pt-5 md:px-6 lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:pb-10", contentClassName)}>
            {children}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/70 bg-white/88 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-4 gap-2">
              {appNavItems.map((item) => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs transition",
                      active
                        ? "bg-gradient-to-r from-[#ff9fb4] to-[#8de1d5] text-white shadow-[0_10px_24px_rgba(255,177,194,0.28)]"
                        : "text-slate-500",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.shortLabel}</span>
                  </Link>
                )
              })}
            </div>
            <Link
              href="/mood"
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff9fb4] via-[#ffbfcb] to-[#8de1d5] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,181,194,0.32)]"
            >
              <Sparkles className="h-4 w-4" />
              记录此刻心情
            </Link>
          </nav>
        </div>
      </div>
    </div>
  )
}
