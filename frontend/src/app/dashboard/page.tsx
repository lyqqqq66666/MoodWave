"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { HeartHandshake, Music4, PenLine, Sparkles, TrendingUp } from "lucide-react"
import { aiAPI, moodAPI } from "@/lib/api"
import { buildDailyMessage, getGreetingForHour, getMoodOption } from "@/lib/moodwave"
import { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { CompanionAvatar } from "@/components/companion-avatar"
import { DashboardTooltip } from "@/components/onboarding/dashboard-tooltip"
import { useAuthStore } from "@/store/auth"
import { useGuestStore } from "@/store/guest"

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

function unwrapData(payload: unknown) {
  const wrapped = payload as { data?: unknown }
  return wrapped?.data ?? payload
}

export default function DashboardPage() {
  const { user, token } = useAuthStore()
  const guestRecords = useGuestStore((state) => state.records)
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dailyMessage, setDailyMessage] = useState("")
  const [isDailyMessageLoading, setIsDailyMessageLoading] = useState(false)
  const greeting = getGreetingForHour()

  useEffect(() => {
    let active = true

    async function loadMoods() {
      if (!token && guestRecords.length > 0) {
        setRecentMoods(
          guestRecords.slice(0, 3).map((item) => ({
            id: item.id,
            mood_type: item.mood_type,
            note: item.note || "这一天被认真记录下来了。",
            created_at: item.created_at,
          })),
        )
        setIsLoading(false)
        return
      }

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
        } else {
          setRecentMoods([])
        }
      } catch {
        if (!active) return
        setRecentMoods([])
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadMoods()
    return () => {
      active = false
    }
  }, [guestRecords, token])

  const primaryMood = useMemo(() => {
    return recentMoods[0]?.mood_type || "calm"
  }, [recentMoods])

  const primaryMoodOption = getMoodOption(primaryMood)

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
            mood_type: primaryMood,
            intensity: 5,
            message: `请用一句话给我今天适合${primaryMoodOption.label}状态的每日寄语。`,
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
          setDailyMessage(buildDailyMessage(primaryMood))
        }
      } finally {
        setIsDailyMessageLoading(false)
      }
    }

    void loadDailyMessage()
    return () => controller.abort()
  }, [primaryMood, primaryMoodOption.label, token, user?.avatar_character, user?.mbti, user?.zodiac])

  return (
    <MoodWaveShell title={greeting.greeting}>
      <DashboardTooltip />
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="overflow-hidden rounded-[38px] bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(255,248,243,0.94))] p-6 shadow-[0_24px_70px_rgba(255,206,216,0.18)] ring-1 ring-white/75 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fff1f5] px-4 py-2 text-sm font-semibold text-[#ff708b]">
                <Sparkles className="h-4 w-4" />
                今日主入口
              </div>
              <div>
                <p className="text-sm text-slate-500">{greeting.signoff}</p>
                <h2 className="mt-2 font-display text-3xl font-semibold leading-tight text-[#1f2635] md:text-4xl">
                  先把今天的心情轻轻放下来，
                  <span className="block text-[#ff7894]">剩下的事情再慢慢处理。</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
                  MoodWave 今天只想帮你做好三件事：先记录此刻、回看情绪趋势、需要时再去找灵音聊聊。
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/mood"
                  className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] px-6 text-base font-semibold text-white shadow-[0_18px_36px_rgba(255,181,194,0.28)]"
                >
                  <PenLine className="h-5 w-5" />
                  写下此刻
                </Link>
                <Link
                  href="/analytics"
                  className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-white/88 px-6 text-sm font-semibold text-slate-700 ring-1 ring-[#f3dfe5] shadow-[0_12px_28px_rgba(255,216,225,0.14)]"
                >
                  看看趋势
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#fff7fa] via-white to-[#eefdfa] p-6 shadow-[0_16px_46px_rgba(255,206,216,0.16)]">
              <div className="pointer-events-none absolute -right-8 top-0 h-28 w-28 rounded-full bg-[#dff7f1] blur-3xl" />
              <div className="pointer-events-none absolute left-0 top-8 h-24 w-24 rounded-full bg-[#ffe0e8] blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-4">
                  <CompanionAvatar
                    character={user?.avatar_character}
                    color={user?.character_color}
                    mood={primaryMood}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#ff718b]">来自灵音的今日陪伴</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {token ? "会结合你最近的情绪记录慢慢生成今天的寄语" : "游客模式下先使用本地寄语兜底"}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-700 md:text-base">
                  {dailyMessage || (isDailyMessageLoading ? "灵音正在准备今天的寄语..." : buildDailyMessage(primaryMood))}
                </p>
                <div className="mt-5 rounded-[26px] bg-white/78 p-4 ring-1 ring-white/80">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">如果你还想继续说下去</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">可以把刚刚没来得及讲完的部分交给灵音。</p>
                    </div>
                    <Link
                      href={token ? "/companion" : "/login?redirect=/companion"}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#fff1f5] px-4 text-sm font-semibold text-[#ff718b]"
                    >
                      找伙伴聊聊
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="rounded-[32px] bg-white/80 p-6 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">最近记录</h3>
                <p className="mt-1 text-sm text-slate-500">不用一次看很多，先轻轻回看最近几次就好。</p>
              </div>
              <Link href="/mood" className="text-sm font-semibold text-[#ff7894]">
                新建记录
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <div className="rounded-[24px] bg-white/90 p-8 text-center text-sm text-slate-400">加载中...</div>
              ) : recentMoods.length === 0 ? (
                <Link href="/mood" className="block rounded-[24px] border border-dashed border-[#f9e5ea] bg-white/86 p-8 text-center transition hover:bg-white">
                  <p className="text-3xl">📝</p>
                  <p className="mt-3 text-sm font-medium text-slate-600">还没有情绪记录</p>
                  <p className="mt-1 text-xs text-slate-400">从今天的第一句话开始，灵音会在这里接住它。</p>
                </Link>
              ) : (
                recentMoods.map((entry) => {
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
                          <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString("zh-CN")}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{entry.note}</p>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-[32px] bg-white/80 p-6 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/70">
            <h3 className="text-xl font-semibold text-slate-900">今天可以这样慢慢来</h3>
            <p className="mt-1 text-sm text-slate-500">把入口收轻一点，只留下真正会用到的三步。</p>
            <div className="mt-5 grid gap-3">
              {[
                { icon: PenLine, href: "/mood", title: "先记录", helper: "用一句话、一次语音或一张图留下今天。" },
                { icon: Music4, href: "/music", title: "去缓一缓", helper: "把此刻情绪换成更适合你的陪伴节奏。" },
                { icon: HeartHandshake, href: token ? "/companion" : "/login?redirect=/companion", title: "继续聊聊", helper: token ? "需要的时候，再把心事交给灵音。" : "登录后可以保留伙伴记忆和对话。" },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="flex items-start gap-3 rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f8e7eb] transition hover:-translate-y-0.5"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#ffbfd0] to-[#8de1d5] text-white shadow-[0_10px_24px_rgba(255,181,194,0.18)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{item.helper}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
            <div className="mt-5 rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f8e7eb]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <TrendingUp className="h-4 w-4 text-[#ff7894]" />
                最近的心情走向
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                不需要每天都看很多分析，只要在想回头看看自己的时候，再打开趋势页就够了。
              </p>
              <Link href="/analytics" className="mt-3 inline-flex text-sm font-semibold text-[#ff718b]">
                去趋势页看看
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
