"use client"

import Link from "next/link"
import { ArrowRight, BarChart3, MessageCircleHeart, Music2 } from "lucide-react"

type EmptyStateGuideProps = {
  variant: "analytics" | "music" | "discovery"
  className?: string
}

const copy = {
  analytics: {
    icon: BarChart3,
    title: "还没有情绪数据",
    description: "连续记录 3 天后，这里会出现专属于你的情绪地图。",
    action: "去记录第一条心情",
    href: "/mood",
    tone: "from-[#fff7dc] via-[#fff0f5] to-[#effdfa]",
  },
  music: {
    icon: Music2,
    title: "还没有心情记录",
    description: "记录一次心情后，灵音会自动为你生成一段专属氛围音乐。",
    action: "去记录心情",
    href: "/mood",
    tone: "from-[#eaf8ff] via-[#fff0f5] to-[#effdfa]",
  },
  discovery: {
    icon: MessageCircleHeart,
    title: "还没有人说话",
    description: "把今天的感受分享出来，也许有人正和你感受着同样的情绪。",
    action: "去记录并分享",
    href: "/mood",
    tone: "from-[#fff0f5] via-[#fff7dc] to-[#effdfa]",
  },
}

export function EmptyStateGuide({ variant, className = "" }: EmptyStateGuideProps) {
  const item = copy[variant]
  const Icon = item.icon

  return (
    <div className={`rounded-[30px] bg-gradient-to-br ${item.tone} p-6 text-center shadow-inner ring-1 ring-white/75 ${className}`}>
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-white/82 text-[#ff7f96] shadow-[0_12px_26px_rgba(255,181,194,0.18)]">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-900">{item.title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-slate-600">{item.description}</p>
      <Link
        href={item.href}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(255,151,173,0.24)]"
      >
        {item.action}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
