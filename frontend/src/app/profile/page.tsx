"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  BookOpen,
  ChevronRight,
  Flame,
  HeartHandshake,
  Info,
  Medal,
  Music2,
  Palette,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react"
import { analyticsAPI, moodAPI } from "@/lib/api"
import { getMoodOption } from "@/lib/moodwave"
import {
  checklist,
  energyMoments,
  fallbackRecords,
  fallbackSummary,
  parseMoodRecord,
  parseSummary,
  type MoodRecord,
  type SummaryState,
  unwrapData,
} from "@/lib/profile"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { useAuthStore } from "@/store/auth"

const settingItems = [
  { icon: UserRound, label: "个人信息", helper: "编辑个人资料" },
  { icon: Bell, label: "通知设置", helper: "管理提醒通知" },
  { icon: Palette, label: "主题设置", helper: "切换界面主题" },
  { icon: BookOpen, label: "使用指南", helper: "新手使用帮助" },
  { icon: Info, label: "关于我们", helper: "了解灵音信息" },
]

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [summary, setSummary] = useState<SummaryState>(fallbackSummary)
  const [records, setRecords] = useState<MoodRecord[]>(fallbackRecords)
  const [isLoading, setIsLoading] = useState(true)
  const [settingsNotice, setSettingsNotice] = useState("")

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const [summaryResponse, moodsResponse] = await Promise.all([
          analyticsAPI.summary(),
          moodAPI.list({ limit: 6 }),
        ])
        if (!active) return

        setSummary((current) => ({ ...current, ...parseSummary(summaryResponse.data) }))
        const moodRows = unwrapData(moodsResponse.data)
        if (Array.isArray(moodRows) && moodRows.length > 0) {
          setRecords(moodRows.map((item) => parseMoodRecord(item)))
        }
      } catch {
        if (!active) return
        setSummary(fallbackSummary)
        setRecords(fallbackRecords)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [])

  const dominant = getMoodOption(summary.dominantMood)
  const username = user?.username || "小鱼"
  const mbti = user?.mbti || "INFP"
  const avatarInitial = username.slice(0, 1).toUpperCase()

  return (
    <MoodWaveShell
      title="个人主页"
      rightSlot={
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-[0_10px_24px_rgba(255,205,216,0.2)]">
          <Settings className="h-4 w-4" />
        </button>
      }
    >
      <div className="mx-auto grid min-w-0 max-w-6xl gap-5 xl:grid-cols-[1fr_0.92fr]">
        <section className="min-w-0 overflow-hidden rounded-[36px] bg-white/82 shadow-[0_24px_70px_rgba(255,206,216,0.24)] ring-1 ring-white/75">
          <div className="relative min-h-[190px] bg-[radial-gradient(circle_at_20%_15%,rgba(255,181,194,0.6),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(168,230,207,0.72),transparent_34%),linear-gradient(135deg,#fff4f7,#f0fffb_48%,#fff8df)] px-6 pb-7 pt-8 md:px-9">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-[linear-gradient(135deg,rgba(255,255,255,0.48),rgba(255,255,255,0))]" />
            <div className="relative flex flex-col items-center text-center md:flex-row md:text-left">
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white p-2 shadow-[0_18px_42px_rgba(255,159,180,0.28)]">
                {user?.avatar_url ? (
                  <div
                    role="img"
                    aria-label={`${username}的头像`}
                    className="h-full w-full rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${user.avatar_url})` }}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#ffb5c2] via-[#fff6d6] to-[#a8e6cf] text-4xl font-semibold text-white">
                    {avatarInitial}
                  </div>
                )}
              </div>
              <div className="mt-5 min-w-0 md:ml-6 md:mt-0">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h2 className="text-3xl font-semibold text-slate-900">{username}</h2>
                  <span className="rounded-full bg-[#eafff7] px-3 py-1 text-xs font-medium text-[#2d8f78]">
                    MBTI · {mbti}
                  </span>
                </div>
                <p className="mt-3 max-w-full break-words text-sm leading-6 text-slate-600 md:max-w-xl">
                  记录情绪的潮汐，遇见内心的风景。今天也在认真照顾自己的节奏。
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-3 md:px-8">
            {[
              { icon: PenLine, label: "篇日记", value: summary.journalCount },
              { icon: Music2, label: "首音乐", value: summary.musicCount },
              { icon: Flame, label: "天连续记录", value: summary.streakDays },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="rounded-[28px] bg-[#fff9fb] p-4 text-center ring-1 ring-[#ffe2ea]">
                  <Icon className="mx-auto h-5 w-5 text-[#ff7f96]" />
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.2)] ring-1 ring-white/75 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">本月数据统计</h3>
              <p className="mt-1 text-sm text-slate-500">{isLoading ? "正在同步情绪数据..." : "来自情绪记录与分析摘要"}</p>
            </div>
            <Medal className="h-6 w-6 text-[#ffb35c]" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[30px] bg-gradient-to-br from-[#fff7d8] to-[#effdfa] p-5">
              <p className="text-sm text-slate-500">主导情绪</p>
              <div className="mt-5 grid place-items-center">
                <div className="grid h-32 w-32 place-items-center rounded-full bg-white shadow-[inset_0_0_0_18px_rgba(255,181,194,0.22)]">
                  <span className="text-5xl">{dominant.emoji}</span>
                </div>
              </div>
              <p className="mt-4 text-center text-lg font-semibold">{dominant.label}</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "记录天数", value: summary.monthCount, color: "#90E0EF" },
                { label: "平静占比", value: 30, color: "#A8E6CF" },
                { label: "开心占比", value: 35, color: "#FFD166" },
                { label: "波动指数", value: 18, color: "#FFB5C2" },
              ].map((item) => (
                <div key={item.label} className="rounded-[22px] bg-white/84 p-3 ring-1 ring-[#f7e7ea]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(Number(item.value) * 2, 100)}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">功能与设置</h3>
            <ShieldCheck className="h-5 w-5 text-[#7ed9cb]" />
          </div>
          {settingsNotice ? (
            <div className="mt-4 rounded-[22px] border border-[#d6f3ea] bg-[#effdfa] px-4 py-3 text-sm text-slate-600">
              {settingsNotice}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {settingItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setSettingsNotice(`${item.label}即将上线，设置会逐步开放。`)}
                  className="flex items-center gap-3 rounded-[26px] bg-white/88 p-4 text-left shadow-[0_10px_26px_rgba(255,216,225,0.14)] ring-1 ring-[#f8e7eb] transition hover:-translate-y-0.5"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff4f7]">
                    <Icon className="h-5 w-5 text-[#62bda9]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-800">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{item.helper}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>
              )
            })}
          </div>
        </section>

        <section className="grid gap-5">
          <div className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">快乐能量库</h3>
              <Sparkles className="h-5 w-5 text-[#ff9fb4]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {energyMoments.map((item) => (
                <div key={item.title} className={`rounded-[28px] bg-gradient-to-br ${item.tone} p-4 text-white shadow-[0_16px_32px_rgba(255,181,194,0.22)]`}>
                  <p className="text-sm opacity-90">{item.title}</p>
                  <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6">
            <h3 className="text-xl font-semibold">历史记录</h3>
            <div className="mt-5 space-y-3">
              {records.slice(0, 4).map((record) => {
                const mood = getMoodOption(record.mood)
                return (
                  <article key={record.id} className="flex gap-3 rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e7eb]">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: mood.softAccent }}>
                      {mood.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-slate-900">{record.title}</h4>
                        <span className="rounded-full bg-[#fff3f6] px-2 py-1 text-xs text-[#ff7894]">{record.tag}</span>
                        <span className="text-xs text-slate-400">{record.date}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{record.note}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6">
            <h3 className="text-xl font-semibold">心境清单</h3>
            <div className="mt-5 space-y-3">
              {checklist.map((item) => {
                const mood = getMoodOption(item.mood)
                return (
                  <div key={item.text} className="flex items-center gap-3 rounded-[24px] bg-white/88 p-4 ring-1 ring-[#f8e7eb]">
                    <span className={item.done ? "grid h-6 w-6 place-items-center rounded-full bg-[#a8e6cf] text-xs text-white" : "h-6 w-6 rounded-full border-2 border-[#ffd5df]"}>{item.done ? "✓" : ""}</span>
                    <span className="flex-1 text-sm font-medium text-slate-700">{item.text}</span>
                    <span className="rounded-full px-3 py-1 text-xs text-slate-600" style={{ backgroundColor: mood.softAccent }}>
                      {mood.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-[#ff9fb4]" />
              <h3 className="text-xl font-semibold">音乐偏好</h3>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.favoriteTags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#fff4f7] px-4 py-2 text-sm text-[#ff7894] ring-1 ring-[#ffd9e2]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
