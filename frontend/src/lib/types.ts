// 情绪类型和数据接口定义
export type MoodType = 'happy' | 'sad' | 'angry' | 'anxious' | 'calm' | 'neutral'

export type MoodTag = 'work' | 'love' | 'health' | 'study' | 'family' | 'social'

export interface MoodEntry {
  id: number
  user_id: number
  date: string
  mood_type: MoodType
  intensity: number
  tags: MoodTag[]
  note: string
  input_mode?: string
  body_sensations?: string
  imagery_words?: string
  breath_state?: string
  voice_features?: string
  music_goal?: string
  emotion_vector?: string
  created_at: string
  updated_at: string
}

export interface CreateMoodEntryRequest {
  date: string
  mood_type: MoodType
  intensity: number
  tags: MoodTag[]
  note: string
  input_mode?: string
  body_sensations?: string
  imagery_words?: string
  breath_state?: string
  voice_features?: string
  music_goal?: string
  emotion_vector?: string
}

export interface WeeklyAnalytics {
  average_mood_score: number
  mood_distribution: Record<MoodType, number>
  top_keywords: string[]
  top_tags: MoodTag[]
  daily_scores: Array<{
    date: string
    score: number
  }>
}

export interface MoodSummary {
  average_mood_score: number
  highest_mood: MoodType
  lowest_mood: MoodType
  suggestion: string
}

export interface MusicRecommendation {
  id: string
  title: string
  artist: string
  mood_type: MoodType
  url: string
  duration: number
  bpm?: number
  texture?: string
  scene?: string
  description?: string
  seed?: number
  audio_mode?: 'procedural' | 'external'
  cover_gradient?: string[]
  visual_preset?: 'bloom' | 'ripple' | 'drift' | 'ember' | 'starlight'
}

export interface AnalyticsResponse {
  weekly: WeeklyAnalytics
  summary: MoodSummary
}
