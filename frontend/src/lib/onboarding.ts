import type { MoodType } from "@/lib/types"

export const ONBOARDING_KEY = "moodwave_onboarding_completed"
export const LEGACY_ONBOARDING_KEY = "moodwave_onboarding_done"
export const DASHBOARD_TOOLTIP_KEY = "moodwave_dashboard_tooltip_done"

export type DemoAIResult = {
  mood: MoodType
  intensity: number
  keywords: string[]
  insight: string
  suggestion: string
}

export const onboardingSteps = [
  { title: "欢迎", label: "欢迎来到灵音" },
  { title: "流程", label: "3 步，把心情变成声音" },
  { title: "音乐", label: "你的情绪，可以听见" },
  { title: "速记", label: "来，试一次" },
  { title: "完成", label: "完成了" },
]

export const demoResultCopy: Record<MoodType, Omit<DemoAIResult, "mood" | "intensity">> = {
  happy: {
    keywords: ["轻盈", "能量", "小确幸"],
    insight: "今天的你像一束很亮的光，适合把开心多停留一会儿。",
    suggestion: "可以去音乐房间听一段明亮节奏，把这份好心情保存下来。",
  },
  calm: {
    keywords: ["安静", "整理", "呼吸"],
    insight: "今天的你像一池安静的水，给自己一点空间慢慢沉淀。",
    suggestion: "适合听一段缓慢的氛围音，让身体也跟着松下来。",
  },
  anxious: {
    keywords: ["紧绷", "担心", "拆解"],
    insight: "焦虑像很多同时亮起的小灯，我们先一盏一盏把它们调暗。",
    suggestion: "把最担心的一件事写成下一步行动，先完成 5 分钟就好。",
  },
  angry: {
    keywords: ["边界", "热量", "释放"],
    insight: "愤怒说明你的边界正在发声，它值得被认真听见。",
    suggestion: "先做三次深呼吸，再把想说的话写下来，不急着发出去。",
  },
  sad: {
    keywords: ["低落", "允许", "陪伴"],
    insight: "难过不需要马上被修好，它也可以被温柔地安放一会儿。",
    suggestion: "去音乐房间听一段低频慢速的声音，让自己先被陪着。",
  },
  neutral: {
    keywords: ["平淡", "日常", "观察"],
    insight: "普通的一天也有自己的纹理，它会成为你情绪地图的一部分。",
    suggestion: "可以轻轻记录一件今天发生的小事，不用写得很完整。",
  },
}

export function hasCompletedOnboarding() {
  if (typeof window === "undefined") return true
  return localStorage.getItem(ONBOARDING_KEY) === "true" || localStorage.getItem(LEGACY_ONBOARDING_KEY) === "true"
}

export function markOnboardingCompleted() {
  if (typeof window === "undefined") return
  localStorage.setItem(ONBOARDING_KEY, "true")
  localStorage.setItem(LEGACY_ONBOARDING_KEY, "true")
}

export function hasSeenDashboardTooltip() {
  if (typeof window === "undefined") return true
  return localStorage.getItem(DASHBOARD_TOOLTIP_KEY) === "true"
}

export function markDashboardTooltipSeen() {
  if (typeof window === "undefined") return
  localStorage.setItem(DASHBOARD_TOOLTIP_KEY, "true")
}
