"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { BarChart3, Music2, Sparkles } from "lucide-react"
import { getMoodOption } from "@/lib/moodwave"
import { useOnboardingStore } from "@/store/onboarding"

type OnboardingStep5Props = {
  onComplete: () => void
}

export function OnboardingStep5({ onComplete }: OnboardingStep5Props) {
  const { aiResult, demoMood, demoIntensity, aiError } = useOnboardingStore()
  const result = aiResult ?? {
    mood: demoMood ?? "calm",
    intensity: demoIntensity,
    keywords: ["安静", "呼吸", "整理"],
    insight: "今天的你像一池安静的水，给自己一点空间慢慢沉淀。",
    suggestion: "去音乐房间听一段缓慢的氛围音，让身体也跟着松下来。",
  }
  const meta = getMoodOption(result.mood)

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="mx-auto grid h-20 w-20 place-items-center rounded-[30px] bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-4xl shadow-[0_20px_42px_rgba(255,151,173,0.26)]"
      >
        {meta.emoji}
      </motion.div>
      <h2 className="mt-6 font-display text-3xl font-bold text-slate-900 md:text-4xl">完成了！</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">这是你的第一份情绪报告。</p>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.12 }}
        className="mt-7 rounded-[32px] bg-white/82 p-5 text-left shadow-[0_22px_64px_rgba(255,208,219,0.22)] ring-1 ring-white/75 md:p-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#fff3f6] px-4 py-2 text-sm font-semibold text-slate-700">
            今日情绪：{meta.label} {meta.emoji}
          </span>
          <span className="rounded-full bg-[#effdfa] px-4 py-2 text-sm font-semibold text-slate-700">
            强度：{result.intensity}/10
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {result.keywords.map((keyword) => (
            <span key={keyword} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#ff7894] shadow-sm">
              {keyword}
            </span>
          ))}
        </div>
        <p className="mt-5 text-base leading-8 text-slate-700">“{result.insight}”</p>
        <p className="mt-3 text-sm leading-7 text-slate-500">{result.suggestion}</p>
        {aiError ? <p className="mt-4 text-xs text-[#ef7b73]">{aiError}</p> : null}
        <Link
          href={`/music?mood=${result.mood}&intensity=${result.intensity}`}
          onClick={onComplete}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#fff3f6] px-5 text-sm font-semibold text-[#ff718b] transition hover:bg-[#ffe9ef]"
        >
          <Music2 className="h-4 w-4" />
          去音乐房间放松一下
        </Link>
      </motion.div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-[24px] bg-white/70 p-4 text-left shadow-sm ring-1 ring-white/70">
          <BarChart3 className="h-5 w-5 text-[#77c6e8]" />
          <p className="mt-2 font-semibold text-slate-800">追踪情绪趋势</p>
          <p className="mt-1 text-sm text-slate-500">连续记录 7 天，解锁完整分析。</p>
        </div>
        <div className="rounded-[24px] bg-white/70 p-4 text-left shadow-sm ring-1 ring-white/70">
          <Sparkles className="h-5 w-5 text-[#ff8fa3]" />
          <p className="mt-2 font-semibold text-slate-800">和灵音伙伴聊聊</p>
          <p className="mt-1 text-sm text-slate-500">把还没说完的话慢慢交给它。</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="mt-7 flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffc2cf] to-[#8de1d5] px-8 font-semibold text-white shadow-[0_18px_38px_rgba(255,151,173,0.32)]"
      >
        进入 MoodWave
      </button>
    </div>
  )
}
