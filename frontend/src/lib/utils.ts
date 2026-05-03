import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MoodType } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 将任意浏览器录音格式（webm/ogg/mp4）转为 WAV，Qwen ASR 只稳定支持 WAV */
export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const audioCtx = new AudioContext()
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    return audioBufferToWavBlob(audioBuffer)
  } finally {
    audioCtx.close()
  }
}

function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitsPerSample = 16
  const data = audioBuffer.getChannelData(0)
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = data.length * (bitsPerSample / 8)
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, "WAVE")
  writeString(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, "data")
  view.setUint32(40, dataSize, true)

  // PCM samples
  let offset = 44
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return new Blob([buffer], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

// 情绪颜色映射
export function getMoodColor(mood: MoodType): string {
  const colors: Record<MoodType, string> = {
    happy: '#FFD93D',      // 明亮黄色
    sad: '#6C9BCF',        // 柔和蓝色
    angry: '#FF6B6B',      // 温和红色
    anxious: '#A78BFA',    // 淡紫色
    calm: '#6EE7B7',       // 薄荷绿
    neutral: '#9CA3AF',    // 中性灰
  }
  return colors[mood]
}

// 情绪表情映射
export function getMoodEmoji(mood: MoodType): string {
  const emojis: Record<MoodType, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    anxious: '😰',
    calm: '😌',
    neutral: '😐',
  }
  return emojis[mood]
}

// 情绪标签映射
export function getMoodLabel(mood: MoodType): string {
  const labels: Record<MoodType, string> = {
    happy: '开心',
    sad: '难过',
    angry: '生气',
    anxious: '焦虑',
    calm: '平静',
    neutral: '一般',
  }
  return labels[mood]
}

// 兼容旧版标签选择组件
export function getTagLabel(tag: string): string {
  const labels: Record<string, string> = {
    work: '工作',
    love: '情感',
    health: '健康',
    study: '学习',
    family: '家庭',
    social: '社交',
  }

  return labels[tag] ?? tag
}
