"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { analyticsAPI, moodAPI } from "@/lib/api"
import { getMoodOption, moodOptions } from "@/lib/moodwave"
import type { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { EmptyStateGuide } from "@/components/onboarding/empty-state-guide"
import { cn } from "@/lib/utils"

type TrendPoint = { day: string; date: string; intensity: number; mood: MoodType; moodLabel: string }
type MoodShare = { mood: MoodType; label: string; value: number; count: number; color: string }
type HeatCell = {
  date: string
  day: number
  mood: MoodType
  intensity: number
  note?: string
  tags?: string[]
  id?: number
  hasRecord: boolean
}
type MoodRecord = {
  id: number
  mood: MoodType
  date: string
  intensity: number
  tags: string[]
  note: string
}
type WeeklyApiItem = { date: string; mood_type: MoodType; avg_intensity: number }
type DistributionApiItem = { mood_type: MoodType; percentage: number; count?: number }
type HeatmapApiItem = { date: string; mood_type: MoodType; intensity: number; note?: string; tags?: string[]; id?: number }
type MoodApiItem = {
  id: number
  date?: string
  mood_type: MoodType
  intensity: number
  tags?: string[] | string
  note?: string
  created_at?: string
  updated_at?: string
}
type InputModeFilter = "all" | "classic" | "body_map" | "imagery" | "quick"

const sourceOptions: Array<{ value: InputModeFilter; label: string }> = [
  { value: "all", label: "全部来源" },
  { value: "classic", label: "经典记录" },
  { value: "body_map", label: "身体体感" },
  { value: "imagery", label: "意象词" },
  { value: "quick", label: "快速记录" },
]

const bodyPartNames = ["头部", "肩颈", "胸口", "腹部", "手部", "整体"]

function normalize(payload: unknown) {
  const wrapped = payload as { data?: unknown }
  return wrapped?.data ?? payload
}

function toDateKey(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10)
  return value.includes("T") ? value.slice(0, 10) : value
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function formatReadableDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function parseTags(tags?: string[] | string) {
  if (Array.isArray(tags)) return tags
  if (!tags) return []
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean)
  }
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "")
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function recordTitle(record: MoodRecord) {
  const firstLine = record.note.trim().split(/\n/)[0]
  return firstLine || `${getMoodOption(record.mood).label}记录`
}

function mapMoodRecord(item: MoodApiItem): MoodRecord {
  return {
    id: item.id,
    mood: item.mood_type,
    date: toDateKey(item.date || item.created_at || item.updated_at),
    intensity: item.intensity,
    tags: parseTags(item.tags),
    note: item.note || "",
  }
}

function getRecordSource(record: MoodRecord): InputModeFilter {
  if (record.tags.some((tag) => tag === "身体体感" || bodyPartNames.some((part) => tag.startsWith(`${part}-`)))) return "body_map"
  if (record.tags.some((tag) => tag === "意象词记录" || tag.startsWith("意象-"))) return "imagery"
  if (record.tags.includes("快速记录")) return "quick"
  return "classic"
}

function buildTrendFromRecords(records: MoodRecord[], selectedMonth: Date): TrendPoint[] {
  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`
  return records
    .filter((record) => record.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((record) => {
      const mood = getMoodOption(record.mood)
      return {
        day: String(Number(record.date.slice(-2))),
        date: record.date,
        intensity: record.intensity,
        mood: record.mood,
        moodLabel: mood.label,
      }
    })
}

function buildShareFromRecords(records: MoodRecord[], selectedMonth: Date): MoodShare[] {
  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`
  const monthRecords = records.filter((record) => record.date.startsWith(monthKey))
  const total = Math.max(monthRecords.length, 1)
  return moodOptions
    .map((mood) => {
      const count = monthRecords.filter((record) => record.mood === mood.value).length
      return {
        mood: mood.value,
        label: mood.label,
        value: Math.round((count / total) * 100),
        count,
        color: mood.accent,
      }
    })
    .filter((item) => item.count > 0)
}

function buildHeatmap(records: MoodRecord[], selectedMonth: Date, apiHeatmap: HeatCell[]) {
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`
  const recordsByDay = new Map(records.filter((record) => record.date.startsWith(monthKey)).map((record) => [Number(record.date.slice(-2)), record]))
  const apiByDay = new Map(apiHeatmap.map((cell) => [cell.day, cell]))

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const record = recordsByDay.get(day)
    if (record) {
      return {
        date: record.date,
        day,
        mood: record.mood,
        intensity: record.intensity,
        note: record.note,
        tags: record.tags,
        id: record.id,
        hasRecord: true,
      }
    }

    const apiCell = apiByDay.get(day)
    if (apiCell) return apiCell

    return {
      date: `${monthKey}-${String(day).padStart(2, "0")}`,
      day,
      mood: "neutral" as MoodType,
      intensity: 0,
      hasRecord: false,
    }
  })
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TrendPoint; value: number }> }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-[18px] border border-[#f8dfe7] bg-white/95 px-4 py-3 text-sm shadow-[0_14px_34px_rgba(255,181,194,0.22)]">
      <p className="font-semibold text-slate-700">{formatReadableDate(point.date)}</p>
      <p className="mt-1 text-slate-500">
        {getMoodOption(point.mood).emoji} {point.moodLabel} · 强度 {point.intensity}/10
      </p>
    </div>
  )
}

const intensityTicks = [0, 2, 4, 6, 8, 10]

export default function AnalyticsPage() {
  const [activeDay, setActiveDay] = useState(() => new Date().getDate())
  const [selectedMonth, setSelectedMonth] = useState(() => new Date())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [selectedShareMood, setSelectedShareMood] = useState<MoodType | null>(null)
  const [sourceFilter, setSourceFilter] = useState<InputModeFilter>("all")
  const [aiInsight, setAiInsight] = useState("")
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [shareData, setShareData] = useState<MoodShare[]>([])
  const [apiHeatmapData, setApiHeatmapData] = useState<HeatCell[]>([])
  const [records, setRecords] = useState<MoodRecord[]>([])
  const [hasRealData, setHasRealData] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MoodRecord | null>(null)
  const [editMood, setEditMood] = useState<MoodType>("calm")
  const [editDate, setEditDate] = useState("")
  const [editIntensity, setEditIntensity] = useState(5)
  const [editTags, setEditTags] = useState("")
  const [editNote, setEditNote] = useState("")
  const [savingId, setSavingId] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadAnalytics() {
      const month = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`
      try {
        const [weeklyResponse, summaryResponse, moodResponse] = await Promise.all([
          analyticsAPI.weekly({ month }),
          analyticsAPI.summary({ month }),
          moodAPI.list({ limit: 100 }),
        ])
        if (!active) return

        const weekly = normalize(weeklyResponse.data) as { weekly_trend?: WeeklyApiItem[] }
        const summary = normalize(summaryResponse.data) as {
          insight?: string
          suggestion?: string
          mood_distribution?: DistributionApiItem[]
          heatmap_data?: HeatmapApiItem[]
        }
        const moodPayload = normalize(moodResponse.data)
        const loadedRecords = Array.isArray(moodPayload) ? (moodPayload as MoodApiItem[]).map(mapMoodRecord) : []
        const hasApiAnalytics =
          loadedRecords.length > 0 ||
          Boolean(weekly.weekly_trend?.length) ||
          Boolean(summary.mood_distribution?.length) ||
          Boolean(summary.heatmap_data?.some((item) => item.intensity > 0))
        setHasRealData(hasApiAnalytics)

        if (loadedRecords.length > 0) {
          setRecords(loadedRecords)
          const trend = buildTrendFromRecords(loadedRecords, selectedMonth)
          console.log("[analytics] trendData:", JSON.stringify(trend))
          setTrendData(trend)
          setShareData(buildShareFromRecords(loadedRecords, selectedMonth))
        } else if (Array.isArray(weekly.weekly_trend) && weekly.weekly_trend.length > 0) {
          setTrendData(
            weekly.weekly_trend.slice(-30).map((item) => {
              const mood = getMoodOption(item.mood_type)
              return {
                day: String(Number(item.date.slice(-2))),
                date: item.date,
                intensity: item.avg_intensity,
                mood: item.mood_type,
                moodLabel: mood.label,
              }
            }),
          )
        } else {
          setTrendData([])
          setShareData([])
        }

        if (loadedRecords.length === 0 && Array.isArray(summary.mood_distribution) && summary.mood_distribution.length > 0) {
          setShareData(
            summary.mood_distribution.map((item) => {
              const mood = getMoodOption(item.mood_type)
              return {
                mood: item.mood_type,
                label: mood.label,
                value: Math.round(item.percentage),
                count: item.count ?? 0,
                color: mood.accent,
              }
            }),
          )
        }

        if (Array.isArray(summary.heatmap_data)) {
          setApiHeatmapData(
            summary.heatmap_data.map((item) => ({
              date: item.date,
              day: Number(item.date.slice(-2)),
              mood: item.mood_type,
              intensity: item.intensity,
              note: item.note,
              tags: item.tags,
              id: item.id,
              hasRecord: item.intensity > 0,
            })),
          )
        }
        setAiInsight(summary.insight || summary.suggestion || "")
      } catch {
        if (!active) return
        setHasRealData(false)
        setRecords([])
        setTrendData([])
        setShareData([])
        setAiInsight("")
      }
    }

    loadAnalytics()
    return () => {
      active = false
    }
  }, [selectedMonth, reloadKey])

  const visibleMonth = useMemo(() => formatMonth(selectedMonth), [selectedMonth])
  const heatmapDays = useMemo(() => buildHeatmap(records, selectedMonth, apiHeatmapData), [apiHeatmapData, records, selectedMonth])
  const heatmapWeeks = useMemo(() => {
    const firstDay = (new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay() + 6) % 7
    const cells: Array<HeatCell | null> = [...Array.from({ length: firstDay }, () => null), ...heatmapDays]
    while (cells.length % 7 !== 0) cells.push(null)
    return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7))
  }, [heatmapDays, selectedMonth])
  const activeCell = heatmapDays.find((cell) => cell.day === activeDay) ?? heatmapDays.find((cell) => cell.hasRecord) ?? heatmapDays[0]
  const monthRecords = useMemo(() => {
    const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`
    return records
      .filter((record) => record.date.startsWith(monthKey))
      .filter((record) => (selectedShareMood ? record.mood === selectedShareMood : true))
      .filter((record) => (sourceFilter === "all" ? true : getRecordSource(record) === sourceFilter))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [records, selectedMonth, selectedShareMood, sourceFilter])
  const v2SourceStats = useMemo(() => {
    const stats = sourceOptions.filter((option) => option.value !== "all").map((option) => ({
      ...option,
      count: records.filter((record) => getRecordSource(record) === option.value).length,
    }))
    return stats
  }, [records])
  const bodyPartStats = useMemo(() => {
    return bodyPartNames
      .map((part) => ({
        part,
        count: records.reduce((count, record) => count + record.tags.filter((tag) => tag.startsWith(`${part}-`)).length, 0),
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [records])
  const vectorSnapshot = useMemo(() => {
    const anxious = records.filter((record) => record.mood === "anxious").length
    const sad = records.filter((record) => record.mood === "sad").length
    const angry = records.filter((record) => record.mood === "angry").length
    const calm = records.filter((record) => record.mood === "calm").length
    const happy = records.filter((record) => record.mood === "happy").length
    const total = Math.max(records.length, 1)
    return [
      { label: "焦虑", value: Math.round((anxious / total) * 100) },
      { label: "疲惫/低落", value: Math.round((sad / total) * 100) },
      { label: "释放需求", value: Math.round((angry / total) * 100) },
      { label: "平静", value: Math.round((calm / total) * 100) },
      { label: "愉悦", value: Math.round((happy / total) * 100) },
    ]
  }, [records])
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => new Date(selectedMonth.getFullYear(), index, 1)),
    [selectedMonth],
  )

  function moveMonth(offset: number) {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
    setActiveDay(1)
    setSelectedShareMood(null)
  }

  function startEdit(record: MoodRecord) {
    setEditingRecord(record)
    setEditMood(record.mood)
    setEditDate(record.date)
    setEditIntensity(record.intensity)
    setEditTags(record.tags.join("、"))
    setEditNote(record.note)
  }

  async function saveEdit() {
    if (!editingRecord) return
    const tags = editTags.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean)
    const nextRecord: MoodRecord = {
      ...editingRecord,
      mood: editMood,
      date: editDate,
      intensity: editIntensity,
      tags,
      note: editNote,
    }
    setSavingId(editingRecord.id)
    try {
      await moodAPI.update(String(editingRecord.id), {
        date: editDate,
        mood_type: editMood,
        intensity: editIntensity,
        tags: JSON.stringify(tags),
        note: editNote,
      })
      setRecords((current) => current.map((record) => (record.id === editingRecord.id ? nextRecord : record)))
      setEditingRecord(null)
      setReloadKey((k) => k + 1)
    } finally {
      setSavingId(null)
    }
  }

  async function deleteRecord(record: MoodRecord) {
    const confirmed = window.confirm(`确定删除 ${formatReadableDate(record.date)} 的情绪记录吗？`)
    if (!confirmed) return
    setSavingId(record.id)
    try {
      await moodAPI.delete(String(record.id))
      setRecords((current) => current.filter((item) => item.id !== record.id))
      if (editingRecord?.id === record.id) setEditingRecord(null)
      setReloadKey((k) => k + 1)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <MoodWaveShell
      title="我的情绪趋势"
      rightSlot={
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setShowMonthPicker((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_24px_rgba(255,205,216,0.18)]"
          >
            {visibleMonth}
            <CalendarDays className="h-4 w-4 text-[#ff7f96]" />
          </button>
          {showMonthPicker ? (
            <div className="absolute right-0 top-12 z-30 w-72 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_18px_44px_rgba(255,181,194,0.22)]">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                <button type="button" onClick={() => setSelectedMonth((current) => new Date(current.getFullYear() - 1, current.getMonth(), 1))} className="rounded-full px-3 py-1 hover:bg-[#fff4f7]">上一年</button>
                <span>{selectedMonth.getFullYear()}</span>
                <button type="button" onClick={() => setSelectedMonth((current) => new Date(current.getFullYear() + 1, current.getMonth(), 1))} className="rounded-full px-3 py-1 hover:bg-[#fff4f7]">下一年</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {monthOptions.map((date) => {
                  const active = date.getMonth() === selectedMonth.getMonth()
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(date)
                        setShowMonthPicker(false)
                        setActiveDay(1)
                        setSelectedShareMood(null)
                      }}
                      className={cn("rounded-full px-3 py-2 text-sm transition", active ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white" : "bg-[#fff8fb] text-slate-600 hover:bg-[#fff1f5]")}
                    >
                      {date.getMonth() + 1}月
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-5 overflow-hidden">
        {!hasRealData ? <EmptyStateGuide variant="analytics" /> : null}
        <section className="min-w-0 overflow-hidden rounded-[34px] bg-white/82 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.2)] ring-1 ring-white/75 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-800">月度情绪概览</h2>
              <p className="mt-1 text-sm text-slate-500">30 天趋势和月度分布合并在这里，先看整体，再筛记录。</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => moveMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm" aria-label="上个月">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-24 text-center text-sm font-semibold text-slate-700">{visibleMonth}</span>
              <button type="button" onClick={() => moveMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm" aria-label="下个月">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 h-[300px] min-w-0 overflow-hidden md:h-[256px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 16, right: 8, left: -12, bottom: 8 }}>
                <defs>
                  <linearGradient id="intensityLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff7f96" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#ff7f96" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={10} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 10]} ticks={intensityTicks} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} width={34} />
                <Tooltip content={<TrendTooltip />} />
                <Area type="monotone" dataKey="intensity" name="情绪强度" stroke="#ff7f96" fill="url(#intensityLine)" strokeWidth={3} dot={{ r: 3, fill: "#ff7f96", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#ff7f96" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shareData.length > 0 ? shareData.map((item) => (
              <button
                key={item.mood}
                type="button"
                onClick={() => setSelectedShareMood((current) => (current === item.mood ? null : item.mood))}
                className={cn(
                  "min-w-0 rounded-[22px] bg-[#fffafb] p-4 text-left ring-1 ring-[#f6e4e9] transition hover:-translate-y-0.5",
                  selectedShareMood === item.mood && "ring-2 ring-[#ff9caf]",
                )}
              >
                <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-semibold text-slate-700">{getMoodOption(item.mood).emoji} {item.label}</span>
                  <span className="text-slate-400">{item.value}%</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#f5edf0]">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">{item.count || Math.round(item.value / 10)} 条记录</p>
              </button>
            )) : (
              <div className="rounded-[22px] bg-[#fffafb] p-4 text-sm text-slate-500 ring-1 ring-[#f6e4e9]">这个月还没有足够的趋势数据。</div>
            )}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[34px] bg-white/82 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-800">年度热力日历</h2>
              <p className="mt-1 text-sm text-slate-500">颜色深度代表情绪强度。</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => moveMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm" aria-label="上个月">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-24 text-center text-sm font-semibold text-slate-700">{visibleMonth}</span>
              <button type="button" onClick={() => moveMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm" aria-label="下个月">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 max-w-full overflow-hidden pb-2">
            <div className="w-full">
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-slate-400 sm:gap-2 sm:text-xs">
                {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((day) => (
                  <span key={day} className={cn((day === "周六" || day === "周日") && "text-[#ff7894]")}>{day}</span>
                ))}
              </div>
              <div className="mt-3 grid gap-1.5 sm:gap-2">
                {heatmapWeeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {week.map((cell, dayIndex) => {
                      if (!cell) return <div key={`${weekIndex}-${dayIndex}`} className="aspect-square rounded-[14px] bg-transparent sm:rounded-[16px]" />
                      const mood = getMoodOption(cell.mood)
                      const alpha = cell.hasRecord ? 0.22 + cell.intensity * 0.07 : 0.12
                      const detail = cell.hasRecord
                        ? `${formatReadableDate(cell.date)} ${mood.label} · 强度 ${cell.intensity}/10${cell.note ? ` · ${cell.note}` : ""}`
                        : `${formatReadableDate(cell.date)} 暂无记录`
                      return (
                        <button
                          key={cell.date}
                          type="button"
                          title={detail}
                          onClick={() => setActiveDay(cell.day)}
                          onMouseEnter={() => setActiveDay(cell.day)}
                          onFocus={() => setActiveDay(cell.day)}
                          className={cn(
                            "group relative aspect-square min-w-0 rounded-[14px] p-1.5 text-left text-[11px] text-slate-700 ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-[#ffb5c2] sm:rounded-[16px] sm:p-2 sm:text-xs",
                            activeDay === cell.day && "ring-2 ring-[#ff8fa3]",
                          )}
                          style={{ backgroundColor: cell.hasRecord ? withAlpha(mood.accent, alpha) : "#f7f1f4" }}
                        >
                          <span className="font-semibold">{cell.day}</span>
                          {cell.hasRecord ? <span className="absolute bottom-1 right-1 text-sm sm:bottom-2 sm:right-2 sm:text-lg">{mood.emoji}</span> : null}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {activeCell ? (
            <div className="mt-5 min-w-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#fff8f1] to-[#fff1f5] p-4 shadow-inner md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{formatReadableDate(activeCell.date)}</p>
                  <p className="mt-2 flex min-w-0 items-center gap-2 text-base font-semibold text-slate-800 md:text-lg">
                    <span className="shrink-0 text-3xl">{getMoodOption(activeCell.mood).emoji}</span>
                    <span className="min-w-0 break-words">{activeCell.hasRecord ? `${getMoodOption(activeCell.mood).label} · 强度 ${activeCell.intensity}/10` : "暂无记录"}</span>
                  </p>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-500">{activeCell.note || "这一天还没有写下心情，可以从情绪录入页补一条。"}</p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {(activeCell.tags || []).map((tag) => (
                    <span key={tag} className="rounded-full bg-white/80 px-3 py-1 text-xs text-[#ff6f8c]">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 overflow-hidden rounded-[34px] bg-white/82 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-800">V2 情绪复盘信号</h2>
              <p className="mt-1 text-sm text-slate-500">兼容旧记录；新体感、意象和快速记录会逐步沉淀在这里。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceFilter(option.value)}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-xs font-semibold transition",
                    sourceFilter === option.value ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white" : "bg-[#fffafb] text-slate-500 ring-1 ring-[#f3dfe5]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[28px] bg-[#fffafb] p-4 ring-1 ring-[#f6e4e9]">
              <p className="text-sm font-semibold text-slate-800">记录来源</p>
              <div className="mt-4 space-y-3">
                {v2SourceStats.map((item) => (
                  <div key={item.value}>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{item.label}</span>
                      <span>{item.count} 条</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5]" style={{ width: `${Math.min(100, item.count * 18)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-[#fffafb] p-4 ring-1 ring-[#f6e4e9]">
              <p className="text-sm font-semibold text-slate-800">高频体感区域</p>
              <div className="mt-4 flex min-h-[120px] flex-wrap content-start gap-2">
                {bodyPartStats.length ? bodyPartStats.map((item) => (
                  <span key={item.part} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#ff7894] shadow-sm">
                    {item.part} · {item.count}
                  </span>
                )) : (
                  <p className="text-sm leading-7 text-slate-400">体感记录会在 Phase 6 写入结构化字段；当前先从 tags 兼容统计。</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] bg-gradient-to-br from-[#fff7d8] to-[#effdfa] p-4 ring-1 ring-white/80">
              <p className="text-sm font-semibold text-slate-800">情绪向量占位</p>
              <div className="mt-4 space-y-2">
                {vectorSnapshot.map((item) => (
                  <div key={item.label} className="grid grid-cols-[72px_1fr_36px] items-center gap-2 text-xs text-slate-500">
                    <span>{item.label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-white/80">
                      <div className="h-full rounded-full bg-[#ff9fb4]" style={{ width: `${item.value}%` }} />
                    </div>
                    <span className="text-right">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["收藏", "跳过", "AI 生成"].map((label) => (
              <div key={label} className="rounded-[24px] bg-white/84 p-4 ring-1 ring-[#f6e4e9]">
                <p className="text-sm font-semibold text-slate-800">音乐疗愈反馈 · {label}</p>
                <p className="mt-2 text-xs leading-6 text-slate-400">Phase 5/7 接入后，这里会显示音乐反馈趋势。</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="min-w-0 overflow-hidden rounded-[34px] bg-white/82 p-4 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">AI 月度洞察</h2>
              <Sparkles className="h-5 w-5 text-[#ff8fa3]" />
            </div>
            <div className="mt-4 min-w-0 overflow-hidden break-words rounded-[24px] bg-gradient-to-r from-[#fff5d8] via-[#fff0f5] to-[#effdfa] p-4 text-sm leading-7 text-slate-600">
              <Sparkles className="mr-2 inline h-4 w-4 text-[#ff8fa3]" />
              {aiInsight}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[34px] bg-white/82 p-4 shadow-[0_18px_48px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-800">全部记录</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedShareMood ? `正在查看「${getMoodOption(selectedShareMood).label}」记录` : "支持编辑和删除任意一天的记录"}
                </p>
              </div>
              {selectedShareMood ? (
                <button type="button" onClick={() => setSelectedShareMood(null)} className="inline-flex items-center gap-1 rounded-full bg-[#fff1f5] px-3 py-2 text-sm text-[#ff6f8c]">
                  <X className="h-4 w-4" />
                  清除筛选
                </button>
              ) : null}
            </div>

            <div className="mt-4 max-h-[430px] min-w-0 space-y-3 overflow-y-auto overflow-x-hidden pr-1">
              {monthRecords.length > 0 ? monthRecords.map((record) => {
                const mood = getMoodOption(record.mood)
                return (
                  <article key={record.id} className="min-w-0 overflow-hidden rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f6e4e9]">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-xl">{mood.emoji}</span>
                          <h3 className="min-w-0 max-w-full break-words font-semibold text-slate-800 sm:truncate">{recordTitle(record)}</h3>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">{formatReadableDate(record.date)}</span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">强度 {record.intensity}/10</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{record.note || "这条记录还没有文字描述。"}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {record.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs text-[#ff6f8c]">{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 sm:justify-end">
                        <button type="button" onClick={() => startEdit(record)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-[#ff7f96]" aria-label="编辑记录">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => deleteRecord(record)} disabled={savingId === record.id} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-[#ef8d7b] disabled:opacity-50" aria-label="删除记录">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              }) : (
                <div className="rounded-[24px] bg-[#fffafb] p-6 text-center text-sm text-slate-500 ring-1 ring-[#f6e4e9]">这个筛选下暂时没有记录。</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {editingRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[34px] bg-white p-5 shadow-[0_24px_70px_rgba(255,181,194,0.3)] ring-1 ring-white/80 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">编辑情绪记录</h2>
                <p className="mt-1 text-sm text-slate-500">可以修改日期、情绪、强度、标签和文字内容。</p>
              </div>
              <button type="button" onClick={() => setEditingRecord(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1f5] text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                日期
                <input value={editDate} onChange={(event) => setEditDate(event.target.value)} type="date" className="h-11 rounded-[18px] border border-[#f6dfe6] bg-[#fffafb] px-4 text-sm outline-none focus:ring-2 focus:ring-[#ffb5c2]" />
              </label>

              <div className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">情绪</span>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.value}
                      type="button"
                      onClick={() => setEditMood(mood.value)}
                      className={cn(
                        "rounded-[18px] bg-[#fffafb] px-3 py-3 text-sm ring-1 ring-[#f6e4e9] transition",
                        editMood === mood.value && "ring-2 ring-[#ff9caf]",
                      )}
                    >
                      <span className="block text-xl">{mood.emoji}</span>
                      <span>{mood.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                强度：{editIntensity}/10
                <input value={editIntensity} onChange={(event) => setEditIntensity(Number(event.target.value))} min={1} max={10} type="range" className="accent-[#ff8fa3]" />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                标签
                <input value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="用顿号或逗号分隔" className="h-11 rounded-[18px] border border-[#f6dfe6] bg-[#fffafb] px-4 text-sm outline-none focus:ring-2 focus:ring-[#ffb5c2]" />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                内容
                <textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} rows={4} className="resize-none rounded-[18px] border border-[#f6dfe6] bg-[#fffafb] px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#ffb5c2]" />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingRecord(null)} className="rounded-full bg-[#f7f1f4] px-5 py-2.5 text-sm font-semibold text-slate-500">取消</button>
              <button type="button" onClick={saveEdit} disabled={savingId === editingRecord.id} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(255,151,173,0.24)] disabled:opacity-60">
                <Save className="h-4 w-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MoodWaveShell>
  )
}
