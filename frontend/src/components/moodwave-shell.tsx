"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, Bell, HeartHandshake, Home, LogOut, Music2, PenLine, Sparkles, UserRound } from "lucide-react"
import { ReactNode, useState } from "react"
import { appNavItems } from "@/lib/moodwave"
import { cn } from "@/lib/utils"
import { resolveAssetUrl } from "@/lib/api"
import { isApp } from "@/lib/platform"
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
  const appMode = isApp()

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

  const displayName = user?.username || (appMode ? "游客模式" : "MoodWave 用户")
  const avatarChar = displayName.charAt(0).toUpperCase()
  const avatarUrl = user?.avatar_url || null

  return (
    <div className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,210,221,0.8),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(180,242,232,0.65),_transparent_28%),radial-gradient(circle_at_bottom_center,_rgba(212,200,255,0.45),_transparent_30%),linear-gradient(180deg,#fffdf9_0%,#fff8f2_100%)] text-slate-800">
      <div className="mx-auto flex h-full max-w-[1600px] flex-col overflow-hidden lg:flex-row">
        <aside className="hidden h-full w-[248px] shrink-0 border-r border-white/60 bg-white/72 px-6 py-8 backdrop-blur-xl lg:flex lg:flex-col lg:overflow-y-auto">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-white text-sm font-semibold overflow-hidden">
                {avatarUrl ? (
                  <Image
                    src={resolveAssetUrl(avatarUrl)}
                    alt={displayName}
                    width={40}
                    height={40}
                    sizes="40px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarChar
                )}
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={cn(
              "sticky top-0 z-20 shrink-0 items-center justify-between bg-transparent px-5 py-1 lg:min-h-[56px] lg:px-10",
              "hidden lg:flex",
            )}
          >
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
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-500 shadow-[0_8px_24px_rgba(255,192,203,0.14)] transition hover:text-slate-800"
                aria-label="通知"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff7f96]" />
              </button>
              <Link
                href="/profile"
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,192,203,0.18)] overflow-hidden lg:hidden"
                aria-label="个人主页"
              >
                {avatarUrl ? (
                  <Image
                    src={resolveAssetUrl(avatarUrl)}
                    alt={displayName}
                    width={40}
                    height={40}
                    sizes="40px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarChar
                )}
              </Link>
            </div>
          </header>
          {notice ? (
            <div className="mx-4 mt-2 rounded-[22px] border border-[#d6f3ea] bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_30px_rgba(255,216,225,0.16)] md:mx-6 lg:mx-10">
              {notice}
            </div>
          ) : null}

          <main
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-1 md:px-6 lg:px-10 lg:pb-10 lg:pt-1",
              appMode && "pt-[calc(env(safe-area-inset-top)+6px)]",
              contentClassName,
            )}
          >
            {children}
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/70 bg-white/88 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-5 items-end gap-1">
              {appNavItems.map((item) => {
                const active = pathname === item.href
                const Icon = item.icon
                const featured = item.href === "/companion"
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[11px] transition",
                      featured && "-mt-7 min-h-[72px]",
                      active
                        ? "text-[#ff7894]"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-2xl transition",
                        featured && "h-12 w-12 rounded-full bg-gradient-to-r from-[#ff9fb4] via-[#ffbfcb] to-[#8de1d5] text-white shadow-[0_14px_28px_rgba(255,181,194,0.34)]",
                        active && !featured && "bg-[#fff0f4] shadow-[0_8px_18px_rgba(255,181,194,0.18)]",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", featured && "h-5 w-5")} />
                    </span>
                    <span className={cn("font-medium leading-none", featured && active && "text-[#ff7894]")}>
                      {item.shortLabel}
                    </span>
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
