import { getMoodOption } from "@/lib/moodwave"
import type { MoodType } from "@/lib/types"

export type MoodRecord = {
  id: string
  mood: MoodType
  title: string
  note: string
  date: string
  tag: string
}

export type SummaryState = {
  journalCount: number
  musicCount: number
  streakDays: number
  monthCount: number
  dominantMood: MoodType
  favoriteTags: string[]
}

type ApiMood = {
  id?: string | number
  mood_type?: MoodType
  note?: string
  created_at?: string
  tags?: string[]
}

export const fallbackSummary: SummaryState = {
  journalCount: 12,
  musicCount: 8,
  streakDays: 7,
  monthCount: 12,
  dominantMood: "happy",
  favoriteTags: ["社交", "明亮", "自然音", "温柔", "治愈"],
}

export const fallbackRecords: MoodRecord[] = [
  {
    id: "story-1",
    mood: "happy",
    title: "和朋友散步",
    note: "今天和朋友聊了很久，心情变得好多了。",
    date: "4月29日",
    tag: "社交",
  },
  {
    id: "story-2",
    mood: "calm",
    title: "午后复盘",
    note: "把任务拆成小块以后，压力没有那么满。",
    date: "4月28日",
    tag: "学习",
  },
  {
    id: "story-3",
    mood: "anxious",
    title: "deadline 前夜",
    note: "有点紧张，但我已经开始一点点推进。",
    date: "4月27日",
    tag: "工作",
  },
]

export const energyMoments = [
  { title: "连续记录", value: "7天", tone: "from-[#FFD166] to-[#FFB5C2]" },
  { title: "最亮情绪", value: "开心", tone: "from-[#A8E6CF] to-[#90E0EF]" },
  { title: "本周音乐", value: "8首", tone: "from-[#CBC3E3] to-[#FFB5C2]" },
]

export const checklist = [
  { text: "睡前写 3 句话", mood: "calm" as MoodType, done: true },
  { text: "听一段专注音乐", mood: "happy" as MoodType, done: true },
  { text: "把明天任务拆小", mood: "anxious" as MoodType, done: false },
]

export function unwrapData(payload: unknown) {
  const maybeWrapped = payload as { data?: unknown }
  return maybeWrapped?.data ?? payload
}

export function parseSummary(payload: unknown): Partial<SummaryState> {
  const data = unwrapData(payload) as Record<string, unknown>
  const dominantMood = data.highest_mood || data.dominant_mood || data.top_mood
  const tags = data.favorite_tags || data.top_tags

  return {
    journalCount: Number(data.total_entries ?? data.month_count ?? data.journal_count) || undefined,
    musicCount: Number(data.music_count ?? data.music_sessions) || undefined,
    streakDays: Number(data.streak_days ?? data.continuous_days) || undefined,
    monthCount: Number(data.month_count ?? data.total_entries) || undefined,
    dominantMood: typeof dominantMood === "string" ? (dominantMood as MoodType) : undefined,
    favoriteTags: Array.isArray(tags) ? tags.map(String).slice(0, 5) : undefined,
  }
}

export function parseMoodRecord(item: ApiMood): MoodRecord {
  const mood = item.mood_type ?? "calm"
  const option = getMoodOption(mood)
  const date = item.created_at
    ? new Date(item.created_at).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    : "今天"

  return {
    id: String(item.id ?? item.created_at ?? option.value),
    mood,
    title: `${option.label}日记`,
    note: item.note || option.insight,
    date,
    tag: item.tags?.[0] || "日常",
  }
}
