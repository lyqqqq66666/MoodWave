"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Mic } from "lucide-react"
import { aiAPI, moodAPI } from "@/lib/api"
import { buildDailyMessage, dashboardFeatureCards, getGreetingForHour, getMoodOption, moodOptions } from "@/lib/moodwave"
import { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { CompanionAvatar } from "@/components/companion-avatar"
import { useAuthStore } from "@/store/auth"

type SSEMessage = {
  type?: "text" | "done" | "error"
  content?: string
}

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

function unwrapData(payload: unknown) {
  const wrapped = payload as { data?: unknown }
  return wrapped?.data ?? payload
}

export default function DashboardPage() {
  const { user, token } = useAuthStore()
  const [currentMoodIndex, setCurrentMoodIndex] = useState(1)
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>(fallbackHistory)
  const [isLoading, setIsLoading] = useState(true)
  const [dailyMessage, setDailyMessage] = useState("")
  const [isDailyMessageLoading, setIsDailyMessageLoading] = useState(false)

  const mood = moodOptions[currentMoodIndex]
  const greeting = getGreetingForHour()

  useEffect(() => {
    let active = true

    async function loadMoods() {
      try {
        const response = await moodAPI.list({ limit: 3 })
        if (!active) return
        const rows = unwrapData(response.data)
        if (Array.isArray(rows) && rows.length > 0) {
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

  useEffect(() => {
    const controller = new AbortController()

    async function loadDailyMessage() {
      setIsDailyMessageLoading(true)
      setDailyMessage("")
      try {
        const response = await fetch(aiAPI.chatUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            mood_type: mood.value,
            intensity: 5,
            message: `请用一句话给我今天适合${mood.label}状态的每日寄语。`,
            tags: [],
            history: [],
            avatar_character: user?.avatar_character === "planet" ? "star" : user?.avatar_character || "cat",
            mbti: user?.mbti || "",
            zodiac: user?.zodiac || "",
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) throw new Error("daily message unavailable")

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let streamedText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split("\n\n")
          buffer = events.pop() ?? ""

          for (const eventChunk of events) {
            const dataLine = eventChunk
              .split("\n")
              .map((line) => line.trim())
              .find((line) => line.startsWith("data:"))
            if (!dataLine) continue
            const payload = JSON.parse(dataLine.replace(/^data:\s*/, "")) as SSEMessage
            if (payload.type === "text" && payload.content) {
              streamedText += payload.content
              setDailyMessage(streamedText)
            }
            if (payload.type === "error") throw new Error(payload.content || "daily message stream error")
            if (payload.type === "done") return
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setDailyMessage(buildDailyMessage(mood.value))
        }
      } finally {
        setIsDailyMessageLoading(false)
      }
    }

    void loadDailyMessage()
    return () => controller.abort()
  }, [mood.label, mood.value, token, user?.avatar_character, user?.mbti, user?.zodiac])

  return (
    <MoodWaveShell
      title={greeting.greeting}
      rightSlot={null}
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
                <p className="mt-1 text-sm text-slate-500">最近记录的情绪会在这里轻轻排好队。</p>
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
            <p className="mt-1 text-sm text-slate-500">一段适合今天的温柔提醒。</p>
            <div className="mt-5 flex items-center gap-3 rounded-[26px] bg-[#fff7f9] p-3 ring-1 ring-[#f8e7eb]">
              <CompanionAvatar
                character={user?.avatar_character}
                color={user?.character_color}
                mood={mood.value}
                size="sm"
              />
              <div className="rounded-[22px] bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                “{greeting.greeting.replace("，", "，")}我陪你把今天慢慢收好。”
              </div>
            </div>
            <div className="mt-6 rounded-[28px] bg-gradient-to-br from-[#fff4f7] to-[#effdfa] p-6">
              <p className="text-sm leading-7 text-slate-700">
                {dailyMessage || (isDailyMessageLoading ? "灵音伙伴正在准备今天的寄语..." : buildDailyMessage(mood.value))}
              </p>
            </div>
            <Link
              href="/companion"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ff718b] transition hover:text-[#e95d78]"
            >
              和灵音伙伴聊聊
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
