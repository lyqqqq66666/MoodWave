"use client"

import Link from "next/link"
import { Bell, LogOut } from "lucide-react"
import { ReactNode } from "react"
import { AppNavItem } from "@/lib/moodwave"
import { cn } from "@/lib/utils"
import { resolveAssetUrl } from "@/lib/api"
import { IOSSafeArea } from "./ios-safe-area"
import { IOSTabBar } from "./ios-tab-bar"

type IOSAppShellProps = {
  title?: string
  children: ReactNode
  contentClassName?: string
  rightSlot?: ReactNode
  notice?: string
  onNoticeClick: () => void
  onLogout: () => void
  pathname: string
  navItems: AppNavItem[]
  displayName: string
  avatarChar: string
  avatarUrl?: string | null
}

export function IOSAppShell({
  title,
  children,
  contentClassName,
  rightSlot,
  notice,
  onNoticeClick,
  onLogout,
  pathname,
  navItems,
  displayName,
  avatarChar,
  avatarUrl,
}: IOSAppShellProps) {
  return (
    <div className="ios-app-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,214,224,0.95),_transparent_28%),radial-gradient(circle_at_85%_12%,_rgba(181,239,230,0.8),_transparent_24%),radial-gradient(circle_at_50%_100%,_rgba(222,213,255,0.75),_transparent_28%),linear-gradient(180deg,#fffdf9_0%,#fff8f2_52%,#fff6ef_100%)] text-slate-800">
      <IOSSafeArea>
        <div className="mx-auto flex min-h-screen max-w-[460px] flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-72 max-w-[460px] overflow-hidden">
            <div className="absolute -left-10 top-6 h-36 w-36 rounded-full bg-[#ffd7e1]/55 blur-3xl" />
            <div className="absolute right-0 top-12 h-32 w-32 rounded-full bg-[#c7f5ea]/70 blur-3xl" />
            <div className="absolute left-1/2 top-28 h-28 w-28 -translate-x-1/2 rounded-full bg-[#ece0ff]/52 blur-3xl" />
          </div>
          <header className="sticky top-0 z-30 px-4 pb-3 pt-1">
            <div className="ios-floating-card rounded-[30px] border border-white/70 bg-white/72 px-4 py-3 shadow-[0_18px_40px_rgba(255,206,216,0.22)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#ff8aa2]">MoodWave 灵音</p>
                  {title ? <h1 className="truncate pt-1 text-lg font-semibold text-slate-800">{title}</h1> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {rightSlot}
                  <button
                    type="button"
                    onClick={onNoticeClick}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-slate-500 shadow-[0_10px_24px_rgba(255,192,203,0.16)] transition hover:text-slate-800"
                    aria-label="通知"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  <Link
                    href="/profile"
                    className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,192,203,0.16)]"
                    aria-label="个人主页"
                  >
                    {avatarUrl ? (
                      <img src={resolveAssetUrl(avatarUrl)} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      avatarChar
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {notice ? (
            <div className="px-4 pb-2">
              <div className="rounded-[24px] border border-[#d6f3ea] bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_30px_rgba(255,216,225,0.16)]">
                {notice}
              </div>
            </div>
          ) : null}

          <main className={cn("min-w-0 flex-1 px-4 pb-32 pt-1", contentClassName)}>{children}</main>

          <div className="px-4 pb-28">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-white/70 bg-white/70 px-4 py-3 text-sm font-medium text-slate-500 shadow-[0_12px_28px_rgba(255,206,216,0.16)] backdrop-blur-xl transition hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>

          <IOSTabBar items={navItems} pathname={pathname} />
        </div>
      </IOSSafeArea>
    </div>
  )
}
