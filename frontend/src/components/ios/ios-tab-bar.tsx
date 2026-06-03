"use client"

import Link from "next/link"
import { AppNavItem } from "@/lib/moodwave"
import { cn } from "@/lib/utils"

type IOSTabBarProps = {
  items: AppNavItem[]
  pathname: string
}

export function IOSTabBar({ items, pathname }: IOSTabBarProps) {
  return (
    <nav className="ios-tab-bar fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3">
      <div className="mx-auto flex max-w-[460px] items-end gap-1 rounded-[30px] border border-white/75 bg-white/78 px-3 py-2 shadow-[0_22px_60px_rgba(255,181,194,0.28)] backdrop-blur-2xl">
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          const featured = item.href === "/companion"

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-1 py-2 text-[11px] font-medium transition",
                active ? "text-[#ff6f91]" : "text-slate-500 hover:text-slate-700",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-[18px] transition",
                  featured &&
                    "h-12 w-12 rounded-full bg-gradient-to-br from-[#ff9fb4] via-[#ffc9d4] to-[#9fe6d8] text-white shadow-[0_14px_30px_rgba(255,181,194,0.35)]",
                  active && !featured && "bg-[#fff1f5] shadow-[0_10px_24px_rgba(255,181,194,0.18)]",
                )}
              >
                <Icon className={cn("h-4 w-4", featured && "h-5 w-5")} />
              </span>
              <span>{item.shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
