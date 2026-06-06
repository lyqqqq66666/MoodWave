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
import { aiAPI, moodAPI, musicAPI, resolveAssetUrl } from "@/lib/api"
import { getMoodOption } from "@/lib/moodwave"
import {
  fallbackRecommendations,
  formatDuration,
  hexToRgb,
  moodProfiles,
  normalizeFavoriteIds,
  normalizeRecommendations,
  parseIntensity,
  parseMood,
  renderProceduralTrackToWav,
} from "@/lib/music-room"
import type { MusicRecommendation } from "@/lib/types"
import { IOSGlassCard } from "@/components/ios/ios-glass-card"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { CompanionAvatar } from "@/components/companion-avatar"
import { EmptyStateGuide } from "@/components/onboarding/empty-state-guide"
import { useIsAppPlatform } from "@/hooks/use-platform"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"

type ToneModule = typeof import("tone/build/esm/index")
type InsightStatus = "idle" | "generating" | "retrying" | "error"

type VisualParticle = {
  orbit: number
  angle: number
  speed: number
  size: number
  alpha: number
  drift: number
  wobble: number
  hueMix: number
}

type PreparedTrack = {
  url: string
  duration: number
}

const BPM_MIN = 40
const BPM_MAX = 180

function resolveTrackPlaybackUrl(url: string) {
  if (!url) return ""
  if (/^https?:\/\//.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url
  }

  // `/audio/...` 这类前端 public 静态资源应当跟随当前页面 origin，
  // 不能走后端 API_URL，否则本地开发时会误打到 :8000 导致 404。
  if (url.startsWith("/audio/")) {
    if (typeof window !== "undefined") {
      return new URL(url, window.location.origin).toString()
    }
    return url
  }

  return resolveAssetUrl(url)
}

function buildLocalMusicInsight(
  fallbackInsight: string,
  track: MusicRecommendation,
) {
  const scene = track.scene || "这段旋律里"
  const texture = track.texture || "这份节奏"
  const description = track.description || ""
  const trackTitle = track.title ? `《${track.title}》` : "这段旋律"

  return `${trackTitle}像把你带进${scene}，${texture}正在慢慢贴近你。${description ? `${description} ` : ""}${fallbackInsight}`
}

function BpmControl({
  className = "",
  currentBpm,
  isOpen,
  onToggle,
  onChange,
}: {
  className?: string
  currentBpm: number
  isOpen: boolean
  onToggle: () => void
  onChange: (value: number) => void
}) {
  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-10 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-white/80 transition hover:-translate-y-0.5 hover:text-[#ff7894]"
        aria-expanded={isOpen}
        aria-label="调节节奏速度"
      >
        <Volume2 className="h-4 w-4 text-[#8bded4]" />
        <span>{currentBpm} BPM</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-40 w-[min(280px,calc(100vw-2rem))] rounded-[26px] border border-white/80 bg-white/96 p-4 shadow-[0_18px_48px_rgba(255,181,194,0.24)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">节奏偏好</p>
            <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-[#ff7894]">{currentBpm}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">会同步影响当前音轨的播放速度，让房间更贴近你现在的呼吸和心跳。</p>
          <input
            type="range"
            min={BPM_MIN}
            max={BPM_MAX}
            step={1}
            value={currentBpm}
            onChange={(event) => onChange(Number(event.target.value))}
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
              onClick={() => onChange(currentBpm - 1)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#fff4f7] text-sm font-semibold text-slate-600 transition hover:text-[#ff7894]"
            >
              <Minus className="h-4 w-4" />
              1
            </button>
            <button
              type="button"
              onClick={() => onChange(currentBpm + 1)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#effdfa] text-sm font-semibold text-slate-600 transition hover:text-[#42b9aa]"
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

function MusicPageContent() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const mood = parseMood(searchParams.get("mood"))
  const intensity = parseIntensity(searchParams.get("intensity"))
  const moodMeta = getMoodOption(mood)
  const profile = moodProfiles[mood]
  const { iosApp } = useIsAppPlatform()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const particlesRef = useRef<VisualParticle[]>([])
  const animationRef = useRef<number | null>(null)
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const timeDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserNodeRef = useRef<AnalyserNode | null>(null)
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const toneRef = useRef<ToneModule | null>(null)
  const preparedTracksRef = useRef<Map<string, PreparedTrack>>(new Map())
  const pendingTracksRef = useRef<Map<string, Promise<PreparedTrack>>>(new Map())
  const objectUrlsRef = useRef<string[]>([])
  const insightRef = useRef(profile.insight)
  const toastTimerRef = useRef<number | null>(null)
  const isSwitchingTrackRef = useRef(false)
  const advanceTrackRef = useRef<(() => void) | null>(null)

  const [recommendations, setRecommendations] = useState<MusicRecommendation[]>(fallbackRecommendations[mood])
  const [selectedTrack, setSelectedTrack] = useState(0)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [liked, setLiked] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isTrackPreparing, setIsTrackPreparing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [seekPreview, setSeekPreview] = useState<number | null>(null)
  const [aiInsight, setAiInsight] = useState(profile.insight)
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [insightStatus, setInsightStatus] = useState<InsightStatus>("idle")
  const [insightError, setInsightError] = useState("")
  const [musicToast, setMusicToast] = useState("")
  const [currentBpm, setCurrentBpm] = useState(profile.bpm)
  const [isBpmPanelOpen, setIsBpmPanelOpen] = useState(false)
  const [hasMoodRecord, setHasMoodRecord] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [audioError, setAudioError] = useState("")

  const selectedRecommendation = recommendations[selectedTrack] ?? fallbackRecommendations[mood][0]
  const effectiveDuration = mediaDuration || selectedRecommendation.duration || 0
  const progress = effectiveDuration > 0 ? Math.min(100, (elapsedTime / effectiveDuration) * 100) : 0
  const baseTrackBpm = selectedRecommendation.bpm || profile.bpm
  const playbackRate = Math.min(1.45, Math.max(0.72, currentBpm / Math.max(1, baseTrackBpm)))
  const currentGradient = useMemo(
    () => (selectedRecommendation.cover_gradient?.length ? selectedRecommendation.cover_gradient : [profile.color, profile.colorTo]),
    [profile.color, profile.colorTo, selectedRecommendation.cover_gradient],
  )
  const localMusicInsight = useMemo(
    () => buildLocalMusicInsight(profile.insight, selectedRecommendation),
    [profile.insight, selectedRecommendation],
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
      setInsightStatus("idle")
      setInsightError("")
      if (isFallback && !nextInsight.trim()) {
        setAiInsight(localMusicInsight)
        insightRef.current = localMusicInsight
      }
    } catch (error) {
      const errName = (error as Error).name
      if (errName === "AbortError" || errName === "CanceledError") return
      setAiInsight(localMusicInsight)
      insightRef.current = localMusicInsight
      setInsightStatus("error")
      setInsightError("灵音先根据这段旋律陪你坐一会儿，晚一点再重新生成也可以。")
    } finally {
      setIsInsightLoading(false)
    }
  }, [intensity, localMusicInsight, mood, moodMeta.label, profile.insight, profile.title, selectedRecommendation, user?.mbti, user?.zodiac])

  const showToast = useCallback((message: string) => {
    setMusicToast(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => setMusicToast(""), 2500)
  }, [])

  const getPlaybackRate = useCallback((track: MusicRecommendation, bpm: number) => {
    const base = track.bpm || moodProfiles[track.mood_type].bpm
    return Math.min(1.45, Math.max(0.72, bpm / Math.max(1, base)))
  }, [])

  const ensureAudioGraph = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return null

    if (!audioContextRef.current) {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.86
      const source = audioContext.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserNodeRef.current = analyser
      mediaSourceRef.current = source
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>
      timeDataRef.current = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume()
    }

    return {
      context: audioContextRef.current,
      analyser: analyserNodeRef.current,
    }
  }, [])

  const waitForMetadata = useCallback((audio: HTMLAudioElement) => new Promise<void>((resolve, reject) => {
    if (audio.readyState >= 1 && Number.isFinite(audio.duration)) {
      resolve()
      return
    }
    const handleLoaded = () => {
      cleanup()
      resolve()
    }
    const handleError = () => {
      cleanup()
      reject(new Error("音轨元数据加载失败"))
    }
    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", handleLoaded)
      audio.removeEventListener("error", handleError)
    }
    audio.addEventListener("loadedmetadata", handleLoaded)
    audio.addEventListener("error", handleError)
  }), [])

  const prepareTrack = useCallback(async (track: MusicRecommendation) => {
    const key = `${track.id}-${track.duration}-${track.seed}-${track.audio_mode ?? "procedural"}`
    const cached = preparedTracksRef.current.get(key)
    if (cached) return cached

    const pending = pendingTracksRef.current.get(key)
    if (pending) return pending

    const promise = (async () => {
      if (track.audio_mode === "external" && track.url) {
        const prepared = {
          url: resolveTrackPlaybackUrl(track.url),
          duration: track.duration,
        }
        preparedTracksRef.current.set(key, prepared)
        return prepared
      }

      setIsTrackPreparing(true)
      const Tone = toneRef.current ?? (await import("tone/build/esm/index"))
      toneRef.current = Tone
      const rendered = await renderProceduralTrackToWav(Tone, track, mood, intensity)
      const objectUrl = URL.createObjectURL(rendered.blob)
      objectUrlsRef.current.push(objectUrl)
      const prepared = {
        url: objectUrl,
        duration: rendered.duration || track.duration,
      }
      preparedTracksRef.current.set(key, prepared)
      return prepared
    })()

    pendingTracksRef.current.set(key, promise)
    try {
      return await promise
    } finally {
      pendingTracksRef.current.delete(key)
      setIsTrackPreparing(false)
    }
  }, [intensity, mood])

  const loadTrack = useCallback(async (
    track: MusicRecommendation,
    options?: { autoplay?: boolean; restart?: boolean; preserveCurrentTime?: boolean; bpmOverride?: number; interruptCurrent?: boolean },
  ) => {
    const audio = audioRef.current
    if (!audio) return

    setAudioError("")
    setIsLoading(true)

    try {
      if (options?.interruptCurrent) {
        audio.pause()
        audio.currentTime = 0
        setElapsedTime(0)
      }

      const prepared = await prepareTrack(track)
      const shouldReplaceSource = audio.src !== prepared.url
      const previousTime = audio.currentTime

      if (shouldReplaceSource) {
        audio.pause()
        audio.src = prepared.url
        audio.crossOrigin = track.audio_mode === "external" ? "anonymous" : ""
        audio.load()
        await waitForMetadata(audio)
      }

      const nextPlaybackRate = getPlaybackRate(track, options?.bpmOverride ?? currentBpm)
      audio.playbackRate = nextPlaybackRate
      setMediaDuration(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : prepared.duration)

      if (options?.restart) {
        audio.currentTime = 0
      } else if (options?.preserveCurrentTime && !shouldReplaceSource && previousTime > 0) {
        audio.currentTime = previousTime
      }

      if (options?.autoplay) {
        await ensureAudioGraph()
        await audio.play()
      }
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "音轨准备失败，请稍后重试。")
      showToast("音轨还没有顺利生成，先稍等一下下。")
    } finally {
      setIsLoading(false)
    }
  }, [currentBpm, ensureAudioGraph, getPlaybackRate, prepareTrack, showToast, waitForMetadata])

  const loadSelectedTrack = useCallback(async (options?: { autoplay?: boolean; restart?: boolean }) => {
    await loadTrack(selectedRecommendation, options)
  }, [loadTrack, selectedRecommendation])

  useEffect(() => {
    setRecommendations(fallbackRecommendations[mood])
    setSelectedTrack(0)
    setLiked(false)
    setElapsedTime(0)
    setMediaDuration(0)
    setCurrentBpm(profile.bpm)

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
  }, [mood, profile.bpm])

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
    setMediaDuration(selectedRecommendation.duration)
    setElapsedTime(0)
    setCurrentBpm(selectedRecommendation.bpm || moodProfiles[selectedRecommendation.mood_type].bpm)
  }, [favoriteIds, selectedRecommendation])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    const controller = new AbortController()
    void loadAIInsight(controller.signal)
    return () => controller.abort()
  }, [loadAIInsight])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setMediaDuration(Math.round(audio.duration))
      }
    }

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setElapsedTime(audio.currentTime)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setElapsedTime(0)
      advanceTrackRef.current?.()
    }
    const handleError = () => {
      setAudioError("当前音轨播放失败，可能是素材还没准备好。")
      setIsPlaying(false)
    }

    audio.addEventListener("loadedmetadata", handleLoaded)
    audio.addEventListener("durationchange", handleLoaded)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded)
      audio.removeEventListener("durationchange", handleLoaded)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
    }
  }, [isSeeking, recommendations.length])

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

      const particleCount = Math.min(120, Math.max(72, Math.round(rect.width / 10)))
      particlesRef.current = Array.from({ length: particleCount }, (_, index) => ({
        orbit: 55 + (index % 18) * 11 + Math.random() * 36,
        angle: Math.random() * Math.PI * 2,
        speed: 0.0012 + Math.random() * 0.0038,
        size: 1.1 + Math.random() * 3.4,
        alpha: 0.16 + Math.random() * 0.44,
        drift: 0.4 + Math.random() * 1.6,
        wobble: 10 + Math.random() * 36,
        hueMix: Math.random(),
      }))
    }

    const draw = (timestamp: number) => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const centerX = width * 0.5
      const centerY = height * 0.48
      const t = timestamp * 0.001

      let bass = 0.12
      let mids = 0.12
      let treble = 0.1
      let overall = 0.14

      const analyser = analyserNodeRef.current
      const freqData = freqDataRef.current
      const timeData = timeDataRef.current

      if (analyser && freqData && timeData) {
        analyser.getByteFrequencyData(freqData)
        analyser.getByteTimeDomainData(timeData)

        const bassEnd = Math.max(8, Math.floor(freqData.length * 0.12))
        const midEnd = Math.max(bassEnd + 1, Math.floor(freqData.length * 0.45))
        const highEnd = Math.max(midEnd + 1, Math.floor(freqData.length * 0.86))

        const averageRange = (start: number, end: number) => {
          let sum = 0
          let count = 0
          for (let index = start; index < end; index += 1) {
            sum += freqData[index]
            count += 1
          }
          return count > 0 ? sum / count / 255 : 0
        }

        bass = averageRange(0, bassEnd)
        mids = averageRange(bassEnd, midEnd)
        treble = averageRange(midEnd, highEnd)
        overall = averageRange(0, freqData.length)
      } else {
        bass = 0.16 + Math.sin(t * 1.4) * 0.05
        mids = 0.14 + Math.sin(t * 1.8 + 0.8) * 0.04
        treble = 0.11 + Math.sin(t * 2.2 + 1.4) * 0.03
        overall = 0.15 + Math.sin(t * 1.6) * 0.03
      }

      context.clearRect(0, 0, width, height)

      const background = context.createLinearGradient(0, 0, width, height)
      background.addColorStop(0, "rgba(255,250,252,0.98)")
      background.addColorStop(0.46, `rgba(${hexToRgb(currentGradient[0])}, 0.22)`)
      background.addColorStop(1, `rgba(${hexToRgb(currentGradient[Math.min(1, currentGradient.length - 1)])}, 0.14)`)
      context.fillStyle = background
      context.fillRect(0, 0, width, height)

      const drawAuroraBlob = (x: number, y: number, radiusX: number, radiusY: number, color: string, alpha: number, rotation: number) => {
        context.save()
        context.translate(x, y)
        context.rotate(rotation)
        context.scale(radiusX, radiusY)
        const gradient = context.createRadialGradient(0, 0, 0.05, 0, 0, 1)
        gradient.addColorStop(0, `rgba(${hexToRgb(color)}, ${alpha})`)
        gradient.addColorStop(1, "rgba(255,255,255,0)")
        context.fillStyle = gradient
        context.beginPath()
        context.arc(0, 0, 1, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }

      drawAuroraBlob(centerX - width * 0.18 + Math.sin(t * 0.42) * 30, centerY - 80, 220 + bass * 110, 140 + mids * 80, currentGradient[0], 0.2, Math.sin(t * 0.24) * 0.8)
      drawAuroraBlob(centerX + width * 0.2 + Math.cos(t * 0.38) * 36, centerY + 40, 200 + treble * 90, 130 + overall * 95, currentGradient[currentGradient.length - 1], 0.18, Math.cos(t * 0.19) * -0.7)
      drawAuroraBlob(centerX, centerY + 120, 260 + overall * 100, 100 + bass * 70, profile.colorTo, 0.1, Math.sin(t * 0.16) * 0.4)

      context.save()
      context.globalCompositeOperation = "screen"
      context.lineCap = "round"

      if (freqData) {
        const ribbonBins = Math.min(48, freqData.length)
        const drawRibbon = (baseY: number, amplitude: number, color: string, direction: 1 | -1) => {
          context.beginPath()
          for (let index = 0; index < ribbonBins; index += 1) {
            const sample = freqData[index] / 255
            const x = (index / (ribbonBins - 1)) * width
            const wave = Math.sin(index * 0.42 + t * (1.2 + direction * 0.15)) * 12 * overall
            const y = baseY + direction * (sample * amplitude + wave)
            if (index === 0) {
              context.moveTo(x, y)
            } else {
              const prevX = ((index - 1) / (ribbonBins - 1)) * width
              const controlX = (prevX + x) / 2
              context.quadraticCurveTo(controlX, y, x, y)
            }
          }
          context.strokeStyle = `rgba(${hexToRgb(color)}, ${0.22 + overall * 0.35})`
          context.lineWidth = 2.2 + amplitude * 0.012
          context.stroke()
        }

        drawRibbon(height * 0.32, 96 + bass * 95, currentGradient[0], -1)
        drawRibbon(height * 0.66, 84 + treble * 90, currentGradient[currentGradient.length - 1], 1)

        const spokeCount = Math.min(56, freqData.length)
        for (let index = 0; index < spokeCount; index += 1) {
          const sample = freqData[index] / 255
          const angle = (index / spokeCount) * Math.PI * 2 + t * 0.08
          const inner = 74 + Math.sin(t * 1.8 + index * 0.12) * 6
          const outer = inner + 26 + sample * (mood === "angry" ? 90 : 72)
          context.beginPath()
          context.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner)
          context.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer)
          const blend = index % 2 === 0 ? currentGradient[0] : currentGradient[currentGradient.length - 1]
          context.strokeStyle = `rgba(${hexToRgb(blend)}, ${0.08 + sample * 0.34})`
          context.lineWidth = 1 + sample * 2.2
          context.stroke()
        }
      }

      particlesRef.current.forEach((particle, index) => {
        particle.angle += particle.speed * (0.8 + overall * 1.6)
        const pulse = 1 + Math.sin(t * particle.drift + index * 0.12) * 0.12
        const radius = particle.orbit * pulse
        const x = centerX + Math.cos(particle.angle) * radius + Math.sin(t * particle.speed * 16 + index) * particle.wobble * 0.12
        const y = centerY + Math.sin(particle.angle) * radius * 0.58 + Math.cos(t * particle.speed * 14 + index) * particle.wobble * 0.1
        const glowColor = particle.hueMix > 0.5 ? currentGradient[0] : currentGradient[currentGradient.length - 1]
        const size = particle.size * (0.8 + treble * 1.2)
        context.beginPath()
        context.arc(x, y, size, 0, Math.PI * 2)
        context.fillStyle = `rgba(${hexToRgb(glowColor)}, ${particle.alpha * (0.45 + overall * 0.9)})`
        context.fill()
      })

      context.restore()

      if (timeData) {
        context.save()
        context.beginPath()
        const loopRadius = 104 + bass * 36
        for (let index = 0; index < timeData.length; index += 1) {
          const normalized = (timeData[index] - 128) / 128
          const angle = (index / timeData.length) * Math.PI * 2
          const radius = loopRadius + normalized * (12 + mids * 30)
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius * 0.82
          if (index === 0) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        }
        context.closePath()
        context.strokeStyle = `rgba(${hexToRgb(profile.color)}, ${0.18 + overall * 0.42})`
        context.lineWidth = 2.4
        context.stroke()
        context.restore()
      }

      for (let index = 0; index < 4; index += 1) {
        const radius = 62 + index * 26 + bass * 38 + Math.sin(t * (1.2 + index * 0.24)) * 6
        context.beginPath()
        context.arc(centerX, centerY, radius, 0, Math.PI * 2)
        context.strokeStyle = `rgba(${hexToRgb(index % 2 === 0 ? profile.color : profile.colorTo)}, ${0.08 - index * 0.012 + overall * 0.12})`
        context.lineWidth = 1.4
        context.stroke()
      }

      const orbRadius = 54 + bass * 28 + Math.sin(t * 1.6) * (4 + overall * 10)
      const orbGradient = context.createRadialGradient(centerX, centerY, 6, centerX, centerY, orbRadius)
      orbGradient.addColorStop(0, "rgba(255,255,255,0.98)")
      orbGradient.addColorStop(0.35, `rgba(${hexToRgb(profile.color)}, ${0.78 + mids * 0.16})`)
      orbGradient.addColorStop(0.72, `rgba(${hexToRgb(profile.colorTo)}, ${0.36 + treble * 0.24})`)
      orbGradient.addColorStop(1, "rgba(255,255,255,0)")

      context.beginPath()
      context.arc(centerX, centerY, orbRadius, 0, Math.PI * 2)
      context.fillStyle = orbGradient
      context.fill()

      const coreGradient = context.createRadialGradient(centerX, centerY, 2, centerX, centerY, orbRadius * 0.62)
      coreGradient.addColorStop(0, "rgba(255,255,255,1)")
      coreGradient.addColorStop(0.5, `rgba(${hexToRgb(profile.color)}, 0.52)`)
      coreGradient.addColorStop(1, "rgba(255,255,255,0)")
      context.beginPath()
      context.arc(centerX, centerY, orbRadius * 0.64, 0, Math.PI * 2)
      context.fillStyle = coreGradient
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
  }, [currentGradient, isPlaying, mood, profile.color, profile.colorTo])

  useEffect(() => {
    const audio = audioRef.current
    const objectUrls = objectUrlsRef.current
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current)
      }
      if (audio) {
        audio.pause()
        audio.removeAttribute("src")
      }
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
    }
  }, [])

  async function togglePlay() {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      return
    }

    await loadSelectedTrack({ autoplay: true })
  }

  const switchTrack = useCallback(async (nextIndex: number, options?: { autoplay?: boolean }) => {
    const nextRecommendation = recommendations[nextIndex]
    if (!nextRecommendation || isSwitchingTrackRef.current) return

    isSwitchingTrackRef.current = true
    try {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
      setIsPlaying(false)
      setSelectedTrack(nextIndex)
      setElapsedTime(0)
      setMediaDuration(nextRecommendation.duration)
      setCurrentBpm(nextRecommendation.bpm || moodProfiles[nextRecommendation.mood_type].bpm)

      if (options?.autoplay || isPlaying) {
        await loadTrack(nextRecommendation, {
          autoplay: true,
          restart: true,
          interruptCurrent: true,
          bpmOverride: nextRecommendation.bpm || moodProfiles[nextRecommendation.mood_type].bpm,
        })
      }
    } finally {
      isSwitchingTrackRef.current = false
    }
  }, [isPlaying, loadTrack, recommendations])

  useEffect(() => {
    advanceTrackRef.current = () => {
      void switchTrack((selectedTrack + 1) % recommendations.length, { autoplay: true })
    }
  }, [recommendations.length, selectedTrack, switchTrack])

  async function nextTrack() {
    const nextIndex = (selectedTrack + 1) % recommendations.length
    await switchTrack(nextIndex, { autoplay: isPlaying })
  }

  async function prevTrack() {
    const prevIndex = (selectedTrack - 1 + recommendations.length) % recommendations.length
    await switchTrack(prevIndex, { autoplay: isPlaying })
  }

  function shuffleTracks() {
    const shuffled = [...recommendations]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }
    setRecommendations(shuffled)
    setSelectedTrack(0)
    setElapsedTime(0)
    setMediaDuration(shuffled[0]?.duration ?? 0)
    showToast("歌单已经轻轻洗牌，换一段新的陪伴吧。")
  }

  function seekToSeconds(seconds: number) {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(effectiveDuration) || effectiveDuration <= 0) return
    const safeSeconds = Math.max(0, Math.min(seconds, effectiveDuration))
    audio.currentTime = safeSeconds
    setElapsedTime(safeSeconds)
  }

  function seekToPercent(percent: number) {
    seekToSeconds(effectiveDuration * Math.min(1, Math.max(0, percent)))
  }

  function getSeekPercent(clientX: number) {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return progress / 100
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  function updateSeekFromPointer(event: PointerEvent<HTMLDivElement>) {
    const percent = getSeekPercent(event.clientX)
    const preview = Math.round(effectiveDuration * percent)
    setSeekPreview(preview)
    seekToSeconds(preview)
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
    showToast("分享功能即将上线，先把这段旋律悄悄收藏起来吧。")
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
          <audio ref={audioRef} preload="metadata" className="hidden" />

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

          <div className={cn("relative grid min-w-0 flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.44fr)] xl:grid-cols-[minmax(0,0.96fr)_minmax(370px,0.44fr)]", iosApp && "grid-cols-1")}>
            <div className="absolute inset-0 min-w-0 overflow-hidden lg:relative lg:inset-auto">
              <div className="mb-4 hidden items-center justify-between gap-3 md:flex">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">情绪可视化音乐房间</h2>
                  <p className="mt-2 text-sm text-slate-500">{selectedRecommendation.texture || profile.texture}</p>
                </div>
                <BpmControl
                  currentBpm={currentBpm}
                  isOpen={isBpmPanelOpen}
                  onToggle={() => setIsBpmPanelOpen((value) => !value)}
                  onChange={(value) => setCurrentBpm(Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value))))}
                />
              </div>

              <div className="relative z-0 h-full min-h-full max-w-full overflow-hidden sm:aspect-[16/11] lg:h-full lg:min-h-[520px]">
                <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full max-w-full" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-[#201a25]/10 lg:hidden" />

                <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
                  <div className="hidden rounded-[24px] bg-white/68 px-4 py-3 text-sm text-slate-600 backdrop-blur-md sm:block">
                    <p className="font-semibold text-slate-800">{selectedRecommendation.scene || "情绪房间"}</p>
                    <p className="mt-1 text-xs">{selectedRecommendation.description || "让音乐和颜色一起照顾此刻的自己。"}</p>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isTrackPreparing ? "preparing" : isPlaying ? "playing" : "paused"}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="ml-auto rounded-full bg-white/72 px-3 py-2 text-xs font-semibold text-slate-600 backdrop-blur-md"
                    >
                      {isTrackPreparing ? "正在编织音轨" : isPlaying ? "正在播放" : "等待播放"}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap gap-2 sm:inset-x-5 sm:bottom-5">
                  {[
                    `${Math.round(playbackRate * 100)}% 速度`,
                    `${effectiveDuration ? formatDuration(effectiveDuration) : "--:--"} 实时时长`,
                    selectedRecommendation.visual_preset || profile.visualPreset,
                  ].map((item) => (
                    <span key={item} className="rounded-full bg-white/65 px-3 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-md">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <aside className={cn("relative z-10 flex min-h-[calc(100svh-15rem)] min-w-0 items-end pt-[32vh] lg:block lg:min-h-0 lg:pt-[74px]", iosApp && "min-h-0 items-stretch pt-0")}>
              <div className={cn("mx-auto w-full max-w-sm rounded-[30px] bg-white/50 p-4 shadow-[0_18px_48px_rgba(255,208,219,0.24)] backdrop-blur-2xl ring-1 ring-white/30 lg:max-w-none lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0 lg:ring-0", iosApp && "ios-sticky-action")}>
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] text-white shadow-[0_14px_30px_rgba(255,181,194,0.22)] sm:h-20 sm:w-20 sm:rounded-[24px]"
                    style={{
                      background: `linear-gradient(145deg, ${currentGradient.join(", ")})`,
                    }}
                  >
                    ♪
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-slate-900">{selectedRecommendation.title || profile.title}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{selectedRecommendation.artist}</p>
                    <p className="mt-2 truncate text-xs text-slate-400">{selectedRecommendation.scene || "情绪房间"}</p>
                  </div>
                </div>

                <BpmControl
                  className="mt-4 md:hidden"
                  currentBpm={currentBpm}
                  isOpen={isBpmPanelOpen}
                  onToggle={() => setIsBpmPanelOpen((value) => !value)}
                  onChange={(value) => setCurrentBpm(Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(value))))}
                />

                <div className="mt-5 rounded-[24px] bg-white/72 px-4 py-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-800">真实播放进度</span>
                    <span className="rounded-full bg-[#fff3f6] px-2.5 py-1 text-[11px] font-semibold text-[#ff7692]">
                      {isTrackPreparing ? "准备中" : audioError ? "播放异常" : "实时同步"}
                    </span>
                  </div>
                </div>

                <div className="mt-7">
                  <div
                    ref={progressRef}
                    role="slider"
                    tabIndex={0}
                    aria-label="播放进度"
                    aria-valuemin={0}
                    aria-valuemax={effectiveDuration}
                    aria-valuenow={Math.round(elapsedTime)}
                    onPointerDown={beginSeek}
                    onPointerMove={moveSeek}
                    onPointerUp={endSeek}
                    onPointerCancel={endSeek}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") seekToPercent((elapsedTime - 5) / Math.max(1, effectiveDuration))
                      if (event.key === "ArrowRight") seekToPercent((elapsedTime + 5) / Math.max(1, effectiveDuration))
                    }}
                    className="group relative -my-3 cursor-pointer touch-none py-3 outline-none"
                  >
                    {isSeeking ? (
                      <div
                        className="pointer-events-none absolute -top-8 rounded-full bg-slate-900/78 px-3 py-1 text-xs font-semibold text-white shadow-lg"
                        style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
                      >
                        {formatDuration(seekPreview ?? elapsedTime)} / {formatDuration(effectiveDuration)}
                      </div>
                    ) : null}
                    <div className={cn("rounded-full bg-[#f0edf0] transition-all", isSeeking ? "h-3" : "h-2")}>
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: isSeeking ? 0 : 0.18 }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${currentGradient.join(", ")})`,
                        }}
                      />
                    </div>
                    <motion.span
                      animate={{ left: `${progress}%`, scale: isSeeking ? 1.25 : 1 }}
                      transition={{ duration: isSeeking ? 0 : 0.18 }}
                      className="absolute top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-[0_8px_20px_rgba(255,143,163,0.34)] ring-2 ring-[#ff9fb4]"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#8de1d5]" />
                    </motion.span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>{formatDuration(elapsedTime)}</span>
                    <span>{formatDuration(effectiveDuration)}</span>
                  </div>
                  {audioError ? <p className="mt-2 text-xs text-[#ef7b73]">{audioError}</p> : null}
                </div>

                <div className="mt-7 flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => void prevTrack()}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(255,181,194,0.18)] transition hover:-translate-y-0.5"
                    aria-label="上一首"
                  >
                    <SkipBack className="h-5 w-5 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void togglePlay()}
                    disabled={isLoading}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#ff8fa3] to-[#8de1d5] text-white shadow-[0_16px_34px_rgba(255,143,163,0.3)] transition hover:-translate-y-0.5 disabled:cursor-wait"
                    aria-label={isPlaying ? "暂停" : "播放"}
                  >
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void nextTrack()}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(255,181,194,0.18)] transition hover:-translate-y-0.5"
                    aria-label="下一首"
                  >
                    <SkipForward className="h-5 w-5 fill-current" />
                  </button>
                </div>

                <div className="mt-7 grid grid-cols-4 gap-3 text-center">
                  <button type="button" onClick={shuffleTracks} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#ff8fa3]">
                    <Shuffle className="mx-auto h-5 w-5" />
                    <span className="mt-1 block">随机</span>
                  </button>
                  <button type="button" onClick={() => void loadSelectedTrack({ autoplay: isPlaying, restart: true })} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#5fcfc2]">
                    <RefreshCw className="mx-auto h-5 w-5" />
                    <span className="mt-1 block">重置</span>
                  </button>
                  <button type="button" onClick={shareTrack} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#ff8fa3]">
                    <Share2 className="mx-auto h-5 w-5" />
                    <span className="mt-1 block">分享</span>
                  </button>
                  <button type="button" onClick={() => setShowDetails((value) => !value)} className="rounded-[22px] bg-white/86 px-3 py-3 text-xs text-slate-500 shadow-sm transition hover:text-[#62bda9]">
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
              <div>
                <h3 className="font-semibold text-slate-900">灵音伙伴的听后感</h3>
                <p className="text-xs text-slate-500">
                  {insightStatus === "generating"
                    ? "伙伴正在听这段旋律..."
                    : insightStatus === "retrying"
                      ? "正在重新生成更贴近的回应..."
                      : insightStatus === "error"
                        ? "灵音先根据这段旋律陪着你"
                        : "角色会结合情绪与音乐给你回应"}
                </p>
              </div>
            </div>
            <p className="mt-4 min-h-[84px] whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {aiInsight || (insightStatus === "retrying" ? "正在重新整理这段旋律里的情绪线索..." : "正在把你的情绪调成一段温柔的文字...")}
            </p>
            {insightError ? <p className="mt-3 text-xs text-slate-500">{insightError}</p> : null}
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">推荐歌曲</h3>
                <p className="mt-1 text-xs text-slate-500">为你准备了几段不同气质的陪伴旋律，换一首也会有新的房间氛围。</p>
              </div>
              <span className="rounded-full bg-[#fff5f7] px-3 py-1 text-[11px] font-semibold text-[#ff7a95]">
                {recommendations.length} 首
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recommendations.map((track, index) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => void switchTrack(index, { autoplay: isPlaying })}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[24px] p-3 text-left transition",
                    selectedTrack === index ? "bg-[#fff3f6] shadow-sm" : "bg-white/60 hover:bg-white",
                  )}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-lg text-white shadow-sm"
                    style={{
                      background: `linear-gradient(145deg, ${(track.cover_gradient?.length ? track.cover_gradient : currentGradient).join(", ")})`,
                    }}
                  >
                    ♪
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{track.title}</p>
                    <p className="truncate text-xs text-slate-500">{track.artist}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-400">{track.scene || "MoodWave 情绪房间"} · {track.texture || "治愈生成音轨"}</p>
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
