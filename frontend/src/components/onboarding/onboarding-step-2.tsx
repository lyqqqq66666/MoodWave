"use client"

import { motion } from "framer-motion"
import { Brain, Music2, PenLine } from "lucide-react"

const cards = [
  {
    title: "记录",
    description: "选择情绪，滑动强度，再说说发生了什么。",
    icon: PenLine,
    accent: "#ff97ad",
  },
  {
    title: "AI 分析",
    description: "灵音会温柔解读你的情绪，给出不评判的洞察。",
    icon: Brain,
    accent: "#8ea5ff",
  },
  {
    title: "沉浸音乐房间",
    description: "情绪变成粒子、波纹、颜色和节奏。",
    icon: Music2,
    accent: "#8de1d5",
  },
]

export function OnboardingStep2() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#ff7894]">记录 → AI 分析 → 治愈音乐</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 md:text-4xl">
          3 步，把心情变成声音
        </h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <motion.article
              key={card.title}
              custom={index}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.42 }}
              className="relative overflow-hidden rounded-[28px] border border-white/72 bg-white/76 p-5 shadow-[0_18px_48px_rgba(255,181,194,0.16)] backdrop-blur-xl"
            >
              <div className="absolute inset-y-5 left-0 w-1.5 rounded-r-full" style={{ backgroundColor: card.accent }} />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-white shadow-[0_12px_24px_rgba(255,151,173,0.2)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-5 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
            </motion.article>
          )
        })}
      </div>
    </div>
  )
}
