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
  journalCount: 0,
  musicCount: 0,
  streakDays: 0,
  monthCount: 0,
  dominantMood: "neutral",
  favoriteTags: [],
}

export const fallbackRecords: MoodRecord[] = []

export const energyMoments: Array<{ title: string; value: string; tone: string }> = []

export const checklist: Array<{ text: string; mood: MoodType; done: boolean }> = []

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
