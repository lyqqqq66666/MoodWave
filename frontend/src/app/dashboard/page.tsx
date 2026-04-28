"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Mic, Sparkles } from "lucide-react"
import { moodAPI } from "@/lib/api"
import { buildDailyMessage, dashboardFeatureCards, getGreetingForHour, getMoodOption, moodOptions } from "@/lib/moodwave"
import { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"

type RecentMood = {
  id: string
  mood_type: MoodType
  note: string
  created_at: string
}

const fallbackHistory: RecentMood[] = [
  {
    id: "local-1",
    mood_type: "calm",
    note: "下午终于把任务拆开了，心里轻了一点。",
    created_at: new Date().toISOString(),
  },
  {
    id: "local-2",
    mood_type: "anxious",
    note: "想到 deadline 还是会慌，但至少开始行动了。",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

export default function DashboardPage() {
  const [currentMoodIndex, setCurrentMoodIndex] = useState(1)
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>(fallbackHistory)
  const [isLoading, setIsLoading] = useState(true)

  const mood = moodOptions[currentMoodIndex]
  const greeting = getGreetingForHour()

  useEffect(() => {
    let active = true

    async function loadMoods() {
      try {
        const response = await moodAPI.list({ limit: 3 })
        if (!active) return
        const rows = Array.isArray(response.data) ? response.data : []
        if (rows.length > 0) {
          setRecentMoods(
            rows.map((item: any) => ({
              id: String(item.id),
              mood_type: item.mood_type as MoodType,
              note: item.note || "这一天被认真记录下来了。",
              created_at: item.created_at || new Date().toISOString(),
            })),
          )
        }
      } catch {
        if (!active) return
        setRecentMoods(fallbackHistory)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadMoods()
    return () => {
      active = false
    }
  }, [])

  return (
    <MoodWaveShell
      title={greeting.greeting}
      rightSlot={
        <span className="hidden rounded-full bg-[#fff0f5] px-4 py-2 text-sm text-[#ff6f8c] md:inline-flex">
          <Sparkles className="mr-2 h-4 w-4" />
          温柔模式进行中
        </span>
      }
    >
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="rounded-[36px] bg-white/80 p-6 shadow-[0_20px_60px_rgba(255,206,216,0.2)] ring-1 ring-white/70 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm text-slate-500">{greeting.signoff}</p>
              <h2 className="font-display text-3xl font-semibold md:text-4xl">今天的心情值得被看见。</h2>
              <p className="max-w-xl text-sm leading-7 text-slate-600 md:text-base">
                先从一个轻量入口开始，不用立刻把全部心事说完。你只需要把“现在”交给我们。
              </p>
              <Link
                href="/mood"
                className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] px-6 text-base font-semibold text-white shadow-[0_18px_36px_rgba(255,181,194,0.3)]"
              >
                <Mic className="h-5 w-5" />
                说说此刻的心情
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setCurrentMoodIndex((value) => (value + 1) % moodOptions.length)}
              className="rounded-[36px] bg-gradient-to-br from-white via-[#fff9fb] to-[#eefdfa] p-6 text-center shadow-[0_20px_50px_rgba(255,213,223,0.2)] transition hover:-translate-y-1"
            >
              <p className="text-sm text-slate-500">今日心情</p>
              <div
                className="mx-auto mt-5 flex h-36 w-36 items-center justify-center rounded-full text-7xl shadow-[0_16px_34px_rgba(255,214,153,0.22)]"
                style={{ backgroundColor: mood.softAccent }}
              >
                {mood.emoji}
              </div>
              <p className="mt-5 text-2xl font-semibold">{mood.label}</p>
              <p className="mt-2 text-sm text-slate-500">点击切换情绪预览</p>
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {dashboardFeatureCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[30px] bg-white/78 p-5 shadow-[0_18px_36px_rgba(255,216,225,0.18)] ring-1 ring-white/70 transition hover:-translate-y-1"
            >
              <div className="text-3xl">{card.icon}</div>
              <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[32px] bg-white/80 p-6 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/70">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">最近记录</h3>
                <p className="mt-1 text-sm text-slate-500">展示 `GET /api/moods` 的最新记录，接口未就绪时用本地占位数据。</p>
              </div>
              <Link href="/mood" className="text-sm font-medium text-[#ff7894]">
                新建记录
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {(isLoading ? fallbackHistory : recentMoods).map((entry) => {
                const option = getMoodOption(entry.mood_type)
                return (
                  <article
                    key={entry.id}
                    className="flex items-start gap-4 rounded-[24px] border border-[#f9e5ea] bg-white/90 p-4"
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                      style={{ backgroundColor: option.softAccent }}
                    >
                      {option.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-800">{option.label}</p>
                        <span className="text-xs text-slate-400">
                          {new Date(entry.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{entry.note}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="rounded-[32px] bg-white/80 p-6 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/70">
            <h3 className="text-xl font-semibold">AI 每日寄语</h3>
            <p className="mt-1 text-sm text-slate-500">这里先由前端根据时间与当前情绪做文案占位，后续交给 `workbuddy` 接接口。</p>
            <div className="mt-6 rounded-[28px] bg-gradient-to-br from-[#fff4f7] to-[#effdfa] p-6">
              <p className="text-sm leading-7 text-slate-700">{buildDailyMessage(mood.value)}</p>
            </div>
            <div className="mt-6 rounded-[28px] border border-dashed border-[#ffd5e0] p-5 text-sm leading-7 text-slate-500">
              联调接口建议：
              `GET /api/moods` 返回最近 3 条记录；
              后续可补 `GET /api/analytics/summary` 或 `POST /api/analytics/analyze` 来生成个性化寄语。
            </div>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
