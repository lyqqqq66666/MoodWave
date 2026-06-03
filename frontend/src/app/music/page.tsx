"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Heart,
  Loader2,
  MessageCircleHeart,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  Waves,
} from "lucide-react"
import { aiAPI, moodAPI, musicAPI } from "@/lib/api"
import { getMoodOption, moodOptions } from "@/lib/moodwave"
import type { MoodType, MusicRecommendation } from "@/lib/types"
import { IOSGlassCard } from "@/components/ios/ios-glass-card"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { CompanionAvatar } from "@/components/companion-avatar"
import { EmptyStateGuide } from "@/components/onboarding/empty-state-guide"
import { isIOSApp } from "@/lib/platform"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"

type MoodSoundProfile = {
  bpm: number
  scale: string[]
  wave: "sine" | "triangle" | "sawtooth" | "square"
  pulse: number
  color: string
  colorTo: string
  album: string
  title: string
  texture: string
  insight: string
}

type Particle = {
  x: number
  y: number
  baseY: number
  radius: number
  speed: number
  phase: number
  opacity: number
}

type ToneModule = typeof import("tone/build/esm/index")
type InsightStatus = "idle" | "generating" | "retrying" | "error"

const moodProfiles: Record<MoodType, MoodSoundProfile> = {
  happy: {
    bpm: 112,
    scale: ["C4", "E4", "G4", "B4", "C5", "E5"],
    wave: "triangle",
    pulse: 1.15,
    color: "#FFD166",
    colorTo: "#EF8D7B",
    album: "from-[#ffe59a] via-[#ffd2dc] to-[#9ee7d7]",
    title: "晴朗的午后",
    texture: "明亮琶音 + 轻快节拍",
    insight: "开心的能量适合被延长一点，试着把今天的小确幸留进歌里。",
  },
  calm: {
    bpm: 72,
    scale: ["D4", "F#4", "A4", "C#5", "E5"],
    wave: "sine",
    pulse: 0.78,
    color: "#90E0EF",
    colorTo: "#CBC3E3",
    album: "from-[#bfefff] via-[#eadffd] to-[#f8dce6]",
    title: "宁静的午后",
    texture: "柔和和弦 + 慢速波纹",
    insight: "平静正在帮你恢复秩序，保持现在的呼吸频率就很好。",
  },
  anxious: {
    bpm: 94,
    scale: ["A3", "C4", "E4", "G4", "B4"],
    wave: "sine",
    pulse: 1.35,
    color: "#8ECAE6",
    colorTo: "#FFE66D",
    album: "from-[#cdefff] via-[#fff1a8] to-[#ffd5dc]",
    title: "轻轻降噪",
    texture: "低频铺底 + 温和白噪",
    insight: "焦虑像很多同时亮起的小灯，我们先让它们一盏一盏暗下来。",
  },
  angry: {
    bpm: 86,
    scale: ["E3", "G3", "B3", "D4", "E4"],
    wave: "sawtooth",
    pulse: 1.28,
    color: "#EF8D7B",
    colorTo: "#F4A261",
    album: "from-[#ffb49f] via-[#ffd09e] to-[#bfead0]",
    title: "热量慢慢散开",
    texture: "暖色低音 + 释放型脉冲",
    insight: "愤怒说明边界正在发声，先把热量安全地交给节奏。",
  },
  sad: {
    bpm: 58,
    scale: ["F3", "A3", "C4", "E4", "G4"],
    wave: "sine",
    pulse: 0.62,
    color: "#C7E8CA",
    colorTo: "#A8DADC",
    album: "from-[#d9f2d6] via-[#c8eef3] to-[#efe2ff]",
    title: "给低落一条毯子",
    texture: "低频长音 + 下沉粒子",
    insight: "难过不需要马上被修好，先让音乐陪你把它安放下来。",
  },
  neutral: {
    bpm: 76,
    scale: ["G3", "B3", "D4", "G4", "A4"],
    wave: "triangle",
    pulse: 0.88,
    color: "#F5F5DC",
    colorTo: "#E0E0E0",
    album: "from-[#f8f4d8] via-[#e9eef0] to-[#dff3e9]",
    title: "普通日子的微光",
    texture: "均匀颗粒 + 轻柔律动",
    insight: "平淡也有自己的纹理，今天可以用一首轻音乐慢慢扫过。",
  },
}

const fallbackRecommendations: Record<MoodType, MusicRecommendation[]> = {
  happy: [
    { id: "happy-1", title: "星空下的草莓", artist: "MoodWave AI", mood_type: "happy", url: "", duration: 214 },
    { id: "happy-2", title: "阳光小跳步", artist: "MoodWave AI", mood_type: "happy", url: "", duration: 188 },
    { id: "happy-3", title: "午后汽水", artist: "MoodWave AI", mood_type: "happy", url: "", duration: 205 },
  ],
  calm: [
    { id: "calm-1", title: "宁静的午后", artist: "MoodWave AI", mood_type: "calm", url: "", duration: 225 },
    { id: "calm-2", title: "云朵慢步", artist: "MoodWave AI", mood_type: "calm", url: "", duration: 196 },
    { id: "calm-3", title: "浅海呼吸", artist: "MoodWave AI", mood_type: "calm", url: "", duration: 242 },
  ],
  anxious: [
    { id: "anxious-1", title: "轻轻降噪", artist: "MoodWave AI", mood_type: "anxious", url: "", duration: 210 },
    { id: "anxious-2", title: "把线团松开", artist: "MoodWave AI", mood_type: "anxious", url: "", duration: 230 },
    { id: "anxious-3", title: "慢慢数到十", artist: "MoodWave AI", mood_type: "anxious", url: "", duration: 201 },
  ],
  angry: [
    { id: "angry-1", title: "热量慢慢散开", artist: "MoodWave AI", mood_type: "angry", url: "", duration: 219 },
    { id: "angry-2", title: "柔软边界", artist: "MoodWave AI", mood_type: "angry", url: "", duration: 184 },
    { id: "angry-3", title: "暖风出口", artist: "MoodWave AI", mood_type: "angry", url: "", duration: 206 },
  ],
  sad: [
    { id: "sad-1", title: "给低落一条毯子", artist: "MoodWave AI", mood_type: "sad", url: "", duration: 236 },
    { id: "sad-2", title: "雨后的小灯", artist: "MoodWave AI", mood_type: "sad", url: "", duration: 221 },
    { id: "sad-3", title: "慢慢浮上来", artist: "MoodWave AI", mood_type: "sad", url: "", duration: 248 },
  ],
  neutral: [
    { id: "neutral-1", title: "普通日子的微光", artist: "MoodWave AI", mood_type: "neutral", url: "", duration: 198 },
    { id: "neutral-2", title: "白纸和清茶", artist: "MoodWave AI", mood_type: "neutral", url: "", duration: 212 },
    { id: "neutral-3", title: "安静路过", artist: "MoodWave AI", mood_type: "neutral", url: "", duration: 203 },
  ],
}

const BPM_MIN = 40
const BPM_MAX = 180

function parseMood(value: string | null): MoodType {
  return moodOptions.some((item) => item.value === value) ? (value as MoodType) : "calm"
}

function parseIntensity(value: string | null) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return 6
  return Math.min(10, Math.max(1, parsed))
}

function normalizeRecommendations(payload: unknown, mood: MoodType): MusicRecommendation[] {
  const maybeWrapped = payload as { data?: unknown }
  const source = Array.isArray(payload) ? payload : Array.isArray(maybeWrapped?.data) ? maybeWrapped.data : []

  if (!Array.isArray(source) || source.length === 0) {
    return []
  }

  return source.slice(0, 5).map((item, index) => {
    const record = item as Partial<MusicRecommendation> & { mood?: MoodType }
    return {
      id: String(record.id ?? `${mood}-${index}`),
      title: record.title ?? fallbackRecommendations[mood][index % fallbackRecommendations[mood].length].title,
      artist: record.artist ?? "MoodWave AI",
      mood_type: record.mood_type ?? record.mood ?? mood,
      url: record.url ?? "",
      duration: record.duration ?? 200,
    }
  })
}

function normalizeFavoriteIds(payload: unknown) {
  const maybeWrapped = payload as { data?: unknown }
  const source = Array.isArray(payload) ? payload : Array.isArray(maybeWrapped?.data) ? maybeWrapped.data : []
  if (!Array.isArray(source)) return new Set<string>()

  return new Set(
    source
      .map((item) => {
        const record = item as { music_id?: string | number; id?: string | number }
        return String(record.music_id ?? record.id ?? "")
      })
      .filter(Boolean),
  )
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = String(seconds % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}

function getInsightErrorMessage(error: unknown) {
  const maybeResponse = error as {
    code?: string
    message?: string
    response?: { data?: { msg?: string; message?: string; detail?: string } }
  }
  const serverMessage =
    maybeResponse.response?.data?.msg ||
    maybeResponse.response?.data?.message ||
    maybeResponse.response?.data?.detail ||
    maybeResponse.message ||
    ""
  const lowerMessage = serverMessage.toLowerCase()

  if (maybeResponse.code === "ECONNABORTED" || lowerMessage.includes("timeout") || lowerMessage.includes("timed out") || serverMessage.includes("超时")) {
    return "生成有点超时，已先切换成本地陪伴语。可以点下方重新试一次。"
  }
  if (serverMessage.includes("fallback")) {
    return "AI 正在使用备用结果，陪伴语可能会更简短一些。"
  }
  if (serverMessage.includes("AI") || serverMessage.includes("DeepSeek")) {
    return "AI 服务暂时没有接住请求，已先保留一段本地听后感。"
  }
  return "网络有点不稳定，灵灵先送上一段本地陪伴建议。"
}

function MusicPageContent() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const mood = parseMood(searchParams.get("mood"))
  const intensity = parseIntensity(searchParams.get("intensity"))
  const moodMeta = getMoodOption(mood)
  const profile = moodProfiles[mood]
  const baseBpm = useMemo(() => Math.min(BPM_MAX, Math.max(BPM_MIN, profile.bpm + intensity * 2)), [intensity, profile.bpm])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)
  const toneRef = useRef<ToneModule | null>(null)
  const synthRef = useRef<InstanceType<ToneModule["PolySynth"]> | null>(null)
  const bassRef = useRef<InstanceType<ToneModule["MonoSynth"]> | null>(null)
  const noiseRef = useRef<InstanceType<ToneModule["NoiseSynth"]> | null>(null)
  const reverbRef = useRef<InstanceType<ToneModule["Reverb"]> | null>(null)
  const filterRef = useRef<InstanceType<ToneModule["Filter"]> | null>(null)
  const loopRef = useRef<{ dispose: () => void } | null>(null)
  const bassLoopRef = useRef<{ dispose: () => void } | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<MusicRecommendation[]>([])
  const [selectedTrack, setSelectedTrack] = useState(0)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [aiInsight, setAiInsight] = useState(profile.insight)
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [insightStatus, setInsightStatus] = useState<InsightStatus>("idle")
  const [insightError, setInsightError] = useState("")
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekPreview, setSeekPreview] = useState<number | null>(null)
  const [musicToast, setMusicToast] = useState("")
  const [currentBpm, setCurrentBpm] = useState(baseBpm)
  const [isBpmPanelOpen, setIsBpmPanelOpen] = useState(false)
  const [hasMoodRecord, setHasMoodRecord] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const iosApp = isIOSApp()
  // 用 ref 避免 aiInsight 进入 useCallback deps 导致的无限 abort 循环
  const insightRef = useRef(profile.insight)

  const selectedRecommendation = recommendations[selectedTrack] ?? { id: "empty", title: "", artist: "", mood_type: mood, url: "", duration: 200 }
  const progress = useMemo(
    () => Math.min(100, (elapsedTime / Math.max(1, selectedRecommendation.duration)) * 100),
    [elapsedTime, selectedRecommendation.duration],
  )

  const loadAIInsight = useCallback(async (signal?: AbortSignal) => {
    setIsInsightLoading(true)
    setInsightStatus(insightRef.current && insightRef.current !== profile.insight ? "retrying" : "generating")
    setInsightError("")
    setAiInsight("")

    try {
      const response = await aiAPI.analyzeMood({
          mood_type: mood,
          intensity,
          note: `当前正在治愈音乐房间收听「${selectedRecommendation.title || profile.title}」，请生成一段适合${moodMeta.label}情绪的听后感。`,
          tags: ["music"],
          image_analysis: "",
          voice_text: "",
          mbti: user?.mbti || "",
          zodiac: user?.zodiac || "",
        },
        signal ? { signal } : undefined,
      )
      const envelope = response.data as { code?: number; msg?: string; message?: string; fallback?: boolean; data?: Record<string, unknown> | null }
      if (envelope?.code && envelope.code !== 0) {
        throw new Error(envelope.msg || envelope.message || "AI insight request failed")
      }
      const payload = (envelope?.data ?? response.data) as Record<string, unknown>
      const isFallback = Boolean(envelope?.fallback || payload?.fallback)
      const nextInsight =
        (typeof payload?.insight === "string" && payload.insight) ||
        (typeof payload?.suggestion === "string" && payload.suggestion) ||
        (typeof payload?.summary === "string" && payload.summary) ||
        profile.insight
      insightRef.current = nextInsight
      setAiInsight(nextInsight)
      setInsightStatus(isFallback ? "error" : "idle")
      if (isFallback) {
        setInsightError("AI 暂时给了备用陪伴语，稍后重新生成可能会更贴近你。")
      }
    } catch (error) {
      const errName = (error as Error).name
      // axios AbortController 会抛 CanceledError，不是 AbortError
      if (errName === "AbortError" || errName === "CanceledError") return
      setAiInsight(profile.insight)
      insightRef.current = profile.insight
      setInsightStatus("error")
      setInsightError(getInsightErrorMessage(error))
    } finally {
      setIsInsightLoading(false)
    }
  }, [intensity, mood, moodMeta.label, profile.insight, profile.title, selectedRecommendation.title, user?.mbti, user?.zodiac])

  const disposeTone = useCallback(() => {
    loopRef.current?.dispose()
    bassLoopRef.current?.dispose()
    synthRef.current?.dispose()
    bassRef.current?.dispose()
    noiseRef.current?.dispose()
    reverbRef.current?.dispose()
    filterRef.current?.dispose()
    loopRef.current = null
    bassLoopRef.current = null
    synthRef.current = null
    bassRef.current = null
    noiseRef.current = null
    reverbRef.current = null
    filterRef.current = null
  }, [])

  const stopMusic = useCallback(() => {
    const Tone = toneRef.current
    Tone?.Transport.stop()
    Tone?.Transport.cancel()
    disposeTone()
    setIsPlaying(false)
  }, [disposeTone])

  const startMusic = useCallback(async () => {
    setIsLoading(true)
    try {
      const Tone = toneRef.current ?? (await import("tone/build/esm/index"))
      toneRef.current = Tone
      await Tone.start()
      stopMusic()

      Tone.Transport.bpm.value = currentBpm
      reverbRef.current = new Tone.Reverb({ decay: 4.5, wet: 0.42 }).toDestination()
      filterRef.current = new Tone.Filter(420 + intensity * 70, "lowpass").connect(reverbRef.current)
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: profile.wave },
        envelope: { attack: 0.04, decay: 0.18, sustain: 0.42, release: 1.6 },
        volume: -14,
      }).connect(filterRef.current)
      bassRef.current = new Tone.MonoSynth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.08, decay: 0.2, sustain: 0.35, release: 1.8 },
        filterEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.2, release: 1.2, baseFrequency: 120, octaves: 2 },
        volume: -20,
      }).connect(reverbRef.current)

      if (mood === "anxious") {
        noiseRef.current = new Tone.NoiseSynth({
          noise: { type: "pink" },
          envelope: { attack: 0.3, decay: 0.2, sustain: 0.18, release: 1.2 },
          volume: -30,
        }).connect(reverbRef.current)
      }

      let step = 0
      loopRef.current = new Tone.Sequence(
        (time, note) => {
          synthRef.current?.triggerAttackRelease(note, "8n", time, 0.48 + intensity * 0.035)
          if (noiseRef.current && step % 4 === 0) {
            noiseRef.current.triggerAttackRelease("8n", time, 0.18)
          }
          step += 1
        },
        profile.scale,
        mood === "happy" ? "8n" : "4n",
      ).start(0)

      bassLoopRef.current = new Tone.Loop((time) => {
        bassRef.current?.triggerAttackRelease(profile.scale[0], "2n", time, 0.4)
      }, mood === "sad" ? "1m" : "2m").start(0)

      Tone.Transport.start()
      setIsPlaying(true)
      setElapsedTime(0)
    } finally {
      setIsLoading(false)
    }
  }, [currentBpm, intensity, mood, profile, stopMusic])

  useEffect(() => {
    setCurrentBpm(baseBpm)
  }, [baseBpm])

  useEffect(() => {
    setRecommendations([])
    setSelectedTrack(0)
    setLiked(false)
    setElapsedTime(0)

    let active = true
    Promise.allSettled([musicAPI.recommend(mood), musicAPI.favorites()]).then((results) => {
      if (!active) return

      const [recommendResult, favoritesResult] = results
      if (recommendResult.status === "fulfilled") {
        setRecommendations(normalizeRecommendations(recommendResult.value.data, mood))
      } else {
        setRecommendations([])
      }

      if (favoritesResult.status === "fulfilled") {
        setFavoriteIds(normalizeFavoriteIds(favoritesResult.value.data))
      } else {
        setFavoriteIds(new Set())
      }
    })

    return () => {
      active = false
    }
  }, [mood])

  useEffect(() => {
    let active = true
    moodAPI.list({ limit: 1 })
      .then((response) => {
        if (!active) return
        const payload = response.data as { data?: unknown }
        const rows = Array.isArray(response.data) ? response.data : Array.isArray(payload?.data) ? payload.data : []
        setHasMoodRecord(rows.length > 0)
      })
      .catch(() => {
        if (active) setHasMoodRecord(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setLiked(favoriteIds.has(selectedRecommendation.id))
  }, [favoriteIds, selectedRecommendation.id])

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(() => {
      setElapsedTime((current) => {
        if (current + 1 >= selectedRecommendation.duration) {
          setSelectedTrack((trackIndex) => (trackIndex + 1) % recommendations.length)
          return 0
        }
        return current + 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isPlaying, recommendations.length, selectedRecommendation.duration])

  useEffect(() => {
    const controller = new AbortController()
    void loadAIInsight(controller.signal)

    return () => {
      controller.abort()
    }
  }, [loadAIInsight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      particlesRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        baseY: rect.height * (0.35 + Math.random() * 0.42),
        radius: 1.4 + Math.random() * 4,
        speed: 0.24 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.35 + Math.random() * 0.55,
      }))
    }

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const energy = isPlaying ? profile.pulse + intensity / 10 : 0.45
      const t = time / 1000

      context.clearRect(0, 0, width, height)
      const background = context.createLinearGradient(0, 0, width, height)
      background.addColorStop(0, "rgba(255,255,255,0.84)")
      background.addColorStop(0.48, `${profile.color}33`)
      background.addColorStop(1, `${profile.colorTo}44`)
      context.fillStyle = background
      context.fillRect(0, 0, width, height)

      for (let layer = 0; layer < 4; layer += 1) {
        context.beginPath()
        const amplitude = (18 + layer * 12) * energy
        const yBase = height * (0.52 + layer * 0.08)
        for (let x = 0; x <= width; x += 8) {
          const y =
            yBase +
            Math.sin(x * 0.012 + t * (0.8 + layer * 0.18) + layer) * amplitude +
            Math.cos(x * 0.006 + t * 0.75) * amplitude * 0.35
          if (x === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.lineTo(width, height)
        context.lineTo(0, height)
        context.closePath()
        const waveGradient = context.createLinearGradient(0, yBase - amplitude, width, height)
        waveGradient.addColorStop(0, `${profile.color}${layer === 0 ? "55" : "33"}`)
        waveGradient.addColorStop(1, `${profile.colorTo}${layer === 0 ? "66" : "28"}`)
        context.fillStyle = waveGradient
        context.fill()
      }

      particlesRef.current.forEach((particle) => {
        particle.x += particle.speed * energy
        if (particle.x > width + 20) particle.x = -20
        const floatY = particle.baseY + Math.sin(t * particle.speed + particle.phase) * 22 * energy
        const radius = particle.radius * (isPlaying ? 1 + Math.sin(t * 3 + particle.phase) * 0.28 : 0.86)
        context.beginPath()
        context.arc(particle.x, floatY, Math.max(0.8, radius), 0, Math.PI * 2)
        context.fillStyle = `${profile.color}${Math.round(particle.opacity * 255).toString(16).padStart(2, "0")}`
        context.fill()
      })

      context.beginPath()
      const orbRadius = 60 + intensity * 5 + Math.sin(t * 1.2) * 7 * energy
      const orbGradient = context.createRadialGradient(width * 0.5, height * 0.4, 8, width * 0.5, height * 0.4, orbRadius)
      orbGradient.addColorStop(0, "rgba(255,255,255,0.95)")
      orbGradient.addColorStop(0.42, `${profile.color}88`)
      orbGradient.addColorStop(1, `${profile.colorTo}00`)
      context.fillStyle = orbGradient
      context.arc(width * 0.5, height * 0.4, orbRadius, 0, Math.PI * 2)
      context.fill()

      animationRef.current = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    animationRef.current = window.requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", resize)
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current)
      }
    }
  }, [intensity, isPlaying, profile])

  useEffect(() => {
    return () => {
      stopMusic()
    }
  }, [stopMusic])

  function togglePlay() {
    if (recommendations.length === 0) return
    if (isPlaying) {
      stopMusic()
      return
    }
    void startMusic()
  }

  function nextTrack() {
    setSelectedTrack((current) => (current + 1) % recommendations.length)
    setElapsedTime(0)
  }

  function prevTrack() {
    setSelectedTrack((current) => (current - 1 + recommendations.length) % recommendations.length)
    setElapsedTime(0)
  }

  function shuffleTracks() {
    setRecommendations((current) => {
      const shuffled = [...current]
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1))
        ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
      }
      return shuffled
    })
    setSelectedTrack(0)
    setElapsedTime(0)
  }

  function updateBpm(value: number) {
    const nextBpm = Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value)))
    setCurrentBpm(nextBpm)

    const Tone = toneRef.current
    if (Tone?.Transport) {
      const bpmSignal = Tone.Transport.bpm as unknown as {
        rampTo?: (value: number, rampTime: number) => void
        value: number
      }
      if (bpmSignal.rampTo) {
        bpmSignal.rampTo(nextBpm, 0.1)
      } else {
        bpmSignal.value = nextBpm
      }
    }
  }

  const seekTo = useCallback((percent: number) => {
    const safePercent = Math.min(1, Math.max(0, percent))
    const targetTime = Math.round(selectedRecommendation.duration * safePercent)
    setElapsedTime(targetTime)
    const Tone = toneRef.current
    if (Tone?.Transport) {
      ;(Tone.Transport as unknown as { seconds: number }).seconds = targetTime
    }
  }, [selectedRecommendation.duration])

  const getSeekPercent = useCallback((clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return progress / 100
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }, [progress])

  function updateSeekFromPointer(event: PointerEvent<HTMLDivElement>) {
    const percent = getSeekPercent(event.clientX)
    setSeekPreview(Math.round(selectedRecommendation.duration * percent))
    seekTo(percent)
  }

  function beginSeek(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsSeeking(true)
    updateSeekFromPointer(event)
  }

  function moveSeek(event: PointerEvent<HTMLDivElement>) {
    if (!isSeeking) return
    updateSeekFromPointer(event)
  }

  function endSeek(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsSeeking(false)
    setSeekPreview(null)
  }

  async function toggleFavorite() {
    const nextLiked = !liked
    setLiked(nextLiked)
    setFavoriteIds((current) => {
      const next = new Set(current)
      if (nextLiked) next.add(selectedRecommendation.id)
      else next.delete(selectedRecommendation.id)
      return next
    })

    try {
      const response = await musicAPI.favorite({
        music_id: selectedRecommendation.id,
        title: selectedRecommendation.title,
        artist: selectedRecommendation.artist,
        mood_type: selectedRecommendation.mood_type,
      })
      const action = response.data?.data?.action
      setFavoriteIds((current) => {
        const next = new Set(current)
        if (action === "added") next.add(selectedRecommendation.id)
        if (action === "removed") next.delete(selectedRecommendation.id)
        return next
      })
      if (action === "added") setLiked(true)
      if (action === "removed") setLiked(false)
    } catch {
      setLiked(!nextLiked)
      setFavoriteIds((current) => {
        const next = new Set(current)
        if (nextLiked) next.delete(selectedRecommendation.id)
        else next.add(selectedRecommendation.id)
        return next
      })
    }
  }

  function shareTrack() {
    // TODO: 后期接入通讯录好友分享
    setMusicToast("分享功能即将上线，先把这段旋律悄悄收藏起来吧。")
    window.setTimeout(() => setMusicToast(""), 2500)
  }

  function BpmControl({ className = "" }: { className?: string }) {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setIsBpmPanelOpen((value) => !value)}
          className="flex min-h-10 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:text-[#ff7894]"
          aria-expanded={isBpmPanelOpen}
          aria-label="调节 BPM"
        >
          <Volume2 className="h-4 w-4 text-[#8bded4]" />
          <span>{currentBpm} BPM</span>
        </button>
        {isBpmPanelOpen ? (
          <div className="absolute right-0 top-12 z-40 w-[min(280px,calc(100vw-2rem))] rounded-[26px] border border-white/80 bg-white/96 p-4 shadow-[0_18px_48px_rgba(255,181,194,0.24)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">节奏速度</p>
              <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-[#ff7894]">{currentBpm}</span>
            </div>
            <input
              type="range"
              min={BPM_MIN}
              max={BPM_MAX}
              step={1}
              value={currentBpm}
              onChange={(event) => updateBpm(Number(event.target.value))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5]"
              style={{ accentColor: "#ff8fa3" }}
              aria-label="BPM 滑块"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>{BPM_MIN}</span>
              <span>{BPM_MAX}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateBpm(currentBpm - 1)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#fff4f7] text-sm font-semibold text-slate-600 transition hover:text-[#ff7894]"
                aria-label="降低 BPM"
              >
                <Minus className="h-4 w-4" />
                1
              </button>
              <button
                type="button"
                onClick={() => updateBpm(currentBpm + 1)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#effdfa] text-sm font-semibold text-slate-600 transition hover:text-[#42b9aa]"
                aria-label="提高 BPM"
              >
                <Plus className="h-4 w-4" />
                1
              </button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <MoodWaveShell
      title="治愈音乐"
      rightSlot={
        <div className="hidden items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-[0_10px_26px_rgba(255,181,194,0.14)] md:flex">
          <Waves className="h-4 w-4 text-[#ff8fa3]" />
          {moodMeta.label} · {intensity}/10
        </div>
      }
    >
      <div className={cn("mx-auto", iosApp ? "max-w-[460px]" : "max-w-7xl")}>
        {!hasMoodRecord ? <EmptyStateGuide variant="music" className="mb-5" /> : null}
        <section className={cn("relative isolate flex min-h-[calc(100svh-9rem)] flex-col overflow-hidden rounded-[34px] bg-gradient-to-br from-[#fff0f5]/80 via-[#f7f5ff]/60 to-[#f0faf8]/70 p-4 sm:p-5 lg:min-h-[calc(100svh-12rem)] lg:p-6", iosApp && "ios-floating-card min-h-[calc(100svh-10rem)] rounded-[36px] p-4")}>
          <div className="relative z-20 mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-2 text-sm font-semibold text-[#ff738b] shadow-sm backdrop-blur-md lg:bg-[#fff3f6]">
              <span>{moodMeta.emoji}</span>
              {moodMeta.label}
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              className={cn("grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 shadow-[0_10px_24px_rgba(255,181,194,0.16)] transition hover:text-[#ff8fa3]", liked && "text-[#ff6f88]")}
              aria-label="收藏"
              title={liked ? "已收藏" : "添加到收藏"}
            >
              <Heart className={cn("h-5 w-5", liked && "fill-current")} />
            </button>
          </div>

          <div className={cn("relative grid min-w-0 flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(330px,0.42fr)] xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.42fr)]", iosApp && "grid-cols-1")}>
            <div className="absolute inset-0 min-w-0 overflow-hidden lg:relative lg:inset-auto">
              <div className="mb-4 hidden items-center justify-between gap-3 md:flex">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">情绪可视化</h2>
                  <p className="mt-2 text-sm text-slate-500">{profile.texture}</p>
                </div>
                <BpmControl />
              </div>

              <div className="relative z-0 h-full min-h-full max-w-full overflow-hidden sm:aspect-[16/11] lg:h-full lg:min-h-[520px]">
                <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full max-w-full" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10 lg:hidden" />
                <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
                  <div className="hidden rounded-[24px] bg-white/68 px-4 py-3 text-sm text-slate-600 backdrop-blur-md sm:block">
                    <p className="font-semibold text-slate-800">{profile.texture}</p>
                    <p className="mt-1 text-xs">跟随此刻心情缓慢流动</p>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isPlaying ? "playing" : "paused"}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="ml-auto rounded-full bg-white/72 px-3 py-2 text-xs font-semibold text-slate-600 backdrop-blur-md"
                    >
                      {isPlaying ? "正在播放" : "等待播放"}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <aside className={cn("relative z-10 flex min-h-[calc(100svh-15rem)] min-w-0 items-end pt-[32vh] lg:block lg:min-h-0 lg:pt-[74px]", iosApp && "min-h-0 items-stretch pt-0")}>
              <div className={cn("mx-auto w-full max-w-sm rounded-[30px] bg-white/50 p-4 shadow-[0_18px_48px_rgba(255,208,219,0.24)] backdrop-blur-2xl ring-1 ring-white/30 lg:max-w-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0 lg:ring-0", iosApp && "ios-sticky-action")}>
                <div className="flex items-center gap-4">
                  <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br text-3xl text-white shadow-[0_14px_30px_rgba(255,181,194,0.22)] sm:h-20 sm:w-20 sm:rounded-[24px]", profile.album)}>
                    ♪
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-slate-900">{selectedRecommendation.title || profile.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{selectedRecommendation.artist}</p>
                  </div>
                </div>
                <BpmControl className="mt-4 md:hidden" />

                <div className="mt-7">
                  <div
                    ref={progressRef}
                    role="slider"
                    tabIndex={0}
                    aria-label="播放进度"
                    aria-valuemin={0}
                    aria-valuemax={selectedRecommendation.duration}
                    aria-valuenow={elapsedTime}
                    onPointerDown={beginSeek}
                    onPointerMove={moveSeek}
                    onPointerUp={endSeek}
                    onPointerCancel={endSeek}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") seekTo((elapsedTime - 5) / selectedRecommendation.duration)
                      if (event.key === "ArrowRight") seekTo((elapsedTime + 5) / selectedRecommendation.duration)
                    }}
                    className="group relative -my-3 cursor-pointer touch-none py-3 outline-none"
                  >
                    {isSeeking ? (
                      <div
                        className="pointer-events-none absolute -top-8 rounded-full bg-slate-900/78 px-3 py-1 text-xs font-semibold text-white shadow-lg"
                        style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
                      >
                        {formatDuration(seekPreview ?? elapsedTime)} / {formatDuration(selectedRecommendation.duration)}
                      </div>
                    ) : null}
                    <div className={cn("rounded-full bg-[#f0edf0] transition-all", isSeeking ? "h-3" : "h-2")}>
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: isSeeking ? 0 : 0.24 }}
                        className="h-full rounded-full bg-gradient-to-r from-[#ff8fa3] to-[#8de1d5]"
                      />
                    </div>
                    <motion.span
                      animate={{ left: `${progress}%`, scale: isSeeking ? 1.25 : 1 }}
                      transition={{ duration: isSeeking ? 0 : 0.24 }}
                      className="absolute top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_8px_20px_rgba(255,143,163,0.34)] ring-2 ring-[#ff9fb4]"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#8de1d5]" />
                    </motion.span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>{formatDuration(elapsedTime)}</span>
                    <span>{formatDuration(selectedRecommendation.duration)}</span>
                  </div>
                </div>

                <div className="mt-7 flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={prevTrack}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(255,181,194,0.18)] transition hover:-translate-y-0.5"
                    aria-label="上一首"
                    title="上一首"
                  >
                    <SkipBack className="h-5 w-5 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#ff8fa3] to-[#8de1d5] text-white shadow-[0_16px_34px_rgba(255,143,163,0.3)] transition hover:-translate-y-0.5 disabled:cursor-wait"
                    aria-label={isPlaying ? "暂停" : "播放"}
                    title={isPlaying ? "暂停" : "播放"}
                  >
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
                  </button>
                  <button
                    type="button"
                    onClick={nextTrack}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(255,181,194,0.18)] transition hover:-translate-y-0.5"
                    aria-label="下一首"
                    title="下一首"
                  >
                    <SkipForward className="h-5 w-5 fill-current" />
                  </button>
                </div>

                <div className="mt-7 grid grid-cols-4 gap-3 text-center">
                  <button type="button" onClick={shuffleTracks} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#ff8fa3]" aria-label="随机播放" title="随机播放">
                    <Shuffle className="mx-auto h-5 w-5" />
                    <span className="mt-1 block">随机</span>
                  </button>
                  <button type="button" onClick={() => { stopMusic(); void startMusic() }} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#5fcfc2]" aria-label="重新生成" title="重新生成音乐">
                    <RefreshCw className="mx-auto h-5 w-5" />
                    <span className="mt-1 block">循环</span>
                  </button>
                  <button type="button" onClick={shareTrack} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#ff8fa3]" aria-label="分享" title="分享音乐">
                    <Share2 className="mx-auto h-5 w-5" />
                    <span className="mt-1 block">分享</span>
                  </button>
                  <button type="button" onClick={() => setShowDetails((value) => !value)} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#62bda9]" aria-label="更多" title="听后感与歌单">
                    <MessageCircleHeart className="mx-auto h-5 w-5" />
                    <span className="mt-1 block">更多</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className={cn("mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]", !showDetails && !iosApp && "hidden lg:grid")}>
          <IOSGlassCard className={cn("rounded-[32px] p-5", iosApp && "bg-white/88")}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <CompanionAvatar
                    character={user?.avatar_character}
                    color={user?.character_color}
                    mood={mood}
                    size="sm"
                  />
                  <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#ff7f96] shadow-sm">
                    {isInsightLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircleHeart className="h-3.5 w-3.5" />}
                  </div>
                </div>
                <div className="hidden h-12 w-12 items-center justify-center rounded-[20px] bg-[#fff1f5] text-[#ff7f96]">
                  {isInsightLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircleHeart className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">灵音伙伴的听后感</h3>
                  <p className="text-xs text-slate-500">
                    {insightStatus === "generating"
                      ? "伙伴正在听这段旋律..."
                      : insightStatus === "retrying"
                        ? "正在重新生成更贴近的回应..."
                        : insightStatus === "error"
                          ? "当前展示备用陪伴语"
                          : "角色会结合情绪与音乐给你回应"}
                  </p>
                </div>
              </div>
              <p className="mt-4 min-h-[84px] whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {aiInsight || (insightStatus === "retrying" ? "正在重新整理这段旋律里的情绪线索..." : "正在把你的情绪调成一段温柔的文字...")}
              </p>
              {insightError ? <p className="mt-3 text-xs text-[#ef7b73]">{insightError}</p> : null}
              <div className="mt-4 rounded-[24px] bg-gradient-to-br from-[#fff6f8] to-[#effdfa] p-4 text-sm text-slate-600">
                <Sparkles className="mb-2 h-4 w-4 text-[#ff8fa3]" />
                <button
                  type="button"
                  onClick={() => void loadAIInsight()}
                  disabled={isInsightLoading}
                  className="font-semibold text-[#ff718b] transition hover:text-[#e95d78] disabled:cursor-wait disabled:text-slate-400"
                >
                  重新生成陪伴语
                </button>
              </div>
          </IOSGlassCard>

          <IOSGlassCard className={cn("rounded-[32px] p-5", iosApp && "bg-white/88")}>
              <h3 className="font-semibold text-slate-900">推荐歌曲</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recommendations.map((track, index) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setSelectedTrack(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[24px] p-3 text-left transition",
                      selectedTrack === index ? "bg-[#fff3f6] shadow-sm" : "bg-white/60 hover:bg-white",
                    )}
                  >
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br text-lg shadow-sm", profile.album)}>
                      ♪
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{track.title}</p>
                      <p className="truncate text-xs text-slate-500">{track.artist}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDuration(track.duration)}</span>
                  </button>
                ))}
              </div>
          </IOSGlassCard>
        </div>
      </div>
      <AnimatePresence>
        {musicToast ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="fixed bottom-6 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_18px_44px_rgba(255,143,163,0.32)]"
          >
            {musicToast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MoodWaveShell>
  )
}

export default function MusicPage() {
  return (
    <Suspense
      fallback={
        <MoodWaveShell title="治愈音乐">
          <div className="mx-auto flex min-h-[520px] max-w-7xl items-center justify-center rounded-[34px] bg-white/82 shadow-[0_20px_60px_rgba(255,208,219,0.22)] ring-1 ring-white/75">
            <div className="text-center text-slate-500">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#ff8fa3]" />
              <p className="mt-3 text-sm">正在准备音乐房间...</p>
            </div>
          </div>
        </MoodWaveShell>
      }
    >
      <MusicPageContent />
    </Suspense>
  )
}
