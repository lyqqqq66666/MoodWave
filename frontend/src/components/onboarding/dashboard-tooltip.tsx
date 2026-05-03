"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles, X } from "lucide-react"
import { hasCompletedOnboarding, hasSeenDashboardTooltip, markDashboardTooltipSeen } from "@/lib/onboarding"

export function DashboardTooltip() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!hasCompletedOnboarding() || hasSeenDashboardTooltip()) return
    setVisible(true)
    const timer = window.setTimeout(() => {
      markDashboardTooltipSeen()
      setVisible(false)
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [])

  function close() {
    markDashboardTooltipSeen()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      className="fixed inset-x-4 top-24 z-40 mx-auto max-w-md rounded-[28px] border border-white/80 bg-white/94 p-4 shadow-[0_24px_70px_rgba(255,151,173,0.28)] backdrop-blur-xl md:left-[280px] md:right-8 md:mx-0"
    >
      <button
        type="button"
        onClick={close}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#fff3f6] text-slate-400 transition hover:text-slate-700"
        aria-label="关闭引导提示"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-white shadow-[0_12px_24px_rgba(255,151,173,0.2)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">从这里开始你的第一次记录</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            写下此刻心情，灵音会带你去看分析和音乐房间。
          </p>
        </div>
      </div>
      <Link
        href="/mood"
        onClick={close}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(255,151,173,0.24)]"
      >
        说说此刻的心情
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  )
}
