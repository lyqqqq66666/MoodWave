"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, BarChart3, CalendarDays, ChevronDown, ChevronUp, Clock3, Feather, Flame, HeartPulse, Mic2, Music2, PenLine, Play, Plus, Sparkles, Trash2 } from "lucide-react"
import { aiAPI, analyticsAPI, moodAPI, uploadAPI } from "@/lib/api"
import { getMoodOption, moodOptions, moodTagOptions } from "@/lib/moodwave"
import { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { BodySensationMap } from "@/components/body-sensation-map"
import { CompanionPetOrb } from "@/components/companion-avatar"
import { MoodAnalysisReport, type MoodAnalysisReportData } from "@/components/mood-analysis-report"
import { MoodMediaUpload, type MoodImageAttachment } from "@/components/mood-media-upload"
import { MoodVoiceRecorder } from "@/components/mood-voice-recorder"
import { RecordDatePicker } from "@/components/record-date-picker"
import {
  bodyPartOptions,
  bodyPresets,
  breathOptions,
  defaultFaceExpression,
  faceExpressionOptions,
  getCompanionBodyFeedback,
  mapBodyEntryToLegacyMood,
  musicGoalOptions,
  type BodyPartId,
  type BodySensationSelection,
  type BreathState,
  type FaceExpression,
  type MusicGoal,
} from "@/lib/body-sensation"
import { useAuthGuard } from "@/hooks/useAuthGuard"
import { cn, convertBlobToWav } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import { useGuestStore } from "@/store/guest"

const steps = ["心情", "记录", "分析"]

type MoodOverviewRecord = {
  id: string | number
  date: string
  mood_type: MoodType
  intensity: number
  tags: string[]
  note?: string
  created_at?: string
}

type WeeklyTrendItem = {
  date: string
  mood_type: MoodType
  count?: number
  avg_intensity: number
}

type MoodOverviewSummary = {
  dominant_mood?: MoodType
  streak_days?: number
  top_tags?: string[]
  total_moods?: number
}

const fallbackRadar = [
  { mood: "开心", score: 58 },
  { mood: "平静", score: 72 },
  { mood: "焦虑", score: 28 },
  { mood: "愤怒", score: 12 },
  { mood: "悲伤", score: 18 },
  { mood: "平淡", score: 42 },
]

const imageryWordBanks = [
  ["乌云", "乱线", "密闭房间", "浓雾", "低气压", "死水", "碎玻璃", "空房间"],
  ["慢流沙", "没电灯泡", "负重背包", "阴天傍晚", "浑浊湖水", "旧毛衣", "没信号"],
  ["蜂鸣", "乱风", "碎纸屑", "摇晃水杯", "噪点雪花", "刺眼灯光"],
  ["晚风", "湖面", "暖阳", "软云", "溪流", "萤火", "落叶", "星空"],
  ["想放空", "想安静", "想被安抚", "想振奋", "想慢慢平复", "想被陪着"],
]

const anxiousImagery = ["乌云", "乱线", "密闭房间", "浓雾", "低气压", "蜂鸣", "乱风", "噪点雪花", "刺眼灯光"]
const sadImagery = ["死水", "空房间", "慢流沙", "没电灯泡", "负重背包", "阴天傍晚", "浑浊湖水", "旧毛衣", "没信号"]
const calmImagery = ["晚风", "湖面", "暖阳", "软云", "溪流", "萤火", "落叶", "星空", "想放空", "想安静", "想被安抚", "想慢慢平复", "想被陪着"]

function formatDateHeadline(value: string) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return "今天"
  return `${Number(month)}月${Number(day)}日`
}

function unwrapApiData(payload: any) {
  return payload?.data ?? payload
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      return value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

function normalizeMoodRecord(item: any): MoodOverviewRecord | null {
  if (!item?.mood_type || !item?.date) return null
  return {
    id: item.id ?? `${item.date}-${item.mood_type}-${item.intensity ?? 0}`,
    date: String(item.date),
    mood_type: item.mood_type,
    intensity: Number(item.intensity) || 6,
    tags: normalizeTags(item.tags),
    note: item.note || "",
    created_at: item.created_at || item.updated_at || item.date,
  }
}

function sortMoodRecords(records: MoodOverviewRecord[]) {
  return [...records].sort((a, b) => {
    const createdCompare = String(b.created_at ?? b.date).localeCompare(String(a.created_at ?? a.date))
    if (createdCompare !== 0) return createdCompare
    return String(b.date).localeCompare(String(a.date))
  })
}

function calculateStreakDays(records: MoodOverviewRecord[]) {
  const dates = new Set(records.map((record) => record.date).filter(Boolean))
  let streak = 0
  const cursor = new Date()
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function buildWeeklyTrendFromRecords(records: MoodOverviewRecord[]): WeeklyTrendItem[] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    return date.toISOString().slice(0, 10)
  })

  return days.map((date) => {
    const dayRecords = records.filter((record) => record.date === date)
    const fallbackMood = dayRecords[0]?.mood_type ?? "neutral"
    return {
      date,
      mood_type: fallbackMood,
      count: dayRecords.length,
      avg_intensity: dayRecords.length
        ? Math.round((dayRecords.reduce((sum, record) => sum + record.intensity, 0) / dayRecords.length) * 10) / 10
        : 0,
    }
  })
}

function getDominantMood(records: MoodOverviewRecord[], fallback?: MoodType) {
  if (fallback) return fallback
  const counts = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.mood_type] = (acc[record.mood_type] ?? 0) + 1
    return acc
  }, {})
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as MoodType | undefined) ?? "neutral"
}

function getTopTags(records: MoodOverviewRecord[], fallback?: string[]) {
  if (fallback?.length) return fallback.slice(0, 5)
  const counts = records.flatMap((record) => record.tags).reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag)
}

function mapImageryToLegacyMood(words: string[]) {
  const anxiety = words.filter((word) => anxiousImagery.includes(word)).length
  const sadness = words.filter((word) => sadImagery.includes(word)).length
  const calm = words.filter((word) => calmImagery.includes(word)).length
  const mood_type: MoodType = anxiety >= sadness && anxiety > calm ? "anxious" : sadness > anxiety && sadness >= calm ? "sad" : "calm"
  const intensity = Math.max(4, Math.min(8, 4 + Math.ceil(words.length / 2) + (anxiety > 2 || sadness > 2 ? 1 : 0)))
  return {
    mood_type,
    intensity,
    tags: ["意象词记录", ...words.map((word) => `意象-${word}`)],
    note: `这次选择的意象词：${words.join("、")}。`,
  }
}

function inferQuickMood(text: string): MoodType {
  if (/焦虑|紧张|慌|压力|烦|乱|睡不着/.test(text)) return "anxious"
  if (/难过|低落|累|空|孤独|哭|疲惫|没电/.test(text)) return "sad"
  if (/生气|愤怒|委屈|吵|讨厌/.test(text)) return "angry"
  if (/开心|高兴|顺利|期待|喜欢/.test(text)) return "happy"
  return "calm"
}

export default function MoodPageClient() {
  const searchParams = useSearchParams()
  const { user, token } = useAuthStore()
  const { isGuest } = useAuthGuard({ silent: true })
  const addGuestRecord = useGuestStore((state) => state.addRecord)
  const guestRecords = useGuestStore((state) => state.records)
  const modeParam = searchParams.get("mode")
  const mode =
    modeParam === "classic" || modeParam === "body" || modeParam === "imagery" || modeParam === "quick"
      ? modeParam
      : "overview"
  const entryIntent = searchParams.get("entry") ?? "classic"
  const [step, setStep] = useState(1)
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedMood, setSelectedMood] = useState<MoodType>("calm")
  const [intensity, setIntensity] = useState(6)
  const [note, setNote] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [images, setImages] = useState<MoodImageAttachment[]>([])
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("")
  const [voiceUploadUrl, setVoiceUploadUrl] = useState("")
  const [voiceText, setVoiceText] = useState("")
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "uploading" | "ready" | "empty" | "failed">("idle")
  const [voiceError, setVoiceError] = useState("")
  const [showVoiceText, setShowVoiceText] = useState(false)
  const [voiceResetKey, setVoiceResetKey] = useState(0)
  const [customTag, setCustomTag] = useState("")
  const [showCustomTag, setShowCustomTag] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<MoodAnalysisReportData | null>(null)
  const [submitNotice, setSubmitNotice] = useState("")
  const [analysisStage, setAnalysisStage] = useState("")
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [recentRecords, setRecentRecords] = useState<MoodOverviewRecord[]>([])
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<{ weekly_trend?: WeeklyTrendItem[] } | null>(null)
  const [overviewSummary, setOverviewSummary] = useState<MoodOverviewSummary | null>(null)
  const [isOverviewLoading, setIsOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState("")
  const [bodySelections, setBodySelections] = useState<BodySensationSelection[]>([])
  const [activeBodyPart, setActiveBodyPart] = useState<BodyPartId>("chest")
  const [bodyClickCounts, setBodyClickCounts] = useState<Partial<Record<BodyPartId, number>>>({})
  const [breathState, setBreathState] = useState<BreathState>("steady")
  const [musicGoal, setMusicGoal] = useState<MusicGoal>("calm_down")
  const [faceExpression, setFaceExpression] = useState<FaceExpression>(defaultFaceExpression)
  const [imageryWords, setImageryWords] = useState<string[]>([])
  const [imageryBankIndex, setImageryBankIndex] = useState(0)
  const voiceUploadTokenRef = useRef(0)
  const analysisStartedAtRef = useRef(0)

  const selectedMoodMeta = getMoodOption(selectedMood)
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const latestRecord = recentRecords[0] ?? null
  const latestMoodMeta = getMoodOption(latestRecord?.mood_type)
  const todayRecord = recentRecords.find((record) => record.date === todayKey) ?? null
  const streakDays = overviewSummary?.streak_days ?? calculateStreakDays(recentRecords)
  const dominantMood = getDominantMood(recentRecords, overviewSummary?.dominant_mood)
  const dominantMoodMeta = getMoodOption(dominantMood)
  const topTags = getTopTags(recentRecords, overviewSummary?.top_tags)
  const weeklyTrend = weeklyAnalytics?.weekly_trend?.length ? weeklyAnalytics.weekly_trend : buildWeeklyTrendFromRecords(recentRecords)
  const musicMood = todayRecord?.mood_type ?? latestRecord?.mood_type ?? "calm"
  const musicIntensity = todayRecord?.intensity ?? latestRecord?.intensity ?? 6
  const entryIntents: Record<string, { title: string; helper: string }> = {
    body: {
      title: "从体感开始记录",
      helper: "Phase 1 先进入稳定记录流；下一阶段会替换为身体体感地图。",
    },
    imagery: {
      title: "用意象记录心情",
      helper: "先用现有文字、标签、图片和语音完成记录；意象词云会在后续阶段接上。",
    },
    quick: {
      title: "快速留一句",
      helper: "适合先写一句话，其他内容都可以跳过。",
    },
    voice: {
      title: "语音碎碎念",
      helper: "在记录步骤里使用语音录制，转写会继续进入 AI 分析。",
    },
    classic: {
      title: "完整情绪记录",
      helper: "保留原来的心情、强度、文字、图片、语音和 AI 分析流程。",
    },
  }
  const currentEntryIntent = entryIntents[entryIntent] ?? entryIntents.classic
  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(selectedMood)
    if (step === 2) return intensity >= 1
    return true
  }, [intensity, selectedMood, step])
  const bodyLabelCount = useMemo(
    () => bodySelections.reduce((count, selection) => count + selection.labels.length, 0),
    [bodySelections],
  )

  function buildFallbackReport(moodType = selectedMood, moodIntensity = intensity): MoodAnalysisReportData {
    const moodMeta = getMoodOption(moodType)
    return {
      summary: `你此刻更接近「${moodMeta.label}」，强度大约在 ${moodIntensity}/10。`,
      insight: moodMeta.insight,
      suggestion: "先把今天最具体的一件小事写下来，再给自己留十分钟缓冲。情绪已经被看见，就会轻一点。",
      music_recommendation: {
        mood: moodType,
        bpm: moodType === "happy" ? 104 : moodType === "sad" ? 62 : 76,
        title: moodType === "happy" ? "晴朗的午后" : moodType === "sad" ? "给低落一条毯子" : "宁静的午后",
        texture: "柔和和弦 + 慢速波纹",
      },
      radar_data: fallbackRadar.map((point) => ({
        ...point,
        score: point.mood === moodMeta.label ? Math.min(96, moodIntensity * 10) : point.score,
      })),
    }
  }

  function addCustomTag() {
    const tag = customTag.trim()
    if (!tag) return
    setSelectedTags((current) => (current.includes(tag) ? current : [...current, tag]))
    setCustomTag("")
    setShowCustomTag(false)
  }

  function setBodyPartActive(part: BodyPartId) {
    setActiveBodyPart(part)
    setBodyClickCounts((current) => ({ ...current, [part]: (current[part] ?? 0) + 1 }))
  }

  function toggleBodyLabel(part: BodyPartId, label: string) {
    setBodySelections((current) => {
      const totalCount = current.reduce((count, selection) => count + selection.labels.length, 0)
      const existing = current.find((selection) => selection.part === part)
      const existingLabels = existing?.labels ?? []
      const active = existingLabels.includes(label)

      if (!active && (existingLabels.length >= 2 || totalCount >= 6)) return current

      const nextLabels = active ? existingLabels.filter((item) => item !== label) : [...existingLabels, label]
      const withoutPart = current.filter((selection) => selection.part !== part)
      return nextLabels.length > 0 ? [...withoutPart, { part, labels: nextLabels }] : withoutPart
    })
  }

  function removeBodyLabel(part: BodyPartId, label: string) {
    setBodySelections((current) =>
      current
        .map((selection) => (selection.part === part ? { ...selection, labels: selection.labels.filter((item) => item !== label) } : selection))
        .filter((selection) => selection.labels.length > 0),
    )
  }

  function applyBodyPreset(presetId: string) {
    const preset = bodyPresets.find((item) => item.id === presetId)
    if (!preset) return
    setBodySelections(preset.selections)
    setBreathState(preset.breathState)
    setMusicGoal(preset.musicGoal)
    setFaceExpression(preset.expression ?? defaultFaceExpression)
    setActiveBodyPart(preset.selections[0]?.part ?? "whole")
  }

  function toggleImageryWord(word: string) {
    setImageryWords((current) => {
      if (current.includes(word)) return current.filter((item) => item !== word)
      if (current.length >= 5) return current
      return [...current, word]
    })
  }

  function handleImagerySubmit() {
    if (imageryWords.length === 0) {
      setSubmitNotice("先选择至少一个意象词，灵音才知道从哪里开始理解你。")
      return
    }
    const mapped = mapImageryToLegacyMood(imageryWords)
    setSelectedMood(mapped.mood_type)
    setIntensity(mapped.intensity)
    setSelectedTags(mapped.tags)
    setNote(mapped.note)
    window.setTimeout(() => void handleSubmit(), 0)
  }

  function handleQuickSubmit() {
    const text = [note, voiceText].filter(Boolean).join(" ")
    if (!text.trim() && images.length === 0 && !voiceFile) {
      setSubmitNotice("写一句、传一张图或录一段语音，都可以开始快速记录。")
      return
    }
    const inferredMood = inferQuickMood(text)
    setSelectedMood(inferredMood)
    setIntensity(text.length > 80 || voiceDuration > 30 ? 6 : 5)
    setSelectedTags((current) => Array.from(new Set(["快速记录", ...current])))
    window.setTimeout(() => void handleSubmit(), 0)
  }

  function clearVoiceRecording() {
    voiceUploadTokenRef.current += 1
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl)
    setVoiceFile(null)
    setVoiceDuration(0)
    setVoicePreviewUrl("")
    setVoiceUploadUrl("")
    setVoiceText("")
    setVoiceStatus("idle")
    setVoiceError("")
    setShowVoiceText(false)
    setVoiceResetKey((value) => value + 1)
  }

  useEffect(() => {
    if (!isSubmitting || submitted) return

    const timer = window.setInterval(() => {
      setAnalysisProgress((current) => {
        if (current >= 92) return current
        const increment = current < 32 ? 5 : current < 68 ? 3 : 1
        return Math.min(92, current + increment)
      })
    }, 280)

    return () => window.clearInterval(timer)
  }, [isSubmitting, submitted])

  useEffect(() => {
    if (mode !== "overview") return
    let active = true

    async function loadOverview() {
      setIsOverviewLoading(true)
      setOverviewError("")

      const guestOverviewRecords = sortMoodRecords(
        guestRecords.map(normalizeMoodRecord).filter((record): record is MoodOverviewRecord => Boolean(record)),
      )

      if (!token || isGuest) {
        setRecentRecords(guestOverviewRecords)
        setWeeklyAnalytics({ weekly_trend: buildWeeklyTrendFromRecords(guestOverviewRecords) })
        setOverviewSummary({
          dominant_mood: getDominantMood(guestOverviewRecords),
          streak_days: calculateStreakDays(guestOverviewRecords),
          top_tags: getTopTags(guestOverviewRecords),
          total_moods: guestOverviewRecords.length,
        })
        setIsOverviewLoading(false)
        return
      }

      try {
        const [moodResponse, weeklyResponse, summaryResponse] = await Promise.all([
          moodAPI.list({ limit: 30 }),
          analyticsAPI.weekly(),
          analyticsAPI.summary(),
        ])
        if (!active) return

        const moodPayload = unwrapApiData(moodResponse.data)
        const records = sortMoodRecords(
          (Array.isArray(moodPayload) ? moodPayload : [])
            .map(normalizeMoodRecord)
            .filter((record): record is MoodOverviewRecord => Boolean(record)),
        )
        const weeklyPayload = unwrapApiData(weeklyResponse.data) as { weekly_trend?: WeeklyTrendItem[] }
        const summaryPayload = unwrapApiData(summaryResponse.data) as MoodOverviewSummary

        setRecentRecords(records)
        setWeeklyAnalytics(weeklyPayload)
        setOverviewSummary(summaryPayload)
      } catch {
        if (!active) return
        setRecentRecords(guestOverviewRecords)
        setWeeklyAnalytics({ weekly_trend: buildWeeklyTrendFromRecords(guestOverviewRecords) })
        setOverviewSummary({
          dominant_mood: getDominantMood(guestOverviewRecords),
          streak_days: calculateStreakDays(guestOverviewRecords),
          top_tags: getTopTags(guestOverviewRecords),
          total_moods: guestOverviewRecords.length,
        })
        setOverviewError("云端数据暂时没有连上，已先显示本地记录和可用入口。")
      } finally {
        if (active) setIsOverviewLoading(false)
      }
    }

    loadOverview()
    return () => {
      active = false
    }
  }, [guestRecords, isGuest, mode, token])

  async function handleVoiceRecording(file: File | null, duration: number) {
    if (!file) {
      clearVoiceRecording()
      return
    }

    const uploadToken = voiceUploadTokenRef.current + 1
    voiceUploadTokenRef.current = uploadToken
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl)

    setVoiceFile(file)
    setVoiceDuration(duration)
    setVoicePreviewUrl(URL.createObjectURL(file))
    setVoiceUploadUrl("")
    setVoiceText("")
    setVoiceStatus("uploading")
    setVoiceError("")
    setShowVoiceText(true)

    if (!token) {
      setVoiceStatus("ready")
      setVoiceError("")
      setSubmitNotice((current) => current || "游客模式下语音会先保存在本地，本次不上传云端转写。")
      return
    }

    try {
      const wavFile = file.type.includes("wav") ? file : new File([await convertBlobToWav(file)], file.name.replace(/\.[^.]+$/, ".wav"), { type: "audio/wav" })
      const voiceResponse = await uploadAPI.voice(wavFile)
      if (voiceUploadTokenRef.current !== uploadToken) return
      const payload = voiceResponse.data?.data ?? voiceResponse.data
      setVoiceUploadUrl(payload?.url || payload?.voice_url || "")
      setVoiceText(payload?.voice_text || payload?.text || "")
      if (payload?.duration) setVoiceDuration(Math.max(1, Math.round(Number(payload.duration))))
      const nextStatus = payload?.voice_status
      const nextError = payload?.voice_error || ""
      setVoiceError(nextError)
      if (nextStatus === "error") {
        setVoiceStatus("failed")
        setSubmitNotice((current) => current || nextError || "语音转写暂时不可用，录音已经保留。")
      } else if (nextStatus === "empty" || !payload?.voice_text) {
        setVoiceStatus("empty")
      } else {
        setVoiceStatus("ready")
      }
      setShowVoiceText(true)
    } catch {
      if (voiceUploadTokenRef.current !== uploadToken) return
      setVoiceStatus("failed")
      setVoiceError("语音转写暂时不可用")
      setSubmitNotice((current) => current || "语音转写暂时不可用，已保留本地录音。")
      setShowVoiceText(true)
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setSubmitNotice("")
    setAnalysisStage("正在整理你刚刚留下的心情线索…")
    setAnalysisProgress(10)
    setStep(3)
    setSubmitted(false)
    analysisStartedAtRef.current = Date.now()

    try {
      if (isGuest) {
        const imageUrls = images.map((image) => image.previewUrl)
        const report = buildFallbackReport()
        addGuestRecord({
          date: recordDate,
          mood_type: selectedMood,
          intensity,
          tags: selectedTags,
          note: note || voiceText,
          images: imageUrls,
        })
        setAnalysisStage("已先保存在本地，正在给你一段轻一点的反馈…")
        setAnalysisProgress(100)
        setAnalysisReport(report)
        setSubmitNotice("已保存到本地游客记录。登录后可把记录同步到云端。")
        return
      }

      let imageUrls = images.map((image) => image.previewUrl)
      if (images.length > 0) {
        setAnalysisStage("正在整理图片和文字，一起放进这次分析里…")
        setAnalysisProgress(28)
        try {
          const uploadResponse = await uploadAPI.images(images.map((image) => image.file))
          const payload = uploadResponse.data?.data ?? uploadResponse.data
          imageUrls = Array.isArray(payload?.urls) ? payload.urls : Array.isArray(payload) ? payload : imageUrls
        } catch {
          setSubmitNotice("图片接口暂时不可用，已先使用本地预览完成本次分析。")
        }
      }

      let submittedVoiceText = voiceText
      let submittedVoiceUrl = voiceUploadUrl
      if (voiceFile && !submittedVoiceUrl) {
        setAnalysisStage("正在把语音转成文字，再一起理解你的感受…")
        setAnalysisProgress(46)
        try {
          const wavFile = voiceFile.type.includes("wav")
            ? voiceFile
            : new File([await convertBlobToWav(voiceFile)], voiceFile.name.replace(/\.[^.]+$/, ".wav"), { type: "audio/wav" })
          const voiceResponse = await uploadAPI.voice(wavFile)
          const payload = voiceResponse.data?.data ?? voiceResponse.data
          submittedVoiceUrl = payload?.url || payload?.voice_url || ""
          submittedVoiceText = payload?.voice_text || payload?.text || ""
          setVoiceUploadUrl(submittedVoiceUrl)
          setVoiceText(submittedVoiceText)
          const nextStatus = payload?.voice_status
          const nextError = payload?.voice_error || ""
          setVoiceError(nextError)
          if (nextStatus === "error") {
            setVoiceStatus("failed")
            setSubmitNotice((current) => current || nextError || "语音转写失败，本次会先用文字和图片完成分析。")
          } else if (nextStatus === "empty" || !submittedVoiceText) {
            setVoiceStatus("empty")
          } else {
            setVoiceStatus("ready")
          }
          setShowVoiceText(true)
        } catch {
          setVoiceStatus("failed")
          setVoiceError("语音转写接口暂时不可用")
          setSubmitNotice((current) => current || "语音转写接口暂时不可用，本次先保留文字和图片内容。")
        }
      }

      const imageAnalysis =
        imageUrls.length > 0
          ? `用户上传了 ${imageUrls.length} 张与本次心情相关的图片，图片地址：${imageUrls.join("，")}`
          : ""

      setAnalysisStage("AI 正在结合情绪、标签、文字和语音，为你生成更真实的分析…")
      setAnalysisProgress(72)
      const report = await aiAPI
        .analyzeMood({
          mood_type: selectedMood,
          intensity,
          note,
          tags: selectedTags,
          image_analysis: imageAnalysis,
          image_urls: imageUrls,
          voice_text: submittedVoiceText,
          mbti: user?.mbti || "",
          zodiac: user?.zodiac || "",
          input_mode: mode === "imagery" || mode === "quick" ? mode : "classic",
          imagery_words: mode === "imagery" ? JSON.stringify(imageryWords) : "",
          voice_features: voiceFile ? JSON.stringify({ duration: voiceDuration }) : "",
        })
        .then((response) => {
          const envelope = response.data as { code?: number; msg?: string; fallback?: boolean; data?: MoodAnalysisReportData | null }
          if (envelope?.code && envelope.code !== 0) {
            throw new Error(envelope.msg || "AI analysis failed")
          }
          if (envelope?.fallback) {
            setSubmitNotice((current) => current || "AI 暂时使用备用分析模板，记录已正常保存。")
          }
          const payload = envelope?.data ?? response.data
          if (!payload) throw new Error("AI analysis empty")
          return payload as MoodAnalysisReportData
        })
        .catch(() => buildFallbackReport())

      setAnalysisStage("分析完成，正在把这次心情慢慢整理给你…")
      setAnalysisProgress(92)
      setAnalysisReport(report)
      await moodAPI.create({
        date: recordDate,
        mood_type: selectedMood,
        intensity,
        tags: selectedTags,
        note,
        images: imageUrls,
        image_analysis: imageAnalysis,
        voice_url: submittedVoiceUrl,
        voice_text: submittedVoiceText,
        input_mode: mode === "imagery" || mode === "quick" ? mode : "classic",
        imagery_words: mode === "imagery" ? JSON.stringify(imageryWords) : "",
        voice_features: voiceFile ? JSON.stringify({ duration: voiceDuration }) : "",
      })
    } catch {
      setAnalysisStage("网络有点不稳，我先把这次心情接住，再给你一版本地反馈。")
      setAnalysisProgress(100)
      setAnalysisReport(buildFallbackReport())
    } finally {
      const elapsed = Date.now() - analysisStartedAtRef.current
      const minVisibleDuration = 2400
      if (elapsed < minVisibleDuration) {
        await new Promise((resolve) => window.setTimeout(resolve, minVisibleDuration - elapsed))
      }
      setAnalysisProgress(100)
      setIsSubmitting(false)
      setSubmitted(true)
    }
  }

  async function handleBodySubmit() {
    if (bodyLabelCount === 0) {
      setSubmitNotice("先选择至少一个身体线索，再交给灵音整理。")
      return
    }

    const mapped = mapBodyEntryToLegacyMood(bodySelections, breathState, musicGoal, faceExpression)
    setSelectedMood(mapped.mood_type)
    setIntensity(mapped.intensity)
    setSelectedTags(mapped.tags)
    setNote(mapped.note)
    setIsSubmitting(true)
    setSubmitNotice("")
    setAnalysisStage("正在把身体线索翻译成情绪语言…")
    setAnalysisProgress(12)
    setStep(3)
    setSubmitted(false)
    analysisStartedAtRef.current = Date.now()

    try {
      if (isGuest) {
        const report = buildFallbackReport(mapped.mood_type, mapped.intensity)
        addGuestRecord({
          date: recordDate,
          mood_type: mapped.mood_type,
          intensity: mapped.intensity,
          tags: mapped.tags,
          note: mapped.note,
          images: [],
        })
        setAnalysisStage("已先保存在本地，正在给你一段轻一点的反馈…")
        setAnalysisProgress(100)
        setAnalysisReport(report)
        setSubmitNotice("已保存到本地游客记录。登录后可把记录同步到云端。")
        return
      }

      setAnalysisStage("AI 正在结合身体体感、呼吸和目标，为你生成分析…")
      setAnalysisProgress(72)
      const report = await aiAPI
        .analyzeMood({
          mood_type: mapped.mood_type,
          intensity: mapped.intensity,
          note: mapped.note,
          tags: mapped.tags,
          image_analysis: `身体体感记录：${mapped.note}`,
          image_urls: [],
          voice_text: "",
          mbti: user?.mbti || "",
          zodiac: user?.zodiac || "",
          input_mode: "body_map",
          body_sensations: JSON.stringify(bodySelections),
          breath_state: breathState,
          music_goal: musicGoal,
        })
        .then((response) => {
          const envelope = response.data as { code?: number; msg?: string; fallback?: boolean; data?: MoodAnalysisReportData | null }
          if (envelope?.code && envelope.code !== 0) {
            throw new Error(envelope.msg || "AI analysis failed")
          }
          if (envelope?.fallback) {
            setSubmitNotice((current) => current || "AI 暂时使用备用分析模板，记录已正常保存。")
          }
          const payload = envelope?.data ?? response.data
          if (!payload) throw new Error("AI analysis empty")
          return payload as MoodAnalysisReportData
        })
        .catch(() => buildFallbackReport(mapped.mood_type, mapped.intensity))

      setAnalysisStage("分析完成，正在把这次身体线索整理成记录…")
      setAnalysisProgress(92)
      setAnalysisReport(report)
      await moodAPI.create({
        date: recordDate,
        mood_type: mapped.mood_type,
        intensity: mapped.intensity,
        tags: mapped.tags,
        note: mapped.note,
        images: [],
        image_analysis: `身体体感记录：${mapped.note}`,
        voice_url: "",
        voice_text: "",
        input_mode: "body_map",
        body_sensations: JSON.stringify(bodySelections),
        breath_state: breathState,
        music_goal: musicGoal,
      })
    } catch {
      setAnalysisStage("网络有点不稳，我先把这次身体线索接住，再给你一版本地反馈。")
      setAnalysisProgress(100)
      setAnalysisReport(buildFallbackReport(mapped.mood_type, mapped.intensity))
    } finally {
      const elapsed = Date.now() - analysisStartedAtRef.current
      const minVisibleDuration = 1800
      if (elapsed < minVisibleDuration) {
        await new Promise((resolve) => window.setTimeout(resolve, minVisibleDuration - elapsed))
      }
      setAnalysisProgress(100)
      setIsSubmitting(false)
      setSubmitted(true)
    }
  }

  if (mode === "imagery" || mode === "quick") {
    const isImageryMode = mode === "imagery"
    const activeImageryBank = imageryWordBanks[imageryBankIndex % imageryWordBanks.length]
    const simpleTitle = isImageryMode ? "意象词记录" : "快速记录"
    const simpleHelper = isImageryMode
      ? "不用判断自己是什么情绪，先选几个像此刻内心天气的词。"
      : "文字、图片、语音任选一种，轻轻留下一点线索就够了。"

    return (
      <MoodWaveShell title={simpleTitle}>
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-[34px] bg-white/84 p-5 shadow-[0_20px_60px_rgba(255,208,219,0.22)] ring-1 ring-white/75 md:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <Link href="/mood" className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-600 ring-1 ring-[#f1dfe5]">
                  返回记录首页
                </Link>
                <p className="mt-5 text-sm font-semibold text-[#ff7894]">{simpleTitle}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2635] md:text-4xl">
                  {isImageryMode ? "让几个画面感词语，替你先说出感觉。" : "只留下这一刻，其他慢慢来。"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{simpleHelper}</p>
              </div>
              <RecordDatePicker value={recordDate} onChange={setRecordDate} className="self-start" />
            </div>
          </section>

          {isSubmitting || submitted ? (
            <section className="rounded-[34px] bg-white/88 p-6 text-center shadow-[0_20px_60px_rgba(255,208,219,0.2)] ring-1 ring-white/75 md:p-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_18px_34px_rgba(255,181,194,0.28)]">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">
                {submitted ? "这次心情已经整理好了" : "灵音正在理解你刚刚留下的线索"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {analysisStage || "正在把这些词语和记录转换成温柔的情绪报告。"}
              </p>
              <div className="mx-auto mt-6 max-w-2xl">
                <div className="h-3 overflow-hidden rounded-full bg-[#f6e9ee]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffc3d0] to-[#8de1d5] transition-[width] duration-500 ease-out"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
              </div>
              {submitNotice ? (
                <p className="mx-auto mt-4 max-w-xl rounded-full bg-[#fff7d8] px-4 py-2 text-xs text-[#b67820]">{submitNotice}</p>
              ) : null}
              <div className="mx-auto mt-6 max-w-3xl">
                {submitted ? <MoodAnalysisReport report={analysisReport ?? buildFallbackReport()} /> : null}
              </div>
              {submitted ? (
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false)
                      setAnalysisReport(null)
                      setSubmitNotice("")
                      setAnalysisStage("")
                    }}
                    className="rounded-full border border-[#f1dbe2] bg-white px-6 py-3 text-sm font-semibold text-slate-700"
                  >
                    继续调整
                  </button>
                  <Link
                    href={`/music?mood=${selectedMood}&intensity=${intensity}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white"
                  >
                    <Play className="h-4 w-4" />
                    播放治愈音乐
                  </Link>
                </div>
              ) : null}
            </section>
          ) : isImageryMode ? (
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="rounded-[34px] bg-white/86 p-5 shadow-[0_18px_50px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-7">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">意象词云</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">最多选择 5 个。找不到贴切的词，可以刷新一组。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageryBankIndex((value) => value + 1)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#fff3f6] px-4 text-sm font-semibold text-[#ff7894]"
                  >
                    刷新词云
                  </button>
                </div>

                <div className="mt-6 flex min-h-[320px] flex-wrap content-center items-center justify-center gap-3 rounded-[30px] bg-gradient-to-br from-[#fffafb] via-white to-[#effdfa] p-5 ring-1 ring-[#f6e4e9]">
                  {activeImageryBank.map((word, index) => {
                    const selected = imageryWords.includes(word)
                    const disabled = !selected && imageryWords.length >= 5
                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => toggleImageryWord(word)}
                        disabled={disabled}
                        className={cn(
                          "min-h-11 rounded-full px-4 text-sm font-semibold transition",
                          index % 3 === 0 && "md:text-lg",
                          index % 4 === 0 && "md:px-6",
                          selected
                            ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_12px_24px_rgba(255,181,194,0.2)]"
                            : "bg-white/88 text-slate-600 ring-1 ring-[#f3dfe5] hover:-translate-y-0.5",
                          disabled && "cursor-not-allowed opacity-45 hover:translate-y-0",
                        )}
                      >
                        {word}
                      </button>
                    )
                  })}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-slate-900">已选意象</p>
                    <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-[#ff7894]">{imageryWords.length}/5</span>
                  </div>
                  <div className="mt-4 flex min-h-[120px] flex-wrap content-start gap-2 rounded-[24px] bg-[#fffafb] p-3 ring-1 ring-[#f6e4e9]">
                    {imageryWords.length ? imageryWords.map((word) => (
                      <button
                        key={word}
                        type="button"
                        onClick={() => toggleImageryWord(word)}
                        className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#ff7894] shadow-sm"
                      >
                        {word} ×
                      </button>
                    )) : (
                      <p className="text-sm leading-7 text-slate-400">选一个最贴近当下的画面词就可以开始。</p>
                    )}
                  </div>
                </div>
                <div className="rounded-[32px] bg-gradient-to-br from-[#fff7d8] to-[#effdfa] p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                  <p className="text-sm font-semibold text-slate-900">灵音会这样理解</p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {imageryWords.length ? mapImageryToLegacyMood(imageryWords).note : "意象词会被转成情绪、强度和标签，再进入原有 AI 分析流程。"}
                  </p>
                  {submitNotice ? <p className="mt-3 text-xs text-[#b67820]">{submitNotice}</p> : null}
                  <button
                    type="button"
                    onClick={handleImagerySubmit}
                    disabled={imageryWords.length === 0}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(255,151,173,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    记录并分析
                  </button>
                </div>
              </aside>
            </section>
          ) : (
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-[34px] bg-white/86 p-5 shadow-[0_18px_50px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-7">
                <h3 className="text-xl font-semibold text-slate-900">随便留下一点小细节</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">不用总结心情，写一句、传一张图或录一段语音都可以。</p>
                <div className="mt-5 rounded-[28px] border border-[#f6e4e9] bg-white p-4 shadow-[0_10px_28px_rgba(255,216,225,0.12)]">
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, 500))}
                    placeholder="比如：今天脑子有点乱，想先安静一会儿。"
                    rows={7}
                    className="w-full resize-none bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <div className="mt-3 flex items-center justify-between border-t border-[#f7e6eb] pt-4">
                    <p className="text-xs text-slate-400">文字、图片和语音会一起进入分析</p>
                    <p className="text-xs text-slate-400">{note.length}/500</p>
                  </div>
                </div>
                <details className="mt-4 rounded-[28px] bg-[#fffafb] p-4 ring-1 ring-[#f6e4e9]">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">补充图片或语音</summary>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <MoodMediaUpload images={images} onImagesChange={setImages} />
                    <MoodVoiceRecorder onRecordingChange={handleVoiceRecording} resetKey={voiceResetKey} />
                  </div>
                </details>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                  <p className="text-lg font-semibold text-slate-900">快速入口</p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    灵音会先根据文字和语音转写粗略判断情绪，再沿用现有 AI 分析与保存流程。
                  </p>
                  {submitNotice ? <p className="mt-3 text-xs text-[#b67820]">{submitNotice}</p> : null}
                  <button
                    type="button"
                    onClick={handleQuickSubmit}
                    className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(255,151,173,0.22)]"
                  >
                    <Sparkles className="h-4 w-4" />
                    记录并分析
                  </button>
                </div>
                <Link
                  href="/mood?mode=classic"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-600 ring-1 ring-[#f1dfe5]"
                >
                  去完整三步记录
                </Link>
              </aside>
            </section>
          )}
        </div>
      </MoodWaveShell>
    )
  }

  if (mode === "body") {
    const mappedBodyMood = mapBodyEntryToLegacyMood(bodySelections, breathState, musicGoal, faceExpression)
    const mappedMoodMeta = getMoodOption(mappedBodyMood.mood_type)
    const companionFeedback = getCompanionBodyFeedback(activeBodyPart, bodySelections, breathState)
    const petLookClass = {
      up: "-translate-y-1 rotate-[-3deg]",
      right: "translate-x-1 rotate-[3deg]",
      down: "translate-y-1 rotate-[2deg]",
      left: "-translate-x-1 rotate-[-4deg]",
      center: "",
    }[companionFeedback.look]

    return (
      <MoodWaveShell title="身体体感记录">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <section className="rounded-[34px] bg-white/84 p-5 shadow-[0_20px_60px_rgba(255,208,219,0.22)] ring-1 ring-white/75 md:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <Link href="/mood" className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-600 ring-1 ring-[#f1dfe5]">
                  返回记录首页
                </Link>
                <p className="mt-5 text-sm font-semibold text-[#ff7894]">身体体感记录</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2635] md:text-4xl">
                  不用先总结情绪，先看看身体哪里在说话。
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  点击身体区域，选 1-6 个体感线索。灵音会先把它们转换成旧版情绪记录，再进入现有 AI 分析和保存流程。
                </p>
              </div>
              <RecordDatePicker value={recordDate} onChange={setRecordDate} className="self-start" />
            </div>
          </section>

          {isSubmitting || submitted ? (
            <section className="rounded-[34px] bg-white/88 p-6 text-center shadow-[0_20px_60px_rgba(255,208,219,0.2)] ring-1 ring-white/75 md:p-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_18px_34px_rgba(255,181,194,0.28)]">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">
                {submitted ? "身体线索已经整理好了" : "灵音正在理解你刚刚标记的体感"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {analysisStage || "正在把身体、呼吸和音乐目标转换成一份温柔的情绪报告。"}
              </p>
              <div className="mx-auto mt-6 max-w-2xl">
                <div className="h-3 overflow-hidden rounded-full bg-[#f6e9ee]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffc3d0] to-[#8de1d5] transition-[width] duration-500 ease-out"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>正在整合身体体感、呼吸状态和音乐目标</span>
                  <span>{analysisProgress}%</span>
                </div>
              </div>
              {submitNotice ? (
                <p className="mx-auto mt-4 max-w-xl rounded-full bg-[#fff7d8] px-4 py-2 text-xs text-[#b67820]">{submitNotice}</p>
              ) : null}
              <div className="mx-auto mt-6 max-w-3xl">
                {submitted ? <MoodAnalysisReport report={analysisReport ?? buildFallbackReport(mappedBodyMood.mood_type, mappedBodyMood.intensity)} /> : null}
              </div>
              {submitted ? (
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false)
                      setAnalysisReport(null)
                      setSubmitNotice("")
                      setAnalysisStage("")
                    }}
                    className="rounded-full border border-[#f1dbe2] bg-white px-6 py-3 text-sm font-semibold text-slate-700"
                  >
                    继续调整体感
                  </button>
                  <Link
                    href={`/music?mood=${mappedBodyMood.mood_type}&intensity=${mappedBodyMood.intensity}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white"
                  >
                    <Play className="h-4 w-4" />
                    播放治愈音乐
                  </Link>
                </div>
              ) : null}
            </section>
          ) : (
            <>
              <section className="grid gap-4 xl:grid-cols-[220px_minmax(380px,1fr)_330px] 2xl:grid-cols-[284px_minmax(520px,1fr)_420px]">
                <aside className="order-2 space-y-4 xl:order-none">
                  <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                    <p className="text-base font-semibold text-slate-900">快捷组合</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">不想慢慢选时，可以先点一个最接近的状态。</p>
                    <div className="mt-4 space-y-3">
                      {bodyPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyBodyPreset(preset.id)}
                          className="flex min-h-[64px] w-full items-center justify-between rounded-[22px] bg-[#fffafb] px-4 py-3 text-left shadow-sm ring-1 ring-[#f3dfe5] transition hover:-translate-y-0.5 hover:bg-white"
                          title={preset.helper}
                        >
                          <span>
                            <span className="block text-sm font-semibold text-slate-800">{preset.label}</span>
                            <span className="mt-1 block text-[11px] leading-5 text-slate-500 2xl:text-xs">{preset.helper}</span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-gradient-to-br from-[#fff7d8] to-[#fff0f4] p-5 shadow-[0_16px_36px_rgba(255,213,223,0.14)] ring-1 ring-white/80">
                    <p className="text-sm font-semibold text-[#b67820]">不知道点哪里？</p>
                    <p className="mt-2 text-xs leading-6 text-[#9a6c36]">可以先点“整体”，再慢慢探索。重复点击同一区域时，灵音会提示那里可能更需要被照顾。</p>
                  </div>
                </aside>

                <div className="order-1 rounded-[34px] bg-white/84 p-3 shadow-[0_18px_50px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-5 xl:order-none">
                  <BodySensationMap
                    selections={bodySelections}
                    activePart={activeBodyPart}
                    clickCounts={bodyClickCounts}
                    expression={faceExpression}
                    onActivePartChange={setBodyPartActive}
                    onToggleLabel={toggleBodyLabel}
                  />
                </div>

                <aside className="order-3 space-y-4 xl:order-none">
                  <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">已选线索</p>
                        <p className="mt-1 text-xs text-slate-500">按身体部位分组，可点击删除。</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBodySelections([])}
                        className="rounded-full bg-[#fff3f6] px-3 py-1.5 text-xs font-semibold text-[#ff7894]"
                      >
                        清空 {bodyLabelCount}/6
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {bodySelections.some((selection) => selection.labels.length > 0) ? (
                        bodySelections.map((selection) => {
                          const part = bodyPartOptions.find((item) => item.id === selection.part)
                          return (
                            <div key={selection.part} className="rounded-[22px] bg-[#fffafb] p-3 ring-1 ring-[#f5e2e8]">
                              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: part?.color ?? "#64748b" }}>
                                <span>{part?.icon}</span>
                                <span>{part?.label}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selection.labels.map((label) => (
                                  <button
                                    key={`${selection.part}-${label}`}
                                    type="button"
                                    onClick={() => removeBodyLabel(selection.part, label)}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold shadow-sm ring-1 ring-white/80"
                                    style={{ backgroundColor: part?.softColor ?? "#fffafb", color: part?.color ?? "#64748b" }}
                                  >
                                    {label}
                                    <span className="text-slate-400">×</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="rounded-[24px] bg-[#fffafb] px-4 py-4 text-sm leading-7 text-slate-400 ring-1 ring-[#f8e4e9]">
                          先点击中间人物的头部、胸口或肩颈，选择此刻最明显的身体感觉。
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-[#fff7fa] to-[#effdfa] p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                    <div className="absolute right-4 top-4 rounded-full bg-white/78 px-3 py-1 text-xs font-semibold text-[#ff7894] shadow-sm">
                      推荐音乐
                    </div>
                    <div className="flex items-end gap-4">
                      <div className={cn("shrink-0 transition duration-300", (breathState === "shallow" || breathState === "rapid") && "animate-pulse", petLookClass)}>
                        <CompanionPetOrb
                          character={user?.avatar_character}
                          color={user?.character_color}
                          mood={mappedBodyMood.mood_type}
                          size="md"
                          showLabel
                        />
                      </div>
                      <div className="relative min-w-0 flex-1 rounded-[24px] bg-white/92 p-4 shadow-sm ring-1 ring-[#f3dfe5]">
                        <span className="absolute -left-2 bottom-7 h-4 w-4 rotate-45 bg-white/92 ring-1 ring-[#f3dfe5]" />
                        <p className="relative text-sm font-semibold text-slate-900">灵音正在看着「{bodyPartOptions.find((item) => item.id === activeBodyPart)?.label}」</p>
                        <p className="relative mt-2 text-xs leading-6 text-slate-500">{companionFeedback.message}</p>
                        <p className="relative mt-2 rounded-[18px] bg-[#fff3f6] px-3 py-2 text-xs leading-5 text-[#ff7894]">{companionFeedback.musicHint}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                    <p className="text-sm font-semibold text-slate-900">呼吸状态</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-4">
                      {breathOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setBreathState(option.value)}
                          className={cn(
                            "min-h-14 rounded-[18px] px-2 text-xs font-semibold transition ring-1",
                            breathState === option.value ? "bg-white text-[#ff7894] shadow-sm ring-[#b8dbff]" : "bg-[#fffafb] text-slate-500 ring-[#f3dfe5]",
                          )}
                          title={option.helper}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[32px] bg-white/86 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                    <p className="text-sm font-semibold text-slate-900">音乐目标</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {musicGoalOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setMusicGoal(option.value)}
                          className={cn(
                            "min-h-[62px] rounded-[20px] px-3 py-2 text-left text-sm font-semibold transition",
                            musicGoal === option.value
                              ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_12px_24px_rgba(255,181,194,0.2)]"
                              : "bg-[#fffafb] text-slate-600 ring-1 ring-[#f3dfe5]",
                          )}
                          title={option.helper}
                        >
                          <span className="block">{option.label}</span>
                          <span className={cn("mt-1 block text-[11px] font-medium", musicGoal === option.value ? "text-white/82" : "text-slate-400")}>{option.helper}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <details className="rounded-[32px] bg-white/86 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">表情辅助</summary>
                    <div className="mt-4 space-y-3">
                      {[
                        ["mouth", "嘴巴", faceExpressionOptions.mouth],
                        ["eyes", "眼睛", faceExpressionOptions.eyes],
                        ["brows", "眉毛", faceExpressionOptions.brows],
                      ].map(([key, label, options]) => (
                        <div key={key as string} className="grid grid-cols-[42px_1fr] items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">{label as string}</span>
                          <div className="grid grid-cols-4 overflow-hidden rounded-full bg-[#fffafb] ring-1 ring-[#f3dfe5]">
                            {(options as Array<{ value: string; label: string }>).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setFaceExpression((current) => ({ ...current, [key as keyof FaceExpression]: option.value } as FaceExpression))}
                                className={cn(
                                  "min-h-9 px-2 text-xs font-semibold transition",
                                  faceExpression[key as keyof FaceExpression] === option.value ? "bg-white text-[#ff7894] shadow-sm" : "text-slate-500",
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>

                  <div className="rounded-[32px] bg-gradient-to-br from-[#fff7d8] to-[#effdfa] p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">实时推断</p>
                      <span className="rounded-full bg-white/78 px-3 py-1 text-xs font-semibold text-slate-500">强度 {mappedBodyMood.intensity}/10</span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <span
                        className="grid h-14 w-14 place-items-center rounded-[22px] text-3xl"
                        style={{ backgroundColor: mappedMoodMeta.softAccent }}
                      >
                        {mappedMoodMeta.emoji}
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{mappedMoodMeta.label}</p>
                        <p className="text-xs text-slate-500">强度约 {mappedBodyMood.intensity}/10</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      {bodyLabelCount > 0 ? mappedBodyMood.note : "至少选择一个身体线索后即可提交。"}
                    </p>
                    {submitNotice ? <p className="mt-2 text-xs text-[#b67820]">{submitNotice}</p> : null}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Link
                        href="/mood?mode=classic&entry=body"
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-600 ring-1 ring-[#f1dfe5]"
                      >
                        补充图片/语音
                      </Link>
                      <button
                        type="button"
                        onClick={handleBodySubmit}
                        disabled={bodyLabelCount === 0 || isSubmitting}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(255,151,173,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        记录并分析
                      </button>
                    </div>
                  </div>
                </aside>
              </section>
            </>
          )}
        </div>
      </MoodWaveShell>
    )
  }

  if (mode === "overview") {
    const totalMoods = overviewSummary?.total_moods ?? recentRecords.length
    const entryCards = [
      {
        key: "body",
        title: "开始体感记录",
        helper: "先从身体线索开始，下一阶段会升级成体感地图。",
        icon: HeartPulse,
        href: "/mood?mode=body",
        featured: true,
      },
      {
        key: "imagery",
        title: "意象词记录",
        helper: "用画面感和氛围词进入记录。",
        icon: Feather,
        href: "/mood?mode=imagery",
      },
      {
        key: "quick",
        title: "快速文字记录",
        helper: "只写一句也可以被接住。",
        icon: PenLine,
        href: "/mood?mode=quick",
      },
      {
        key: "voice",
        title: "语音碎碎念",
        helper: "直接说出来，后续转写进分析。",
        icon: Mic2,
        href: "/mood?mode=quick",
      },
    ]

    return (
      <MoodWaveShell title="情绪录入">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="overflow-hidden rounded-[34px] bg-white/84 p-5 shadow-[0_20px_60px_rgba(255,208,219,0.22)] ring-1 ring-white/75 md:p-7">
            <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch">
              <div className="rounded-[30px] bg-gradient-to-br from-[#fff7fa] via-white to-[#ecfffb] p-5 ring-1 ring-white/80 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/80 px-3 text-xs font-semibold text-[#ff7894] shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      记录情绪的潮汐，遇见内心的风景
                    </p>
                    <h2 className="mt-4 text-2xl font-semibold tracking-normal text-[#1f2635] md:text-4xl">
                      今天想怎样靠近自己的心情？
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                      这里会先给你一个轻量总览，再选择最顺手的方式开始记录。体感和意象入口本阶段先接入稳定记录流，后续逐步替换为 V2 交互。
                    </p>
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <Link
                        href="/mood?mode=body"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(255,151,173,0.22)]"
                      >
                        <HeartPulse className="h-4 w-4" />
                        开始体感记录
                      </Link>
                      <Link
                        href="/mood?mode=quick"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-600 ring-1 ring-[#f1dfe5]"
                      >
                        <Mic2 className="h-4 w-4 text-[#ff7894]" />
                        语音碎碎念
                      </Link>
                    </div>
                  </div>
                  <div
                    className="flex h-24 w-24 shrink-0 items-center justify-center self-start rounded-[30px] text-5xl shadow-[0_16px_34px_rgba(255,181,194,0.22)]"
                    style={{ backgroundColor: latestMoodMeta.softAccent }}
                  >
                    {latestRecord ? latestMoodMeta.emoji : "🌙"}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e4e9]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <CalendarDays className="h-4 w-4 text-[#ff9fb4]" />
                      今日状态
                    </div>
                    <p className="mt-3 text-xl font-semibold text-slate-900">
                      {todayRecord ? "已记录" : "还没记录"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {todayRecord ? `${getMoodOption(todayRecord.mood_type).label} · ${todayRecord.intensity}/10` : "可以从一个很小的线索开始"}
                    </p>
                  </div>
                  <div className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e4e9]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Flame className="h-4 w-4 text-[#ffd166]" />
                      连续记录
                    </div>
                    <p className="mt-3 text-xl font-semibold text-slate-900">{streakDays} 天</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {streakDays > 0 ? "这份觉察已经在累积" : "今天可以作为新的起点"}
                    </p>
                  </div>
                  <div className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e4e9]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Clock3 className="h-4 w-4 text-[#8de1d5]" />
                      最近一次
                    </div>
                    <p className="mt-3 text-xl font-semibold text-slate-900">
                      {latestRecord ? getMoodOption(latestRecord.mood_type).label : "暂无记录"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {latestRecord ? `${formatDateHeadline(latestRecord.date)} · 强度 ${latestRecord.intensity}/10` : "先留下第一条心情"}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="rounded-[30px] bg-white/88 p-5 shadow-[0_16px_40px_rgba(255,213,223,0.16)] ring-1 ring-white/70 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">本周轻量趋势</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {totalMoods > 0 ? `已沉淀 ${totalMoods} 条记录` : "还没有足够数据，先从今天开始"}
                    </p>
                  </div>
                  {isOverviewLoading ? (
                    <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-[#ff7894]">同步中</span>
                  ) : null}
                </div>

                <div className="mt-5 flex h-28 items-end gap-2 rounded-[24px] bg-gradient-to-b from-[#fffafb] to-[#f2fffc] p-3 ring-1 ring-[#f8e4e9]">
                  {weeklyTrend.map((item) => {
                    const mood = getMoodOption(item.mood_type)
                    const height = item.avg_intensity > 0 ? Math.max(18, item.avg_intensity * 9) : 8
                    return (
                      <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-full transition-all"
                          style={{ height, backgroundColor: item.avg_intensity > 0 ? mood.accent : "#efe8ed" }}
                          title={`${item.date} ${item.avg_intensity || 0}/10`}
                        />
                        <span className="text-[10px] text-slate-400">{Number(item.date.slice(-2))}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f8e4e9]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">本月主导情绪</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{dominantMoodMeta.label}</p>
                    </div>
                    <span
                      className="grid h-12 w-12 place-items-center rounded-[20px] text-2xl"
                      style={{ backgroundColor: dominantMoodMeta.softAccent }}
                    >
                      {dominantMoodMeta.emoji}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topTags.length > 0 ? (
                      topTags.map((tag) => {
                        const label = moodTagOptions.find((item) => item.value === tag)?.label ?? tag
                        return (
                          <span key={tag} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-[#f1dfe5]">
                            {label}
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-xs leading-6 text-slate-400">高频标签会在记录几次后出现。</span>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </section>

          {overviewError ? (
            <p className="rounded-[22px] bg-[#fff7d8] px-4 py-3 text-sm text-[#a96d1a] ring-1 ring-[#ffe9a9]">{overviewError}</p>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[34px] bg-white/84 p-5 shadow-[0_18px_50px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#ff7894]">开始记录</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-900">选择一个低压力入口</h3>
                </div>
                <Link href="/analytics" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-600 ring-1 ring-[#f1dfe5] transition hover:-translate-y-0.5">
                  <BarChart3 className="h-4 w-4 text-[#8de1d5]" />
                  查看完整历史
                </Link>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {entryCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <Link
                      key={card.key}
                      href={card.href}
                      className={cn(
                        "group flex min-h-[112px] items-center gap-4 rounded-[28px] p-4 transition hover:-translate-y-1",
                        card.featured
                          ? "bg-gradient-to-br from-[#ff9fb4] via-[#ffc7d2] to-[#8de1d5] text-white shadow-[0_18px_40px_rgba(255,159,180,0.28)]"
                          : "bg-white text-slate-800 ring-1 ring-[#f6e4e9] shadow-[0_12px_28px_rgba(255,216,225,0.1)]",
                      )}
                    >
                      <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-[22px]", card.featured ? "bg-white/22" : "bg-[#fff3f6] text-[#ff7894]")}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold">{card.title}</span>
                        <span className={cn("mt-1 block text-sm leading-6", card.featured ? "text-white/86" : "text-slate-500")}>
                          {card.helper}
                        </span>
                      </span>
                      <ArrowRight className={cn("h-4 w-4 shrink-0 transition group-hover:translate-x-1", card.featured ? "text-white" : "text-[#ff9fb4]")} />
                    </Link>
                  )
                })}
              </div>
            </div>

            <aside className="rounded-[34px] bg-gradient-to-br from-[#fff7d8] via-white to-[#effdfa] p-5 shadow-[0_18px_50px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-[20px] bg-white text-[#ff7894] shadow-sm">
                  <Music2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">推荐治愈音乐</p>
                  <p className="mt-1 text-xs text-slate-500">根据最近记录进入音乐房间</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-600">
                {latestRecord
                  ? `最近一次是「${latestMoodMeta.label}」${latestRecord.intensity}/10，先给你一段更贴合当下的声音。`
                  : "还没有记录时，先用平静模式开始，让身体慢慢放下来。"}
              </p>
              <Link
                href={`/music?mood=${musicMood}&intensity=${musicIntensity}`}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(255,151,173,0.22)]"
              >
                <Play className="h-4 w-4" />
                播放治愈音乐
              </Link>
            </aside>
          </section>
        </div>
      </MoodWaveShell>
    )
  }

  return (
    <MoodWaveShell title="情绪录入">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,208,219,0.2)] ring-1 ring-white/75 md:p-8">
          <div className="mb-5 rounded-[28px] bg-gradient-to-br from-[#fff7fa] to-[#effdfa] p-4 ring-1 ring-white/80 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#ff7894]">{currentEntryIntent.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{currentEntryIntent.helper}</p>
              </div>
              <Link
                href="/mood"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-600 ring-1 ring-[#f1dfe5] transition hover:-translate-y-0.5"
              >
                返回记录首页
              </Link>
            </div>
          </div>
          <div className="mb-6 rounded-[30px] bg-gradient-to-br from-[#fff7fa] to-[#eefdfa] p-4 ring-1 ring-white/80 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">今天准备记下哪一天的心情？</p>
                <p className="mt-2 text-2xl font-semibold text-[#1f2635]">
                  当前记录：{formatDateHeadline(recordDate)}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  默认记录今天，也可以补记过去的某一天。提交后会明确归档到这一天。
                </p>
              </div>
              <RecordDatePicker value={recordDate} onChange={setRecordDate} className="self-start lg:self-center" />
            </div>
          </div>

          <div className="mx-auto mb-8 max-w-3xl">
            <div className="flex items-center justify-between gap-2">
              {steps.map((label, index) => {
                const current = index + 1
                const active = step === current
                const completed = step > current || (step === 3 && submitted)
                return (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold shadow-sm",
                          active && "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white",
                          completed && "bg-[#8de1d5] text-white",
                          !active && !completed && "bg-[#ece8ee] text-slate-500",
                        )}
                      >
                        {current}
                      </div>
                      <span className={cn("text-xs md:text-sm", active ? "text-[#ff708b]" : "text-slate-500")}>
                        {label}
                      </span>
                    </div>
                    {index < steps.length - 1 ? (
                      <div className={cn("mb-6 h-[2px] flex-1 rounded-full", completed ? "bg-[#8de1d5]" : "bg-[#ece8ee]")} />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              {step === 1 && (
                <section className="space-y-6">
                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">今天的心情更像哪一种？</h2>
                    <p className="mt-2 text-sm text-slate-500">先选一个最接近的状态，不需要一次就选得很准。</p>
                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood.value}
                          type="button"
                          onClick={() => setSelectedMood(mood.value)}
                          className={cn(
                            "rounded-[28px] border bg-white px-4 py-5 text-center shadow-[0_10px_30px_rgba(255,220,228,0.1)] transition hover:-translate-y-1",
                            selectedMood === mood.value ? "border-transparent ring-2 ring-[#ffb6c4]" : "border-[#f6e4e9]",
                          )}
                        >
                          <div
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] text-3xl"
                            style={{ backgroundColor: mood.softAccent }}
                          >
                            {mood.emoji}
                          </div>
                          <p className="mt-3 font-medium text-slate-800">{mood.label}</p>
                          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full" style={{ backgroundColor: mood.accent }} />
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">这些标签和今天更像吗？</h2>
                    <p className="mt-2 text-sm text-slate-500">标签是帮助你快速定位情绪来源的，不必每次都选很多。</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {moodTagOptions.map((tag) => {
                        const active = selectedTags.includes(tag.value)
                        return (
                          <button
                            key={tag.value}
                            type="button"
                            onClick={() => {
                              if (tag.value === "other") {
                                setShowCustomTag(true)
                                return
                              }
                              setSelectedTags((current) =>
                                active ? current.filter((item) => item !== tag.value) : [...current, tag.value],
                              )
                            }}
                            className={cn(
                              "min-h-10 rounded-full px-4 py-2 text-sm transition",
                              active
                                ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_12px_24px_rgba(255,181,194,0.2)]"
                                : "border border-[#f3dfe5] bg-white text-slate-600",
                            )}
                          >
                            {tag.label}
                          </button>
                        )
                      })}
                    </div>
                    {showCustomTag ? (
                      <div className="mt-5 flex flex-col gap-3 rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f6dfe6] sm:flex-row">
                        <input
                          value={customTag}
                          onChange={(event) => setCustomTag(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") addCustomTag()
                          }}
                          placeholder="输入自定义标签，比如：比赛 / 宿舍 / 创作"
                          className="min-h-11 flex-1 rounded-full border border-[#f0dbe2] bg-white px-4 text-sm outline-none focus:border-[#ff9fb4]"
                        />
                        <button
                          type="button"
                          onClick={addCustomTag}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white"
                        >
                          <Plus className="h-4 w-4" />
                          添加
                        </button>
                      </div>
                    ) : null}
                    {selectedTags.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {selectedTags.map((tag) => {
                          const label = moodTagOptions.find((item) => item.value === tag)?.label ?? tag
                          return (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => setSelectedTags((current) => current.filter((item) => item !== tag))}
                              className="rounded-full bg-[#fff3f6] px-3 py-1.5 text-xs text-[#ff7894] ring-1 ring-[#ffd9e2]"
                            >
                              {label} ×
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </section>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-6">
                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">这份心情有多明显？</h2>
                    <p className="mt-2 text-sm text-slate-500">拖一拖滑块，让灵音更接近你此刻的强度。</p>
                    <div className="mt-8">
                      <div className="relative h-4 rounded-full bg-gradient-to-r from-[#84dcd0] via-[#ffe49d] to-[#ff9aa8]">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={intensity}
                          onChange={(event) => setIntensity(Number(event.target.value))}
                          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
                        />
                      </div>
                      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                        <span>轻微</span>
                        <span className="rounded-full bg-[#fff2f6] px-4 py-2 font-semibold text-[#ff708b]">
                          {intensity} / 10
                        </span>
                        <span>强烈</span>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">把这份心情留一下</h2>
                    <p className="mt-2 text-sm text-slate-500">文字、图片和语音都可以，只写一句也没关系。</p>

                    <div className="mt-5 rounded-[28px] border border-[#f6e4e9] bg-white p-4 shadow-[0_10px_28px_rgba(255,216,225,0.12)]">
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value.slice(0, 700))}
                        placeholder="今天发生了什么？或者你最想先留下哪一句感受？"
                        rows={8}
                        className="w-full resize-none bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                      />
                      <div className="mt-3 flex items-center justify-between border-t border-[#f7e6eb] pt-4">
                        <p className="text-xs text-slate-400">图片和语音会一起进入本次分析</p>
                        <p className="text-xs text-slate-400">{note.length}/700</p>
                      </div>
                      {voiceFile ? (
                        <div className="mt-4 rounded-[24px] border border-[#f0dde4] bg-gradient-to-br from-white to-[#fff7fa] p-4 shadow-[0_12px_28px_rgba(255,181,194,0.12)]">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#eefdfa] text-xl">
                              🎤
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-700">语音记录 ({voiceDuration || 1}秒)</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {voiceStatus === "uploading"
                                  ? "AI 正在把录音转成文字…"
                                  : voiceStatus === "ready"
                                    ? voiceText
                                      ? "已识别完成，下面就是这段语音的转写"
                                      : "已保存录音，但这段语音暂时没有识别出文字"
                                    : voiceStatus === "empty"
                                      ? "录音已收到，但这段语音暂时没有识别出可展示的文字"
                                    : voiceStatus === "failed"
                                      ? voiceError || "转写失败，录音已保留"
                                      : "已录制"}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowVoiceText((value) => !value)}
                                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#fff1f5] px-3 text-xs font-semibold text-[#ff7894] transition hover:-translate-y-0.5"
                              >
                                {showVoiceText ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                {showVoiceText ? "收起转写" : "展开转写"}
                              </button>
                              <button
                                type="button"
                                onClick={clearVoiceRecording}
                                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-slate-400 transition hover:text-[#ef8d7b]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                删除
                              </button>
                            </div>
                          </div>
                          {voicePreviewUrl ? (
                            <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-white/82 px-3 py-2 ring-1 ring-[#f6e4e9]">
                              <Play className="h-4 w-4 shrink-0 text-[#8de1d5]" />
                              <audio src={voicePreviewUrl} controls className="h-9 w-full min-w-0" />
                            </div>
                          ) : null}
                          {showVoiceText ? (
                            voiceText ? (
                              <p className="mt-3 rounded-[18px] bg-[#f9f6f8] p-3 text-sm leading-6 text-slate-600">
                                {voiceText}
                              </p>
                            ) : (
                              <p className="mt-3 rounded-[18px] bg-[#f9f6f8] p-3 text-xs leading-6 text-slate-400">
                                {voiceStatus === "uploading"
                                  ? "AI 正在识别中，请稍候…"
                                  : voiceStatus === "failed"
                                    ? voiceError || "语音转写失败，但录音已经为你保留下来了。"
                                    : "这段录音暂时还没有可展示的转写文字。"}
                              </p>
                            )
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(280px,1.05fr)]">
                        <MoodMediaUpload images={images} onImagesChange={setImages} />
                        <MoodVoiceRecorder onRecordingChange={handleVoiceRecording} resetKey={voiceResetKey} />
                      </div>
                    </div>
                  </section>
                </section>
              )}

              {step === 3 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-6 text-center md:p-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_18px_34px_rgba(255,181,194,0.28)]">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold">
                    {submitted ? "这次心情已经整理好了" : "灵音正在认真理解你刚刚留下的内容"}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {analysisStage || "正在分析你的情绪波纹，马上给你一段轻轻的回应。"}
                  </p>
                  <div className="mx-auto mt-6 max-w-2xl">
                    <div className="h-3 overflow-hidden rounded-full bg-[#f6e9ee]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffc3d0] to-[#8de1d5] transition-[width] duration-500 ease-out"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>正在整合文字、语音和图片线索</span>
                      <span>{analysisProgress}%</span>
                    </div>
                  </div>
                  {submitNotice ? (
                    <p className="mx-auto mt-4 max-w-xl rounded-full bg-[#fff7d8] px-4 py-2 text-xs text-[#b67820]">{submitNotice}</p>
                  ) : null}
                  <div className="mx-auto mt-6 max-w-3xl">
                    {submitted ? (
                      <MoodAnalysisReport report={analysisReport ?? buildFallbackReport()} />
                    ) : (
                      <div className="space-y-4 text-left">
                        <div className="rounded-[28px] bg-gradient-to-br from-[#fff4f7] to-[#effdfa] p-5">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#ff718b]">
                            <Sparkles className="h-4 w-4" />
                            AI 正在生成情绪报告
                          </div>
                          <p className="text-sm leading-7 text-slate-600">
                            灵音会把你刚刚留下的情绪、标签、语音转写和图片一起理解，再整理成更贴近你的反馈。
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {[
                            "整理你的主要情绪和强度",
                            "对照语音与文字里的细节",
                            "提取图片里和情绪有关的线索",
                            "生成更真实的洞察与建议",
                          ].map((item, index) => (
                            <div key={item} className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e2e8]">
                              <p className="text-sm font-semibold text-slate-900">步骤 {index + 1}</p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1)
                        setSubmitted(false)
                        setAnalysisReport(null)
                        setSubmitNotice("")
                        setAnalysisStage("")
                      }}
                      className="rounded-full border border-[#f1dbe2] bg-white px-6 py-3 text-sm font-semibold text-slate-700"
                    >
                      重新记录
                    </button>
                    <Link
                      href={`/music?mood=${selectedMood}&intensity=${intensity}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white"
                    >
                      <Play className="h-4 w-4" />
                      播放治愈音乐
                    </Link>
                  </div>
                </section>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.max(1, value - 1))}
                  disabled={step === 1 || isSubmitting}
                  className="rounded-full border border-[#f1dbe2] bg-white px-5 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一步
                </button>
                {step < 2 && (
                  <button
                    type="button"
                    onClick={() => setStep((value) => Math.min(3, value + 1))}
                    disabled={!canContinue}
                    className="rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    继续记录
                  </button>
                )}
                {step === 2 && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "正在分析…" : "开始分析"}
                  </button>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[30px] bg-gradient-to-br from-[#fff7fa] to-[#eefdfa] p-6 shadow-[0_16px_40px_rgba(255,213,223,0.18)]">
                <p className="text-sm text-slate-500">当前记录预览</p>
                <div className="mt-5 flex items-center gap-4">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-[28px] text-4xl"
                    style={{ backgroundColor: selectedMoodMeta.softAccent }}
                  >
                    {selectedMoodMeta.emoji}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{selectedMoodMeta.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      记录 {formatDateHeadline(recordDate)} · 强度 {intensity}/10
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-white/85 p-6 shadow-[0_16px_40px_rgba(255,213,223,0.18)] ring-1 ring-white/70">
                <h3 className="text-lg font-semibold">灵音会先看这些线索</h3>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>情绪：{selectedMoodMeta.label}</p>
                  <p>标签：{selectedTags.length > 0 ? selectedTags.join("、") : "还没有额外标签"}</p>
                  <p>内容：{note ? "已经写下一些感受了" : voiceText ? "主要会参考语音转写内容" : "你也可以只选情绪和强度开始"}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
