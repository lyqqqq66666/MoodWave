"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Medal, Sparkles } from "lucide-react"
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { analyticsAPI } from "@/lib/api"
import { getMoodOption } from "@/lib/moodwave"
import type { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { cn } from "@/lib/utils"

type TrendPoint = { day: string; calm: number; happy: number }
type MoodShare = { mood: MoodType; label: string; value: number; color: string }
type HeatCell = { date: string; mood: MoodType; intensity: number }
type WeeklyApiItem = { date: string; mood_type: MoodType; avg_intensity: number }
type DistributionApiItem = { mood_type: MoodType; percentage: number }
type HeatmapApiItem = { date: string; mood_type: MoodType; intensity: number }

const weekTrend: TrendPoint[] = [
  { day: "18", calm: 4, happy: 6 },
  { day: "19", calm: 5, happy: 8 },
  { day: "20", calm: 4, happy: 5 },
  { day: "21", calm: 7, happy: 9 },
  { day: "22", calm: 6, happy: 7 },
  { day: "23", calm: 8, happy: 10 },
  { day: "24", calm: 6, happy: 8 },
  { day: "25", calm: 7, happy: 9 },
  { day: "26", calm: 5, happy: 7 },
]

const moodShare: MoodShare[] = [
  { mood: "happy", label: "开心", value: 35, color: "#FFD166" },
  { mood: "calm", label: "平静", value: 30, color: "#7ED9CB" },
  { mood: "anxious", label: "焦虑", value: 15, color: "#8EA5FF" },
  { mood: "neutral", label: "平淡", value: 10, color: "#B9E58B" },
  { mood: "angry", label: "愤怒", value: 10, color: "#FF8F78" },
]

const calendarMoods: Record<number, MoodType> = {
  1: "happy",
  4: "angry",
  8: "happy",
  9: "anxious",
  11: "angry",
  14: "happy",
  15: "anxious",
  16: "angry",
  22: "calm",
  25: "neutral",
  26: "happy",
}

const heatCells: HeatCell[] = Array.from({ length: 30 }, (_, index) => {
  const mood = (["calm", "happy", "happy", "anxious", "neutral", "sad"] as MoodType[])[index % 6]
  return {
    date: `${index + 1}`,
    mood,
    intensity: 3 + ((index * 7) % 7),
  }
})

const fallbackInsight = "连续打卡 7 天，本月记录 12 篇，情绪以开心和平静为主。你正在慢慢形成稳定的自我观察节奏。"
const moodColorMap: Record<MoodType, string> = {
  happy: "#FFD166",
  calm: "#7ED9CB",
  anxious: "#8EA5FF",
  angry: "#FF8F78",
  sad: "#8BCF97",
  neutral: "#C9B6F2",
}

function normalize(payload: unknown) {
  const wrapped = payload as { data?: unknown }
  return wrapped?.data ?? payload
}

export default function AnalyticsPage() {
  const [activeDay, setActiveDay] = useState(26)
  const [aiInsight, setAiInsight] = useState(fallbackInsight)
  const [summaryLoaded, setSummaryLoaded] = useState(false)
  const [trendData, setTrendData] = useState(weekTrend)
  const [shareData, setShareData] = useState(moodShare)
  const [heatmapData, setHeatmapData] = useState(heatCells)
  const [calendarData, setCalendarData] = useState<Record<number, MoodType>>(calendarMoods)

  useEffect(() => {
    let active = true

    async function loadAnalytics() {
      try {
        const [weeklyResponse, summaryResponse] = await Promise.all([
          analyticsAPI.weekly(),
          analyticsAPI.summary(),
        ])
        if (!active) return

        const weekly = normalize(weeklyResponse.data) as { weekly_trend?: WeeklyApiItem[] }
        if (Array.isArray(weekly.weekly_trend) && weekly.weekly_trend.length > 0) {
          setTrendData(
            weekly.weekly_trend.map((item) => ({
              day: item.date.slice(5).replace("-", "/"),
              calm: item.mood_type === "calm" ? item.avg_intensity : Math.max(1, item.avg_intensity - 2),
              happy: item.avg_intensity,
            })),
          )
        }

        const summary = normalize(summaryResponse.data) as {
          insight?: string
          suggestion?: string
          mood_distribution?: DistributionApiItem[]
          heatmap_data?: HeatmapApiItem[]
        }
        if (Array.isArray(summary.mood_distribution) && summary.mood_distribution.length > 0) {
          setShareData(
            summary.mood_distribution.map((item) => {
              const mood = getMoodOption(item.mood_type)
              return {
                mood: item.mood_type,
                label: mood.label,
                value: Math.round(item.percentage),
                color: moodColorMap[item.mood_type],
              }
            }),
          )
        }
        if (Array.isArray(summary.heatmap_data) && summary.heatmap_data.length > 0) {
          setHeatmapData(
            summary.heatmap_data.slice(-30).map((item) => ({
              date: String(Number(item.date.slice(-2))),
              mood: item.mood_type,
              intensity: item.intensity,
            })),
          )
          setCalendarData(
            summary.heatmap_data.reduce<Record<number, MoodType>>((result, item) => {
              result[Number(item.date.slice(-2))] = item.mood_type
              return result
            }, {}),
          )
        }
        setAiInsight(summary.insight || summary.suggestion || fallbackInsight)
        setSummaryLoaded(true)
      } catch {
        if (active) setSummaryLoaded(false)
      }
    }

    loadAnalytics()
    return () => {
      active = false
    }
  }, [])

  const selectedMood = getMoodOption(calendarData[activeDay] ?? "happy")
  const calendarDays = useMemo(() => {
    const previous = [30, 31]
    const current = Array.from({ length: 30 }, (_, index) => index + 1)
    const next = [1, 2, 3]
    return { previous, current, next }
  }, [])

  return (
    <MoodWaveShell
      title="我的情绪趋势"
      rightSlot={
        <button className="hidden items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_24px_rgba(255,205,216,0.18)] md:inline-flex">
          2026年4月
          <CalendarDays className="h-4 w-4 text-[#ff7f96]" />
        </button>
      }
    >
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,208,219,0.2)] ring-1 ring-white/75 md:p-7">
          <div className="flex items-center justify-between">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-semibold">4月 2026</h2>
              <p className="mt-1 text-xs text-slate-400">按日期回看每一次情绪波动</p>
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-7 text-center text-xs font-medium text-slate-400">
            {["一", "二", "三", "四", "五", "六", "日"].map((item) => (
              <span key={item} className={cn((item === "六" || item === "日") && "text-[#ff7894]")}>
                {item}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.previous.map((day) => (
              <div key={`p-${day}`} className="aspect-square rounded-2xl text-center text-sm leading-[3.1rem] text-slate-300">
                {day}
              </div>
            ))}
            {calendarDays.current.map((day) => {
              const mood = calendarData[day]
              const active = activeDay === day
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={cn(
                    "relative aspect-square rounded-2xl bg-white/70 text-sm text-slate-700 transition hover:-translate-y-0.5",
                    active && "ring-2 ring-[#ff7f96] shadow-[0_10px_24px_rgba(255,127,150,0.16)]",
                    day % 7 === 6 || day % 7 === 0 ? "text-[#ff7894]" : "",
                  )}
                >
                  <span className="absolute left-2 top-1.5">{day}</span>
                  {mood ? <span className="absolute inset-x-0 bottom-2 text-xl">{getMoodOption(mood).emoji}</span> : null}
                </button>
              )
            })}
            {calendarDays.next.map((day) => (
              <div key={`n-${day}`} className="aspect-square rounded-2xl text-center text-sm leading-[3.1rem] text-slate-300">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[28px] bg-gradient-to-br from-[#fff8f1] to-[#fff1f5] p-5 shadow-inner">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">4月{activeDay}日</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                  <span className="text-3xl">{selectedMood.emoji}</span>
                  {selectedMood.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">今天把情绪安放下来，和清晨保持了一点开心。</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-[#ffeef3] px-3 py-1 text-xs text-[#ff6f8c]">社交</span>
                <span className="rounded-full bg-[#fff6dd] px-3 py-1 text-xs text-[#d89b22]">娱乐</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5">
          <section className="rounded-[30px] bg-white/82 p-5 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/75">
            <h3 className="font-semibold">本周情绪分布</h3>
            <div className="mt-4 space-y-3">
              {shareData.map((item) => (
                <div key={item.mood} className="grid grid-cols-[52px_1fr_40px] items-center gap-3 text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-[#f5edf0]">
                    <div className="h-full rounded-full" style={{ width: `${item.value * 2}%`, backgroundColor: item.color }} />
                  </div>
                  <span className="text-right text-slate-400">{item.value}%</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
            <section className="rounded-[30px] bg-white/82 p-5 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/75">
              <h3 className="font-semibold">月度情绪分布</h3>
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={shareData} innerRadius={42} outerRadius={70} paddingAngle={4} dataKey="value">
                      {shareData.map((item) => (
                        <Cell key={item.mood} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-[30px] bg-white/82 p-5 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/75">
              <h3 className="font-semibold">30天趋势</h3>
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="happyLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff7f96" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#ff7f96" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis hide domain={[0, 10]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="happy" stroke="#ff7f96" fill="url(#happyLine)" strokeWidth={3} />
                    <Area type="monotone" dataKey="calm" stroke="#70d8c9" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-[30px] bg-white/82 p-5 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/75">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">AI 月度洞察</h3>
              <span className="rounded-full bg-[#eefbf8] px-3 py-1 text-xs text-[#44b9aa]">{summaryLoaded ? "接口已连接" : "Mock 数据"}</span>
            </div>
            <div className="mt-4 rounded-[24px] bg-gradient-to-r from-[#fff5d8] via-[#fff0f5] to-[#effdfa] p-4 text-sm leading-7 text-slate-600">
              <Sparkles className="mr-2 inline h-4 w-4 text-[#ff8fa3]" />
              {aiInsight}
            </div>
          </section>

          <section className="rounded-[30px] bg-white/82 p-5 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/75">
            <div className="flex items-center gap-3">
              <Medal className="h-9 w-9 rounded-2xl bg-[#fff4da] p-2 text-[#f6b94f]" />
              <div>
                <h3 className="font-semibold">年度热力日历</h3>
                <p className="text-xs text-slate-400">最近 30 天情绪浓度</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-10 gap-2">
              {heatmapData.map((cell) => {
                const mood = getMoodOption(cell.mood)
                return (
                  <div
                    key={cell.date}
                    title={`${cell.date}日 ${mood.label}`}
                    className="aspect-square rounded-lg"
                    style={{ backgroundColor: mood.accent, opacity: 0.25 + cell.intensity / 14 }}
                  />
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </MoodWaveShell>
  )
}
