"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Heart,
  Loader2,
  MessageCircleHeart,
  Pause,
  Play,
  RefreshCw,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  Waves,
} from "lucide-react"
import { aiAPI, musicAPI } from "@/lib/api"
import { getMoodOption, moodOptions } from "@/lib/moodwave"
import type { MoodType, MusicRecommendation } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
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
type SSEMessage = {
  type?: "text" | "done" | "error"
  content?: string
}

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
    return fallbackRecommendations[mood]
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

function MusicPageContent() {
  const searchParams = useSearchParams()
  const mood = parseMood(searchParams.get("mood"))
  const intensity = parseIntensity(searchParams.get("intensity"))
  const moodMeta = getMoodOption(mood)
  const profile = moodProfiles[mood]

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

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<MusicRecommendation[]>(fallbackRecommendations[mood])
  const [selectedTrack, setSelectedTrack] = useState(0)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [aiInsight, setAiInsight] = useState(profile.insight)
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState("")

  const selectedRecommendation = recommendations[selectedTrack] ?? fallbackRecommendations[mood][0]
  const progress = useMemo(
    () => Math.min(100, (elapsedTime / Math.max(1, selectedRecommendation.duration)) * 100),
    [elapsedTime, selectedRecommendation.duration],
  )

  const loadAIInsight = useCallback(async (signal?: AbortSignal) => {
    setIsInsightLoading(true)
    setInsightError("")
    setAiInsight("")

    try {
      const response = await fetch(aiAPI.chatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood_type: mood,
          intensity,
          message: `请结合当前音乐房间，给我一段适合${moodMeta.label}情绪的温柔陪伴建议。`,
        }),
        signal,
      })

      if (!response.ok || !response.body) {
        throw new Error(`AI insight request failed: ${response.status}`)
      }

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

        for (const event of events) {
          const dataLine = event
            .split("\n")
            .map((line) => line.trim())
            .find((line) => line.startsWith("data:"))

          if (!dataLine) continue

          const payload = JSON.parse(dataLine.replace(/^data:\s*/, "")) as SSEMessage
          if (payload.type === "text" && payload.content) {
            streamedText += payload.content
            setAiInsight(streamedText)
          }
          if (payload.type === "error") {
            throw new Error(payload.content || "AI insight stream error")
          }
          if (payload.type === "done") {
            setIsInsightLoading(false)
            return
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      setAiInsight(profile.insight)
      setInsightError("灵灵先送上一段本地陪伴建议，稍后可以再试一次。")
    } finally {
      setIsInsightLoading(false)
    }
  }, [intensity, mood, moodMeta.label, profile.insight])

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

      Tone.Transport.bpm.value = profile.bpm + intensity * 2
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
  }, [intensity, mood, profile, stopMusic])

  useEffect(() => {
    setRecommendations(fallbackRecommendations[mood])
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
        setRecommendations(fallbackRecommendations[mood])
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

  async function shareTrack() {
    const shareText = `${selectedRecommendation.title} - ${selectedRecommendation.artist}`
    try {
      if (navigator.share) {
        await navigator.share({ title: "MoodWave 治愈音乐", text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
    } catch {
      // 用户取消分享时不打断播放。
    }
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
      <div className="mx-auto max-w-7xl">
        <section className="relative isolate overflow-hidden rounded-[34px] bg-white/86 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.22)] ring-1 ring-white/75 sm:p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff3f6] px-3 py-2 text-sm font-semibold text-[#ff738b] shadow-sm">
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

          <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(330px,0.42fr)] xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.42fr)]">
            <div className="min-w-0 overflow-hidden">
              <div className="mb-4 hidden items-center justify-between gap-3 md:flex">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">情绪可视化</h2>
                  <p className="mt-2 text-sm text-slate-500">{profile.texture}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-sm">
                  <Volume2 className="h-4 w-4 text-[#8bded4]" />
                  {profile.bpm + intensity * 2} BPM
                </div>
              </div>

              <div className="relative z-0 aspect-[1.02/1] max-w-full overflow-hidden rounded-[30px] border border-white/80 bg-white sm:aspect-[16/11] lg:min-h-[420px]">
                <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full max-w-full" />
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

            <aside className="relative z-10 min-w-0 lg:pt-[74px]">
              <div className="mx-auto max-w-sm lg:max-w-none">
                <div className="flex items-center gap-4">
                  <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br text-3xl text-white shadow-[0_14px_30px_rgba(255,181,194,0.22)] sm:h-20 sm:w-20 sm:rounded-[24px]", profile.album)}>
                    ♪
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-slate-900">{selectedRecommendation.title || profile.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{selectedRecommendation.artist}</p>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="h-2 rounded-full bg-[#f0edf0]">
                    <motion.div
                      animate={{ width: `${progress}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-[#ff8fa3] to-[#8de1d5]"
                    />
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

                <div className="mt-7 grid grid-cols-3 gap-3 text-center">
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
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="rounded-[32px] bg-white/84 p-5 shadow-[0_18px_46px_rgba(255,208,219,0.2)] ring-1 ring-white/70">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#fff1f5] text-[#ff7f96]">
                  {isInsightLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircleHeart className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">AI 陪伴建议</h3>
                  <p className="text-xs text-slate-500">
                    {isInsightLoading ? "灵灵正在生成陪伴语..." : "给此刻的你一段轻轻回应"}
                  </p>
                </div>
              </div>
              <p className="mt-4 min-h-[84px] whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {aiInsight || "正在把你的情绪调成一段温柔的文字..."}
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
          </section>

          <section className="rounded-[32px] bg-white/84 p-5 shadow-[0_18px_46px_rgba(255,208,219,0.2)] ring-1 ring-white/70">
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
          </section>
        </div>
      </div>
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
