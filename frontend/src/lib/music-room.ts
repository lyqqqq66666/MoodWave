import type { MusicRecommendation, MoodType } from "./types"
import { audioBufferToWavBlob } from "./utils"

export type MoodSoundProfile = {
  bpm: number
  scale: string[]
  pulse: number
  color: string
  colorTo: string
  album: string
  title: string
  texture: string
  insight: string
  visualPreset: NonNullable<MusicRecommendation["visual_preset"]>
}

type ToneModule = typeof import("tone/build/esm/index")

const DEFAULT_DURATION = 108

export const moodProfiles: Record<MoodType, MoodSoundProfile> = {
  happy: {
    bpm: 108,
    scale: ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"],
    pulse: 1.16,
    color: "#FFD166",
    colorTo: "#EF8D7B",
    album: "from-[#ffe59a] via-[#ffd2dc] to-[#9ee7d7]",
    title: "晴朗的午后",
    texture: "明亮钟琴 + 轻快木质脉冲",
    insight: "开心的能量适合被延长一点，试着把今天的小确幸留进歌里。",
    visualPreset: "starlight",
  },
  calm: {
    bpm: 72,
    scale: ["D4", "F#4", "A4", "B4", "C#5", "E5", "F#5"],
    pulse: 0.78,
    color: "#90E0EF",
    colorTo: "#CBC3E3",
    album: "from-[#bfefff] via-[#eadffd] to-[#f8dce6]",
    title: "宁静的午后",
    texture: "柔和和弦云层 + 慢速波纹",
    insight: "平静正在帮你恢复秩序，保持现在的呼吸频率就很好。",
    visualPreset: "ripple",
  },
  anxious: {
    bpm: 90,
    scale: ["A3", "C4", "D4", "E4", "G4", "A4", "C5"],
    pulse: 1.28,
    color: "#8ECAE6",
    colorTo: "#FFE66D",
    album: "from-[#cdefff] via-[#fff1a8] to-[#ffd5dc]",
    title: "轻轻降噪",
    texture: "低频铺底 + 细碎呼吸纹理",
    insight: "焦虑像很多同时亮起的小灯，我们先让它们一盏一盏暗下来。",
    visualPreset: "drift",
  },
  angry: {
    bpm: 84,
    scale: ["E3", "G3", "A3", "B3", "D4", "E4", "G4"],
    pulse: 1.22,
    color: "#EF8D7B",
    colorTo: "#F4A261",
    album: "from-[#ffb49f] via-[#ffd09e] to-[#bfead0]",
    title: "热量慢慢散开",
    texture: "暖色低音 + 释放型心跳鼓点",
    insight: "愤怒说明边界正在发声，先把热量安全地交给节奏。",
    visualPreset: "ember",
  },
  sad: {
    bpm: 58,
    scale: ["F3", "A3", "C4", "D4", "E4", "G4", "A4"],
    pulse: 0.62,
    color: "#C7E8CA",
    colorTo: "#A8DADC",
    album: "from-[#d9f2d6] via-[#c8eef3] to-[#efe2ff]",
    title: "给低落一条毯子",
    texture: "低频长音 + 缓慢升起的微光",
    insight: "难过不需要马上被修好，先让音乐陪你把它安放下来。",
    visualPreset: "bloom",
  },
  neutral: {
    bpm: 76,
    scale: ["G3", "A3", "B3", "D4", "E4", "G4", "A4"],
    pulse: 0.88,
    color: "#F5F5DC",
    colorTo: "#E0E0E0",
    album: "from-[#f8f4d8] via-[#e9eef0] to-[#dff3e9]",
    title: "普通日子的微光",
    texture: "均匀颗粒 + 轻柔律动",
    insight: "平淡也有自己的纹理，今天可以用一首轻音乐慢慢扫过。",
    visualPreset: "ripple",
  },
}

const moodChords: Record<MoodType, string[][]> = {
  happy: [["C4", "E4", "G4", "B4"], ["A3", "C4", "E4", "G4"], ["F3", "A3", "C4", "E4"], ["G3", "B3", "D4", "F4"]],
  calm: [["D3", "A3", "C#4", "F#4"], ["B2", "F#3", "A3", "D4"], ["G3", "B3", "D4", "F#4"], ["A3", "C#4", "E4", "G4"]],
  anxious: [["A3", "C4", "E4", "G4"], ["F3", "A3", "C4", "E4"], ["D3", "G3", "A3", "C4"], ["E3", "G3", "B3", "D4"]],
  angry: [["E3", "G3", "B3", "D4"], ["D3", "F3", "A3", "C4"], ["C3", "E3", "G3", "B3"], ["A2", "D3", "E3", "G3"]],
  sad: [["F3", "A3", "C4", "E4"], ["D3", "F3", "A3", "C4"], ["Bb2", "D3", "F3", "A3"], ["C3", "E3", "G3", "Bb3"]],
  neutral: [["G3", "B3", "D4", "A4"], ["E3", "G3", "B3", "D4"], ["C3", "E3", "G3", "B3"], ["D3", "F3", "A3", "C4"]],
}

export const fallbackRecommendations: Record<MoodType, MusicRecommendation[]> = {
  happy: [
    { id: "happy-1", title: "Chillax", artist: "Francisco Alvear · Mixkit", mood_type: "happy", url: "/audio/music-room/happy-chillax.mp3", duration: 144, bpm: 96, texture: "木吉他微光 + 轻松新世纪律动", scene: "午后草地", description: "轻盈但不过分兴奋，适合把好心情慢慢延长。", seed: 1011, audio_mode: "external", cover_gradient: ["#FFD166", "#FFB4A2", "#A8E6CF"], visual_preset: "starlight" },
    { id: "happy-2", title: "阳光小跳步", artist: "MoodWave AI", mood_type: "happy", url: "/audio/music-room/happy-yangguang-xiaotiaobu.wav", duration: 96, bpm: 112, texture: "木琴脉冲与暖色节拍", scene: "窗边晨光", description: "像脚步踩在晒过太阳的木地板上。", seed: 1027, audio_mode: "external", cover_gradient: ["#FFDA77", "#FF9E7A", "#B8F2E6"], visual_preset: "starlight" },
    { id: "happy-3", title: "午后汽水", artist: "MoodWave AI", mood_type: "happy", url: "/audio/music-room/happy-wuhou-qishui.wav", duration: 112, bpm: 106, texture: "闪烁高音与软鼓点", scene: "夏日街角", description: "带一点汽泡感的治愈明亮。", seed: 1039, audio_mode: "external", cover_gradient: ["#FFE29A", "#FFC6D0", "#9ADAD6"], visual_preset: "starlight" },
  ],
  calm: [
    { id: "calm-1", title: "Smooth Meditation", artist: "Arulo · Mixkit", mood_type: "calm", url: "/audio/music-room/calm-smooth-meditation.mp3", duration: 154, bpm: 72, texture: "柔和铺底与轻雾钟琴", scene: "阳台白纱", description: "像一口慢慢放松下来的呼吸，适合把节奏彻底放慢。", seed: 2013, audio_mode: "external", cover_gradient: ["#CBEFFF", "#E6DFFF", "#F7D9E8"], visual_preset: "ripple" },
    { id: "calm-2", title: "云朵慢步", artist: "MoodWave AI", mood_type: "calm", url: "/audio/music-room/calm-yunduo-manbu.wav", duration: 118, bpm: 70, texture: "低频暖垫与流动回声", scene: "云层散步", description: "适合把思绪放慢一点的空间。", seed: 2021, audio_mode: "external", cover_gradient: ["#D9F3FF", "#DCD8FF", "#FBE6F0"], visual_preset: "ripple" },
    { id: "calm-3", title: "浅海呼吸", artist: "MoodWave AI", mood_type: "calm", url: "/audio/music-room/calm-qianhai-huxi.wav", duration: 132, bpm: 68, texture: "水纹长音与细小星沙", scene: "清晨海边", description: "平静像潮水一样缓缓靠近。", seed: 2033, audio_mode: "external", cover_gradient: ["#BBE7F6", "#D3C6F2", "#F6D7E7"], visual_preset: "ripple" },
  ],
  anxious: [
    { id: "anxious-1", title: "Nature Meditation", artist: "Arulo · Mixkit", mood_type: "anxious", url: "/audio/music-room/anxious-nature-meditation.mp3", duration: 100, bpm: 84, texture: "柔软环境铺底 + 呼吸感旋律", scene: "林间呼吸", description: "适合在焦虑上头时先把呼吸和注意力拉回来。", seed: 3017, audio_mode: "external", cover_gradient: ["#CDEFFF", "#FFF0A9", "#FFD0D8"], visual_preset: "drift" },
    { id: "anxious-2", title: "把线团松开", artist: "MoodWave AI", mood_type: "anxious", url: "/audio/music-room/anxious-baxiantuan-songkai.wav", duration: 114, bpm: 88, texture: "有节律的呼吸鼓点", scene: "黄昏走廊", description: "一层层把紧绷的线慢慢放松。", seed: 3029, audio_mode: "external", cover_gradient: ["#BFE6FF", "#FFEBA8", "#FFD9E6"], visual_preset: "drift" },
    { id: "anxious-3", title: "慢慢数到十", artist: "MoodWave AI", mood_type: "anxious", url: "/audio/music-room/anxious-manmanshudao-shi.wav", duration: 120, bpm: 86, texture: "稳定脉冲与暖色底雾", scene: "灯下书桌", description: "给身体一个可跟随的节拍。", seed: 3041, audio_mode: "external", cover_gradient: ["#C6E8FF", "#FFF2C7", "#F7D5E1"], visual_preset: "drift" },
  ],
  angry: [
    { id: "angry-1", title: "Serene Moments", artist: "Ahjay Stelino · Mixkit", mood_type: "angry", url: "/audio/music-room/angry-serene-moments.mp3", duration: 119, bpm: 80, texture: "温和脉冲 + 让情绪降温的氛围底色", scene: "降温通道", description: "不是硬压情绪，而是让身体先从紧绷里退出来。", seed: 4019, audio_mode: "external", cover_gradient: ["#FFB49F", "#FFD29A", "#BFEAD0"], visual_preset: "ember" },
    { id: "angry-2", title: "柔软边界", artist: "MoodWave AI", mood_type: "angry", url: "/audio/music-room/angry-rouruan-bianjie.wav", duration: 98, bpm: 82, texture: "低频脉冲与稀疏光点", scene: "风吹窗帘", description: "先稳住自己，再让边界清楚。", seed: 4027, audio_mode: "external", cover_gradient: ["#FFA998", "#F8C48D", "#D5E9C9"], visual_preset: "ember" },
    { id: "angry-3", title: "暖风出口", artist: "MoodWave AI", mood_type: "angry", url: "/audio/music-room/angry-nuanfeng-chukou.wav", duration: 110, bpm: 80, texture: "缓释鼓点与升温和弦", scene: "空旷天台", description: "让力量慢慢变成可以呼吸的温度。", seed: 4043, audio_mode: "external", cover_gradient: ["#FFBAA7", "#F7C89B", "#CBE8D2"], visual_preset: "ember" },
  ],
  sad: [
    { id: "sad-1", title: "Finding Myself", artist: "Michael Ramir C. · Mixkit", mood_type: "sad", url: "/audio/music-room/sad-finding-myself.mp3", duration: 134, bpm: 62, texture: "空气感合成器 + 缓慢抬升的旋律", scene: "雨后窗边", description: "不催你变好，先给情绪一个柔软的缓冲层。", seed: 5011, audio_mode: "external", cover_gradient: ["#D9F2D6", "#C8EEF3", "#EFE2FF"], visual_preset: "bloom" },
    { id: "sad-2", title: "雨后的小灯", artist: "MoodWave AI", mood_type: "sad", url: "/audio/music-room/sad-yuhou-dexiaodeng.wav", duration: 124, bpm: 60, texture: "缓慢和弦与细微亮点", scene: "夜路尽头", description: "像黑暗里那盏不刺眼的小灯。", seed: 5023, audio_mode: "external", cover_gradient: ["#D8F0D5", "#C2E7EF", "#EADCF9"], visual_preset: "bloom" },
    { id: "sad-3", title: "慢慢浮上来", artist: "MoodWave AI", mood_type: "sad", url: "/audio/music-room/sad-manman-fushanglai.wav", duration: 138, bpm: 62, texture: "空气感长垫与暖色回声", scene: "清晨雾气", description: "情绪会慢慢找到重新上浮的力气。", seed: 5039, audio_mode: "external", cover_gradient: ["#D7F0D6", "#CAE9EE", "#EEE4FF"], visual_preset: "bloom" },
  ],
  neutral: [
    { id: "neutral-1", title: "Harp Relax", artist: "Francisco Alvear · Mixkit", mood_type: "neutral", url: "/audio/music-room/neutral-harp-relax.mp3", duration: 121, bpm: 74, texture: "竖琴颗粒 + 清透留白", scene: "白纸和清茶", description: "很安静，但会让平淡日常多一点轻微发亮。", seed: 6013, audio_mode: "external", cover_gradient: ["#F8F4D8", "#E9EEF0", "#DFF3E9"], visual_preset: "ripple" },
    { id: "neutral-2", title: "白纸和清茶", artist: "MoodWave AI", mood_type: "neutral", url: "/audio/music-room/neutral-baizhi-heqingcha.wav", duration: 102, bpm: 74, texture: "清透和弦与细小回声", scene: "桌边清茶", description: "很安静，但并不空白。", seed: 6029, audio_mode: "external", cover_gradient: ["#F5F0D6", "#E8EDF0", "#DDF0E7"], visual_preset: "ripple" },
    { id: "neutral-3", title: "安静路过", artist: "MoodWave AI", mood_type: "neutral", url: "/audio/music-room/neutral-anjing-luguo.wav", duration: 114, bpm: 78, texture: "柔软木质脉冲与空气感", scene: "傍晚回家路", description: "适合陪伴没有太多起伏的一天。", seed: 6041, audio_mode: "external", cover_gradient: ["#F7F4DE", "#E7ECEF", "#E1F4EA"], visual_preset: "ripple" },
  ],
}

export function parseMood(value: string | null): MoodType {
  return value && value in fallbackRecommendations ? (value as MoodType) : "calm"
}

export function parseIntensity(value: string | null) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return 6
  return Math.min(10, Math.max(1, parsed))
}

export function normalizeRecommendations(payload: unknown, mood: MoodType): MusicRecommendation[] {
  const maybeWrapped = payload as { data?: unknown }
  const source = Array.isArray(payload) ? payload : Array.isArray(maybeWrapped?.data) ? maybeWrapped.data : []

  if (!Array.isArray(source) || source.length === 0) {
    return fallbackRecommendations[mood]
  }

  const looksLikeLegacyPlaceholderFeed = source.every((item) => {
    const record = item as Partial<MusicRecommendation>
    const url = String(record.url ?? "")
    const hasRichMetadata = Boolean(record.audio_mode || record.texture || record.scene || record.cover_gradient?.length)
    return (url.includes("example.com") || !url) && !hasRichMetadata
  })

  if (looksLikeLegacyPlaceholderFeed) {
    return fallbackRecommendations[mood]
  }

  return source.slice(0, 6).map((item, index) => {
    const record = item as Partial<MusicRecommendation> & { mood?: MoodType }
    const fallback = fallbackRecommendations[mood][index % fallbackRecommendations[mood].length]
    const normalizedUrl = record.url ? String(record.url) : fallback.url ?? ""
    const normalizedAudioMode = normalizedUrl ? (record.audio_mode ?? fallback.audio_mode ?? "external") : (record.audio_mode ?? fallback.audio_mode ?? "procedural")
    return {
      id: String(record.id ?? fallback.id),
      title: record.title ?? fallback.title,
      artist: record.artist ?? fallback.artist,
      mood_type: record.mood_type ?? record.mood ?? mood,
      url: normalizedUrl,
      duration: Number(record.duration ?? fallback.duration ?? DEFAULT_DURATION),
      bpm: Number(record.bpm ?? fallback.bpm ?? moodProfiles[mood].bpm),
      texture: record.texture ?? fallback.texture,
      scene: record.scene ?? fallback.scene,
      description: record.description ?? fallback.description,
      seed: Number(record.seed ?? fallback.seed ?? 0),
      audio_mode: normalizedAudioMode,
      cover_gradient: Array.isArray(record.cover_gradient) && record.cover_gradient.length > 0 ? record.cover_gradient : fallback.cover_gradient,
      visual_preset: record.visual_preset ?? fallback.visual_preset ?? moodProfiles[mood].visualPreset,
    }
  })
}

export function normalizeFavoriteIds(payload: unknown) {
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

export function formatDuration(seconds: number) {
  const whole = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(whole / 60)
  const rest = String(whole % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}

export function hexToRgb(hex: string): string {
  const cleanHex = hex.replace("#", "")
  const num = parseInt(cleanHex, 16)
  const r = cleanHex.length === 3 ? ((num >> 8) & 15) * 17 : (num >> 16) & 255
  const g = cleanHex.length === 3 ? ((num >> 4) & 15) * 17 : (num >> 8) & 255
  const b = cleanHex.length === 3 ? (num & 15) * 17 : num & 255
  return `${r}, ${g}, ${b}`
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function createSeededRandom(seed: number) {
  let current = seed || 1
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0
    return current / 4294967296
  }
}

function pickRandom<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length) % items.length]
}

function pickByIndex<T>(items: T[], index: number) {
  return items[((index % items.length) + items.length) % items.length]
}

type ProceduralIdentity = {
  padOscillator: string
  leadOscillator: string
  delaySubdivision: string
  melodySubdivision: string
  pulseEnabled: boolean
  noiseChance: number
  sparkleChance: number
  octaveLiftChance: number
  melodicBias: "chord" | "scale" | "motif"
  motifSteps: number[]
  padAttack: number
  reverbRoomSize: number
  delayFeedback: number
}

function deriveProceduralIdentity(mood: MoodType, seed: number): ProceduralIdentity {
  const variant = seed % 5
  const padOscillatorsByMood: Record<MoodType, string[]> = {
    happy: ["triangle8", "triangle4", "amsine2", "fmsquare2", "fmtriangle2"],
    calm: ["sine6", "triangle6", "amsine2", "fatsine", "pulse"],
    anxious: ["sine6", "amtriangle2", "fmsine2", "triangle8", "pulse"],
    angry: ["sawtooth8", "amsquare2", "fmtriangle2", "fatsawtooth", "triangle8"],
    sad: ["sine", "triangle4", "amsine2", "fmsine2", "fatsine"],
    neutral: ["triangle6", "sine6", "amtriangle2", "pulse", "triangle8"],
  }
  const leadOscillatorsByMood: Record<MoodType, string[]> = {
    happy: ["triangle", "sine", "pulse", "fatsine", "fattriangle"],
    calm: ["sine", "triangle", "fatsine", "pulse", "fattriangle"],
    anxious: ["triangle", "sine", "pulse", "fmsine", "fattriangle"],
    angry: ["square", "triangle", "pulse", "sawtooth", "fattriangle"],
    sad: ["sine", "triangle", "fatsine", "pulse", "fmsine"],
    neutral: ["triangle", "sine", "pulse", "fatsine", "fattriangle"],
  }
  const motifLibrary = [
    [0, 1, -1, 2],
    [0, 2, -2, 1],
    [0, 1, 2, -1],
    [0, -1, 1, 3],
    [0, 2, 1, -2],
  ]

  return {
    padOscillator: pickByIndex(padOscillatorsByMood[mood], variant),
    leadOscillator: pickByIndex(leadOscillatorsByMood[mood], variant),
    delaySubdivision: pickByIndex(["8n", "8n.", "4n", "16n"], seed % 4),
    melodySubdivision: pickByIndex(["4n", "8n", "8n.", mood === "calm" || mood === "sad" ? "2n" : "4n"], (seed >> 2) % 4),
    pulseEnabled: mood === "happy" || mood === "angry" || ((seed >> 1) % 3 === 0 && mood === "neutral"),
    noiseChance: mood === "anxious" ? 0.72 : mood === "sad" || mood === "calm" ? 0.45 : 0.18,
    sparkleChance: mood === "happy" ? 0.4 : mood === "calm" ? 0.22 : 0.16,
    octaveLiftChance: mood === "sad" ? 0.06 : mood === "anxious" ? 0.1 : 0.22,
    melodicBias: pickByIndex(["chord", "scale", "motif"], (seed >> 3) % 3) as ProceduralIdentity["melodicBias"],
    motifSteps: pickByIndex(motifLibrary, (seed >> 4) % motifLibrary.length),
    padAttack: 0.55 + ((seed % 7) * 0.08),
    reverbRoomSize: 0.28 + ((seed % 5) * 0.09),
    delayFeedback: 0.16 + ((seed % 4) * 0.06),
  }
}

export async function renderProceduralTrackToWav(
  Tone: ToneModule,
  track: MusicRecommendation,
  mood: MoodType,
  intensity: number,
) {
  const profile = moodProfiles[track.mood_type ?? mood]
  const chords = moodChords[track.mood_type ?? mood]
  const seed = track.seed || hashString(`${track.id}-${track.title}-${mood}`)
  const random = createSeededRandom(seed)
  const identity = deriveProceduralIdentity(mood, seed)
  const duration = Math.max(72, Math.round(track.duration || DEFAULT_DURATION))
  const bpm = Math.max(54, Math.round(track.bpm || profile.bpm))
  const baseVolume = -17 + intensity * 0.15
  const barLength = 240 / bpm
  const totalBars = Math.max(8, Math.floor(duration / barLength))

  const rendered = await Tone.Offline(({ transport }) => {
    transport.bpm.value = bpm

    const limiter = new Tone.Limiter(-1).toDestination()
    const compressor = new Tone.Compressor(-20, 2.5).connect(limiter)
    const reverb = new Tone.Reverb({ decay: 2.6 + identity.reverbRoomSize * 1.4, wet: 0.32 }).connect(compressor)
    const delay = new Tone.FeedbackDelay(identity.delaySubdivision, Math.min(identity.delayFeedback, 0.28)).connect(reverb)
    const chorus = new Tone.Chorus(0.22, 1.1, 0.12).connect(reverb)
    chorus.start()

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: identity.padOscillator as never },
      envelope: { attack: identity.padAttack, decay: 0.6, sustain: 0.72, release: 4.4 },
      volume: baseVolume - 3,
    }).connect(chorus)

    const bloom = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: identity.leadOscillator as never },
      envelope: { attack: 0.12, decay: 0.3, sustain: 0.18, release: 2.8 },
      volume: baseVolume - 8,
    }).connect(delay)

    const bass = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.12, decay: 0.8, sustain: 0.5, release: 2.1 },
      filterEnvelope: { attack: 0.3, decay: 0.7, sustain: 0.25, release: 1.8, baseFrequency: 70, octaves: 1.6 },
      volume: baseVolume - 9,
    }).connect(reverb)

    const pulse = new Tone.MembraneSynth({
      pitchDecay: 0.025,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.2 },
      volume: baseVolume - 16,
    }).connect(compressor)

    const air = new Tone.NoiseSynth({
      noise: { type: mood === "anxious" ? "pink" : "brown" },
      envelope: { attack: 0.6, decay: 0.4, sustain: 0.12, release: 1.8 },
      volume: baseVolume - 28,
    }).connect(reverb)

    let bar = 0
    let melodyStep = 0

    transport.scheduleRepeat((time) => {
      const chord = chords[bar % chords.length]
      const progress = bar / totalBars
      const intro = progress < 0.16
      const outro = progress > 0.84
      const padVelocity = outro ? 0.18 : intro ? 0.22 : 0.3 + intensity * 0.015
      pad.triggerAttackRelease(chord, "1m", time, padVelocity)
      bass.triggerAttackRelease(chord[0], random() < 0.55 ? "2n." : "1m", time, 0.34)

      if (identity.pulseEnabled) {
        pulse.triggerAttackRelease(chord[0], "8n", time + 0.02, 0.18 + random() * 0.12)
      }

      if (random() < identity.noiseChance) {
        air.triggerAttackRelease("1n", time + 0.05, 0.06 + random() * 0.08)
      }

      bar += 1
    }, "1m")

    transport.scheduleRepeat((time) => {
      const activeChord = chords[Math.max(0, bar - 1) % chords.length]
      const progress = melodyStep / Math.max(1, totalBars * 2)
      const emphasis = progress > 0.7 ? 0.18 : 0.24
      let note = pickRandom(activeChord, random)
      if (identity.melodicBias === "scale") {
        note = pickRandom(profile.scale, random)
      } else if (identity.melodicBias === "motif") {
        const motifStep = identity.motifSteps[melodyStep % identity.motifSteps.length]
        const anchorIndex = Math.max(0, profile.scale.indexOf(activeChord[0]))
        note = pickByIndex(profile.scale, anchorIndex + motifStep)
      } else if (random() > 0.72) {
        note = pickRandom(profile.scale, random)
      }

      const octaveLift = random() < identity.octaveLiftChance ? 12 : 0
      const lifted = octaveLift ? Tone.Frequency(note).transpose(octaveLift).toNote() : note
      bloom.triggerAttackRelease(lifted, random() < 0.4 ? "8n." : "4n", time, emphasis + random() * 0.12)
      melodyStep += 1
    }, identity.melodySubdivision)

    transport.scheduleRepeat((time) => {
      if (random() < identity.sparkleChance) {
        const sparkle = pickRandom(profile.scale.slice(-4), random)
        bloom.triggerAttackRelease(Tone.Frequency(sparkle).transpose(12).toNote(), "16n", time, 0.1 + random() * 0.08)
      }
    }, "4n")

    transport.start(0)
  }, duration, 1, 24000)

  const audioBuffer = rendered.get()
  if (!audioBuffer) {
    throw new Error("Unable to render audio buffer")
  }

  return {
    blob: audioBufferToWavBlob(audioBuffer),
    duration: Math.round(audioBuffer.duration),
  }
}
