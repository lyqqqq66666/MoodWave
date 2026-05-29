"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ChevronLeft, ChevronRight, Mic } from "lucide-react"
import { aiAPI, moodAPI } from "@/lib/api"
import { buildDailyMessage, dashboardFeatureCards, getGreetingForHour, getMoodOption, moodOptions } from "@/lib/moodwave"
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
  const [currentMoodIndex, setCurrentMoodIndex] = useState(1)
  const [recentMoods, setRecentMoods] = useState<RecentMood[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dailyMessage, setDailyMessage] = useState("")
  const [isDailyMessageLoading, setIsDailyMessageLoading] = useState(false)
  const [moodDirection, setMoodDirection] = useState(1)

  const mood = moodOptions[currentMoodIndex]
  const greeting = getGreetingForHour()

  function shiftMood(direction: 1 | -1) {
    setMoodDirection(direction)
    setCurrentMoodIndex((value) => (value + direction + moodOptions.length) % moodOptions.length)
  }

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
        }
      } catch {
        if (!active) return
        setRecentMoods([])
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadMoods()
    return () => {
      active = false
    }
  }, [guestRecords, token])

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
      <DashboardTooltip />
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="rounded-[34px] bg-white/84 p-5 shadow-[0_20px_60px_rgba(255,206,216,0.2)] ring-1 ring-white/75 md:p-7">
          <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="flex items-center gap-3">
              <CompanionAvatar
                character={user?.avatar_character}
                color={user?.character_color}
                mood={mood.value}
                size="sm"
              />
              <div>
                <p className="text-sm font-semibold text-[#ff718b]">AI 每日寄语</p>
                <p className="mt-1 text-xs text-slate-500">{token ? "来自灵音伙伴的今日提醒" : "游客模式使用本地寄语兜底"}</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-700 md:text-base">
              {dailyMessage || (isDailyMessageLoading ? "灵音伙伴正在准备今天的寄语..." : buildDailyMessage(mood.value))}
            </p>
            <Link
              href={token ? "/companion" : "/mood"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(255,181,194,0.25)]"
            >
              {token ? "和伙伴聊聊" : "先记录心情"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

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

            <div className="relative rounded-[36px] bg-gradient-to-br from-white via-[#fff9fb] to-[#eefdfa] p-6 text-center shadow-[0_20px_50px_rgba(255,213,223,0.2)] transition hover:-translate-y-1">
              <p className="text-sm text-slate-500">今日心情</p>
              <div className="mt-5 flex items-center justify-center gap-3 sm:gap-5">
                <button
                  type="button"
                  onClick={() => shiftMood(-1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-500 shadow-[0_10px_24px_rgba(255,181,194,0.18)] backdrop-blur-sm transition hover:scale-105 hover:text-[#ff7894]"
                  aria-label="切换到上一个情绪"
                  title="上一个情绪"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <AnimatePresence mode="wait" custom={moodDirection}>
                  <motion.div
                    key={mood.value}
                    custom={moodDirection}
                    initial={{ opacity: 0, x: moodDirection > 0 ? 28 : -28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: moodDirection > 0 ? -28 : 28 }}
                    transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
                    className="flex h-36 w-36 items-center justify-center rounded-full text-7xl shadow-[0_16px_34px_rgba(255,214,153,0.22)]"
                    style={{ backgroundColor: mood.softAccent }}
                  >
                    {mood.emoji}
                  </motion.div>
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => shiftMood(1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-500 shadow-[0_10px_24px_rgba(255,181,194,0.18)] backdrop-blur-sm transition hover:scale-105 hover:text-[#62bda9]"
                  aria-label="切换到下一个情绪"
                  title="下一个情绪"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-5 text-2xl font-semibold">{mood.label}</p>
              <p className="mt-2 text-sm text-slate-500">左右切换情绪预览</p>
            </div>
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
              {isLoading ? (
                <div className="rounded-[24px] bg-white/90 p-8 text-center text-sm text-slate-400">加载中...</div>
              ) : recentMoods.length === 0 ? (
                <Link href="/mood" className="block rounded-[24px] border border-dashed border-[#f9e5ea] bg-white/80 p-8 text-center transition hover:bg-white">
                  <p className="text-3xl">📝</p>
                  <p className="mt-3 text-sm font-medium text-slate-600">还没有情绪记录</p>
                  <p className="mt-1 text-xs text-slate-400">记录你的第一条心情，开始情绪觉察之旅</p>
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
                        <span className="text-xs text-slate-400">
                          {new Date(entry.created_at).toLocaleDateString("zh-CN")}
                        </span>
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
            <h3 className="text-xl font-semibold">今日闭环</h3>
            <p className="mt-1 text-sm text-slate-500">从记录到音乐，保持一个轻量节奏。</p>
            <div className="mt-5 grid gap-3">
              {[
                { href: "/mood", title: "记录此刻", helper: "选情绪、写一句话、保存今天" },
                { href: "/music", title: "播放音乐", helper: "用当前情绪生成一段可视化旋律" },
                { href: token ? "/companion" : "/login?redirect=/companion", title: "找伙伴聊聊", helper: token ? "把今天的心情交给灵音伙伴" : "登录后解锁长期记忆与对话" },
              ].map((item, index) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f8e7eb] transition hover:-translate-y-0.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#ffbfd0] to-[#8de1d5] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{item.helper}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/onboarding?restart=1"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#ff718b] transition hover:text-[#e95d78]"
            >
              重新查看新手引导
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
