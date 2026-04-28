import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MoodType } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
