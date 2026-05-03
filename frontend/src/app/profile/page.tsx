"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Bell,
  BookOpen,
  Camera,
  ChevronRight,
  Download,
  Flame,
  HeartHandshake,
  Info,
  LogOut,
  Medal,
  Music2,
  Palette,
  PenLine,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react"
import { analyticsAPI, moodAPI, musicAPI, profileAPI, resolveAssetUrl, uploadAPI } from "@/lib/api"
import { getMoodOption, moodOptions } from "@/lib/moodwave"
import {
  checklist as initialChecklist,
  fallbackRecords,
  fallbackSummary,
  parseMoodRecord,
  parseSummary,
  type MoodRecord,
  type SummaryState,
  unwrapData,
} from "@/lib/profile"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { EditProfileDialog, getMbtiTone, getZodiac } from "@/components/edit-profile-dialog"
import { useAuthStore } from "@/store/auth"
import type { MusicRecommendation, MoodType } from "@/lib/types"

const settingItems = [
  { icon: UserRound, label: "个人信息", helper: "编辑个人资料", action: "profile" },
  { icon: Bell, label: "通知设置", helper: "管理提醒通知" },
  { icon: ShieldCheck, label: "隐私安全", helper: "权限与数据保护" },
  { icon: Palette, label: "主题设置", helper: "切换界面主题" },
  { icon: Download, label: "数据导出", helper: "导出 JSON / CSV", action: "export" },
  { icon: BookOpen, label: "使用指南", helper: "新手使用帮助" },
  { icon: Info, label: "关于我们", helper: "了解 MoodWave 信息" },
]

const exportScopes = [
  { value: "7d", label: "最近 7 天" },
  { value: "30d", label: "最近 30 天" },
  { value: "all", label: "全部记录" },
]

const exportIncludeOptions = [
  { value: "records", label: "情绪记录", helper: "日记、强度、标签和多媒体线索" },
  { value: "summary", label: "分析汇总", helper: "主导情绪、趋势和高频标签" },
  { value: "profile", label: "个人资料", helper: "昵称、MBTI、星座和头像设置" },
  { value: "favorites", label: "收藏音乐", helper: "已收藏的治愈旋律" },
]

function normalizeFavoriteMusic(payload: unknown): MusicRecommendation[] {
  const maybeWrapped = payload as { data?: unknown }
  const source = Array.isArray(payload) ? payload : Array.isArray(maybeWrapped?.data) ? maybeWrapped.data : []
  if (!Array.isArray(source)) return []

  return source.slice(0, 4).map((item, index) => {
    const record = item as Partial<MusicRecommendation> & {
      music_id?: string | number
    }
    return {
      id: String(record.music_id ?? record.id ?? `favorite-${index}`),
      title: record.title ?? "未命名旋律",
      artist: record.artist ?? "MoodWave AI",
      mood_type: record.mood_type ?? "calm",
      url: record.url ?? "",
      duration: record.duration ?? 0,
    }
  })
}

function inferMoodFromText(text: string): MoodType {
  if (/开心|顺利|高兴|快乐|兴奋/.test(text)) return "happy"
  if (/焦虑|紧张|考试|deadline|来不及/.test(text)) return "anxious"
  if (/生气|烦|火大|愤怒/.test(text)) return "angry"
  if (/难过|失落|哭|低落|累|疲惫/.test(text)) return "sad"
  if (/平静|放松|还好|安静/.test(text)) return "calm"
  return "neutral"
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, updateUser, logout } = useAuthStore()
  const [summary, setSummary] = useState<SummaryState>(fallbackSummary)
  const [records, setRecords] = useState<MoodRecord[]>(fallbackRecords)
  const [avatarPreview, setAvatarPreview] = useState("")
  const [checklistItems, setChecklistItems] = useState(initialChecklist)
  const [newChecklistText, setNewChecklistText] = useState("")
  const [favoriteMusic, setFavoriteMusic] = useState<MusicRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [settingsNotice, setSettingsNotice] = useState("")
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json")
  const [exportScope, setExportScope] = useState("all")
  const [exportInclude, setExportInclude] = useState(["records", "summary", "profile", "favorites"])

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
        musicAPI
          .favorites()
          .then((response) => {
            setFavoriteMusic(normalizeFavoriteMusic(response.data))
          })
          .catch(() => {
            setFavoriteMusic([
              { id: "fav-1", title: "宁静的午后", artist: "MoodWave AI", mood_type: "calm", url: "", duration: 225 },
              { id: "fav-2", title: "晴朗的午后", artist: "MoodWave AI", mood_type: "happy", url: "", duration: 214 },
            ])
          })
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
  const username = user?.username || "MoodWave 用户"
  const mbti = user?.mbti || ""
  const zodiac = getZodiac(user?.zodiac)
  const avatarInitial = username.slice(0, 1).toUpperCase()
  const energyStats = [
    {
      icon: Flame,
      title: "连续记录",
      value: `${summary.streakDays}天`,
      helper: "稳定记录会让情绪线索更清晰",
      tone: "bg-[#fff7dc]",
      iconTone: "bg-[#fff0be] text-[#bf7c16]",
    },
    {
      icon: Sparkles,
      title: "最亮情绪",
      value: dominant.label,
      helper: "适合放进快乐能量库反复回看",
      tone: "bg-[#effdfa]",
      iconTone: "bg-[#d8f7ef] text-[#2d8f78]",
    },
    {
      icon: Music2,
      title: "本周音乐",
      value: `${summary.musicCount}首`,
      helper: "收藏喜欢的旋律，建立自己的歌单",
      tone: "bg-[#fff4f7]",
      iconTone: "bg-[#ffe1e9] text-[#d95774]",
    },
  ]

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    try {
      const response = await uploadAPI.avatar(file)
      const payload = unwrapData(response.data) as { url?: string }
      if (payload?.url) {
        updateUser({ avatar_url: payload.url })
        setAvatarPreview(resolveAssetUrl(payload.url))
        setSettingsNotice("头像上传成功，已同步到个人主页。")
      }
    } catch {
      setSettingsNotice("头像已在本地预览，后端头像上传接口就绪后会自动同步。")
    }
  }

  function addChecklistItem() {
    const text = newChecklistText.trim()
    if (!text) return
    setChecklistItems((current) => [...current, { text, mood: inferMoodFromText(text), done: false }])
    setNewChecklistText("")
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function getLocalExportPayload() {
    return {
      profile: {
        username,
        email: user?.email ?? "",
        mbti: user?.mbti ?? "",
        zodiac: user?.zodiac ?? "",
        avatar_url: user?.avatar_url ?? "",
        avatar_character: user?.avatar_character ?? "",
        character_color: user?.character_color ?? "",
      },
      summary,
      records: records.map((record) => ({
        id: record.id,
        date: record.date,
        mood: record.mood,
        tag: record.tag,
        title: record.title,
        note: record.note,
      })),
      favorites: favoriteMusic.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        mood_type: track.mood_type,
        duration: track.duration,
      })),
      checklist: checklistItems,
      exported_at: new Date().toISOString(),
      scope: exportScope,
    }
  }

  function csvCell(value: unknown) {
    const text = Array.isArray(value) || (typeof value === "object" && value !== null)
      ? JSON.stringify(value)
      : String(value ?? "")
    return `"${text.replace(/"/g, '""')}"`
  }

  function appendCsvSection(lines: string[], title: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    lines.push(`# --- ${title} ---`)
    lines.push(headers.join(","))
    rows.forEach((row) => {
      lines.push(headers.map((header) => csvCell(row[header])).join(","))
    })
    lines.push("")
  }

  function exportLocalData(format: "json" | "csv") {
    const payload = getLocalExportPayload()
    const selectedPayload = exportInclude.reduce<Record<string, unknown>>((data, key) => {
      data[key] = payload[key as keyof typeof payload]
      return data
    }, { exported_at: payload.exported_at, scope: payload.scope })

    const csvLines = ["\ufeff"]
    if (exportInclude.includes("profile")) {
      appendCsvSection(csvLines, "个人资料", [payload.profile])
    }
    if (exportInclude.includes("records")) {
      appendCsvSection(csvLines, "情绪记录", payload.records)
    }
    if (exportInclude.includes("favorites")) {
      appendCsvSection(csvLines, "收藏音乐", payload.favorites)
    }
    if (exportInclude.includes("summary")) {
      appendCsvSection(csvLines, "分析汇总", [payload.summary as unknown as Record<string, unknown>])
    }

    const content =
      format === "json"
        ? JSON.stringify(selectedPayload, null, 2)
        : csvLines.join("\n")
    downloadBlob(
      new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" }),
      `moodwave-records.${format}`,
    )
  }

  async function exportProfileData(format: "json" | "csv") {
    const include = exportInclude.length > 0 ? exportInclude : ["records"]
    try {
      const response = await profileAPI.exportFull({ format, scope: exportScope, include })
      if (format === "csv") {
        downloadBlob(response.data as Blob, "moodwave-export.csv")
      } else {
        const payload = response.data?.data ?? response.data
        downloadBlob(
          new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
          "moodwave-export.json",
        )
      }
      setSettingsNotice(`已从后端导出 ${format.toUpperCase()} 文件。`)
    } catch {
      exportLocalData(format)
      setSettingsNotice(`后端导出暂时不可用，已导出当前页面加载的 ${format.toUpperCase()} 数据。`)
    }
  }

  function handleLogout() {
    const confirmed = window.confirm("确定要退出登录吗？")
    if (!confirmed) return
    logout()
    setShowSettingsMenu(false)
    router.push("/login")
  }

  return (
    <MoodWaveShell
      title="个人主页"
      rightSlot={
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSettingsMenu((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-[0_10px_24px_rgba(255,205,216,0.2)] transition hover:text-slate-800"
            aria-label="打开设置菜单"
            aria-expanded={showSettingsMenu}
          >
            <Settings className="h-4 w-4" />
          </button>
          {showSettingsMenu ? (
            <div className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[86dvh] min-h-[360px] flex-col overflow-hidden rounded-t-[34px] border border-white/80 bg-white/96 p-4 shadow-[0_-18px_50px_rgba(255,181,194,0.24)] backdrop-blur-xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-12 md:max-h-[calc(100vh-7rem)] md:min-h-0 md:w-[340px] md:rounded-[28px] md:shadow-[0_20px_50px_rgba(255,181,194,0.24)]">
              <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-[#f2d6de] md:hidden" />
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#7ed9cb]" />
                  <p className="font-semibold text-slate-900">功能与设置</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsMenu(false)}
                  className="rounded-full px-3 py-1 text-xs text-slate-400 transition hover:bg-[#fff4f7] hover:text-slate-700"
                >
                  收起
                </button>
              </div>
              {settingsNotice ? (
                <div className="mb-3 shrink-0 rounded-[18px] border border-[#d6f3ea] bg-[#effdfa] px-3 py-2 text-xs leading-5 text-slate-600">
                  {settingsNotice}
                </div>
              ) : null}
              <div className="grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+12px)] pr-1 md:max-h-[calc(100vh-14rem)]">
                {settingItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.action === "profile") {
                          setShowEditProfile(true)
                          setShowSettingsMenu(false)
                          return
                        }
                        if (item.action === "export") {
                          setShowExportDialog(true)
                          setShowSettingsMenu(false)
                          return
                        }
                        setSettingsNotice(`${item.label}即将上线，设置会逐步开放。`)
                      }}
                      className="flex min-h-[52px] items-center gap-3 rounded-[20px] bg-[#fffafb] p-3 text-left ring-1 ring-[#f8e7eb] transition hover:-translate-y-0.5 hover:bg-white"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#fff4f7]">
                        <Icon className="h-4 w-4 text-[#62bda9]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">{item.label}</span>
                        <span className="mt-1 block text-xs text-slate-400">{item.helper}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex min-h-[52px] items-center gap-3 rounded-[20px] border border-[#ffd8df] bg-[#fff7f8] p-3 text-left text-[#ef6f7f] transition hover:-translate-y-0.5 hover:bg-white md:hidden"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">退出登录</span>
                    <span className="mt-1 block text-xs text-[#e996a3]">回到登录页</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#ef9aaa]" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      <EditProfileDialog open={showEditProfile} onOpenChange={setShowEditProfile} />
      {showExportDialog ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/18 px-0 backdrop-blur-sm md:grid md:place-items-center md:px-4">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[34px] bg-white/96 p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-[0_28px_90px_rgba(255,181,194,0.3)] ring-1 ring-white md:max-w-md md:rounded-[34px] md:p-6">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#f2d6de] md:hidden" />
            <h2 className="text-2xl font-semibold text-slate-900">导出情绪数据</h2>
            <p className="mt-1 text-sm text-slate-500">将从后端导出你的完整情绪记录，接口异常时会自动保留当前页面数据。</p>
            <label className="mt-5 block">
              <span className="text-sm font-medium text-slate-700">格式</span>
              <select
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as "json" | "csv")}
                className="mt-2 min-h-12 w-full rounded-[20px] border border-[#f0dbe2] bg-white px-4 text-sm outline-none focus:border-[#ff9fb4]"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-700">范围</span>
              <select
                value={exportScope}
                onChange={(event) => setExportScope(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[20px] border border-[#f0dbe2] bg-white px-4 text-sm outline-none focus:border-[#ff9fb4]"
              >
                {exportScopes.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5">
              <p className="text-sm font-medium text-slate-700">导出内容</p>
              <div className="mt-3 grid gap-2.5">
                {exportIncludeOptions.map((option) => {
                  const checked = exportInclude.includes(option.value)
                  return (
                    <label
                      key={option.value}
                      className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[20px] bg-[#fffafb] px-3 py-2 ring-1 ring-[#f8e7eb]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setExportInclude((current) =>
                            checked ? current.filter((item) => item !== option.value) : [...current, option.value],
                          )
                        }}
                        className="h-4 w-4 accent-[#ff8fa3]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">{option.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-400">{option.helper}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowExportDialog(false)}
                className="min-h-11 rounded-full bg-[#fff4f7] px-5 text-sm font-semibold text-slate-600"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  void exportProfileData(exportFormat)
                  setShowExportDialog(false)
                }}
                disabled={exportInclude.length === 0}
                className="min-h-11 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                导出并下载
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid min-w-0 max-w-6xl gap-5 xl:grid-cols-[0.95fr_1.05fr] xl:items-stretch">
          <section className="min-w-0 overflow-hidden rounded-[36px] bg-white/82 shadow-[0_24px_70px_rgba(255,206,216,0.24)] ring-1 ring-white/75 xl:col-start-1 xl:row-start-1 xl:h-full">
          <div className="relative min-h-[190px] bg-[radial-gradient(circle_at_20%_15%,rgba(255,181,194,0.6),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(168,230,207,0.72),transparent_34%),linear-gradient(135deg,#fff4f7,#f0fffb_48%,#fff8df)] px-6 pb-7 pt-8 md:px-9">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-[linear-gradient(135deg,rgba(255,255,255,0.48),rgba(255,255,255,0))]" />
            <div className="relative flex flex-col items-center text-center md:flex-row md:text-left">
              <label className="group relative grid h-28 w-28 shrink-0 cursor-pointer place-items-center rounded-full bg-white p-2 shadow-[0_18px_42px_rgba(255,159,180,0.28)]">
                {avatarPreview || user?.avatar_url ? (
                  <div
                    role="img"
                    aria-label={`${username}的头像`}
                    className="aspect-square h-full w-full rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${avatarPreview || resolveAssetUrl(user?.avatar_url)})` }}
                  />
                ) : (
                  <div className="grid aspect-square h-full w-full place-items-center rounded-full bg-gradient-to-br from-[#ffb5c2] via-[#fff6d6] to-[#a8e6cf] text-4xl font-semibold text-white">
                    {avatarInitial}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-white text-[#ff7894] shadow-md transition group-hover:-translate-y-0.5">
                  <Camera className="h-4 w-4" />
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarChange(event.target.files?.[0])} />
              </label>
              <div className="mt-5 min-w-0 md:ml-6 md:mt-0">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h2 className="text-3xl font-semibold text-slate-900">{username}</h2>
                  {mbti ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getMbtiTone(mbti)}`}>
                      {mbti}
                    </span>
                  ) : null}
                  {zodiac ? (
                    <span className="rounded-full bg-white/82 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-[#f8e7eb]">
                      {zodiac.symbol} {zodiac.label}
                    </span>
                  ) : null}
                </div>
                {!mbti || !zodiac ? (
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(true)}
                    className="mt-3 rounded-full bg-white/86 px-4 py-2 text-xs font-semibold text-[#ff718b] ring-1 ring-[#ffd9e2]"
                  >
                    设置你的 MBTI + 星座 →
                  </button>
                ) : null}
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

          <section className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.2)] ring-1 ring-white/75 md:p-6 xl:col-start-1 xl:row-start-2">
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

          <div className="flex flex-col rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6 xl:col-start-2 xl:row-start-1 xl:h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">快乐能量库</h3>
              <Sparkles className="h-5 w-5 text-[#ff9fb4]" />
            </div>
            <div className="mt-5 grid flex-1 gap-3 sm:grid-cols-3">
              {energyStats.map((item) => {
                const Icon = item.icon
                return (
                <div key={item.title} className={`rounded-[26px] ${item.tone} p-4 shadow-[0_12px_26px_rgba(255,216,225,0.14)] ring-1 ring-white/80 sm:flex sm:flex-col sm:justify-center`}>
                  <div className={`grid h-10 w-10 place-items-center rounded-2xl ${item.iconTone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-600">{item.title}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.helper}</p>
                </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6 xl:col-start-2 xl:row-start-2">
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

          <div className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6 xl:col-start-1 xl:row-start-3">
            <h3 className="text-xl font-semibold">心境清单</h3>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={newChecklistText}
                onChange={(event) => setNewChecklistText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addChecklistItem()
                }}
                placeholder="添加一个想照顾自己的小任务"
                className="min-h-11 flex-1 rounded-full border border-[#f0dbe2] bg-white px-4 text-sm outline-none focus:border-[#ff9fb4]"
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                添加
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {checklistItems.map((item, index) => {
                const mood = getMoodOption(item.mood)
                return (
                  <div key={`${item.text}-${index}`} className="flex items-center gap-3 rounded-[24px] bg-white/88 p-4 ring-1 ring-[#f8e7eb]">
                    <button
                      type="button"
                      onClick={() => setChecklistItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, done: !entry.done } : entry))}
                      className={item.done ? "grid h-6 w-6 place-items-center rounded-full bg-[#a8e6cf] text-xs text-white" : "h-6 w-6 rounded-full border-2 border-[#ffd5df]"}
                      aria-label={item.done ? "标记未完成" : "标记完成"}
                    >
                      {item.done ? "✓" : ""}
                    </button>
                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{item.text}</span>
                    <label className="relative shrink-0">
                      <span className="sr-only">调整情绪标签</span>
                      <select
                        value={item.mood}
                        onChange={(event) => {
                          const nextMood = event.target.value as MoodType
                          setChecklistItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, mood: nextMood } : entry))
                        }}
                        className="appearance-none rounded-full border-0 px-3 py-1 pr-7 text-xs text-slate-600 outline-none ring-1 ring-white/70"
                        style={{ backgroundColor: mood.softAccent }}
                      >
                        {moodOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-slate-400" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setChecklistItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                      className="text-slate-300 transition hover:text-[#ff7894]"
                      aria-label="删除清单"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,216,225,0.18)] ring-1 ring-white/75 md:p-6 xl:col-start-2 xl:row-start-3">
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {favoriteMusic.map((track) => {
                const mood = getMoodOption(track.mood_type)
                return (
                  <article key={track.id} className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e7eb]">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-[18px] text-xl" style={{ backgroundColor: mood.softAccent }}>
                        ♪
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{track.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{track.artist} · {mood.label}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
      </div>
    </MoodWaveShell>
  )
}
