import { Home, Music2, PenLine, Sparkles, UserRound } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MoodType } from "./types"

export type AppNavItem = {
  href: string
  label: string
  shortLabel: string
  icon: LucideIcon
}

export type MoodOption = {
  value: MoodType
  label: string
  emoji: string
  accent: string
  softAccent: string
  insight: string
}

export type MoodTagOption = {
  value: string
  label: string
}

export const appNavItems: AppNavItem[] = [
  { href: "/dashboard", label: "首页", shortLabel: "首页", icon: Home },
  { href: "/mood", label: "情绪录入", shortLabel: "记录", icon: PenLine },
  { href: "/companion", label: "灵音伙伴", shortLabel: "伙伴", icon: Sparkles },
  { href: "/music", label: "音乐", shortLabel: "音乐", icon: Music2 },
  { href: "/profile", label: "我的", shortLabel: "我的", icon: UserRound },
]

export const moodOptions: MoodOption[] = [
  {
    value: "happy",
    label: "开心",
    emoji: "😊",
    accent: "#f7c84f",
    softAccent: "rgba(247, 200, 79, 0.18)",
    insight: "把这份轻盈留住，等会儿也许适合来点更明亮的节奏。",
  },
  {
    value: "calm",
    label: "平静",
    emoji: "😌",
    accent: "#77c6e8",
    softAccent: "rgba(119, 198, 232, 0.18)",
    insight: "今天像一池安静的水，可以把思绪慢慢写下来。",
  },
  {
    value: "anxious",
    label: "焦虑",
    emoji: "😟",
    accent: "#8ea5ff",
    softAccent: "rgba(142, 165, 255, 0.18)",
    insight: "先别急着把所有事想完，我们可以一件一件拆开。",
  },
  {
    value: "angry",
    label: "愤怒",
    emoji: "😠",
    accent: "#ff8f78",
    softAccent: "rgba(255, 143, 120, 0.18)",
    insight: "情绪被看见很重要，写下来比把它闷住更有力量。",
  },
  {
    value: "sad",
    label: "悲伤",
    emoji: "😢",
    accent: "#8bcf97",
    softAccent: "rgba(139, 207, 151, 0.18)",
    insight: "如果今天有点沉，我们就先允许自己慢一点。",
  },
  {
    value: "neutral",
    label: "平淡",
    emoji: "🙂",
    accent: "#c9b6f2",
    softAccent: "rgba(201, 182, 242, 0.18)",
    insight: "普通的一天也值得被记录，它会成为你情绪地图的一部分。",
  },
]

export const moodTagOptions: MoodTagOption[] = [
  { value: "study", label: "学习" },
  { value: "work", label: "工作" },
  { value: "social", label: "社交" },
  { value: "relationship", label: "情感" },
  { value: "family", label: "家庭" },
  { value: "health", label: "健康" },
  { value: "fun", label: "娱乐" },
  { value: "other", label: "其他" },
]

export const dashboardFeatureCards = [
  {
    href: "/analytics",
    icon: "📊",
    title: "我的趋势",
    description: "看看最近情绪如何起伏变化",
  },
  {
    href: "/music",
    icon: "🎵",
    title: "治愈音乐",
    description: "把此刻的心情交给专属旋律",
  },
  {
    href: "/companion",
    icon: "✦",
    title: "灵音伙伴",
    description: "和可爱又懂你的 AI 伙伴聊聊",
  },
]

export function getMoodOption(mood?: MoodType) {
  return moodOptions.find((item) => item.value === mood) ?? moodOptions[1]
}

export function getGreetingForHour(date = new Date()) {
  const hour = date.getHours()

  if (hour < 6) {
    return { greeting: "夜深了，还没睡吗？", signoff: "先把心情放下来，我们慢慢记录。" }
  }
  if (hour < 12) {
    return { greeting: "早安，今天想从哪里开始？", signoff: "给自己一个柔软的开场。" }
  }
  if (hour < 18) {
    return { greeting: "下午好，今天过得怎么样？", signoff: "忙碌里也别忘了看看自己的感受。" }
  }
  return { greeting: "晚安，今天还好吗？", signoff: "把今天写下来，等会儿会轻一点。" }
}

export function buildDailyMessage(mood?: MoodType) {
  const option = getMoodOption(mood)
  return `今日寄语：${option.insight}`
}
