/**
 * 游客本地存储层
 *
 * 管理未登录用户的情绪记录本地 CRUD
 * 使用 Zustand persist 自动持久化到 localStorage
 *
 * 数据结构与后端 MoodEntry 对齐，方便登录后同步
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

// ==================== 类型定义 ====================

/** 游客情绪记录（与后端 MoodEntry 字段对齐） */
export interface GuestMoodRecord {
  /** 唯一 ID（前端生成） */
  id: string
  /** 记录日期（YYYY-MM-DD），支持补记 */
  date: string
  /** 情绪类型 */
  mood_type: "happy" | "calm" | "anxious" | "angry" | "sad" | "neutral"
  /** 强度 1-10 */
  intensity: number
  /** 标签列表 */
  tags: string[]
  /** 文字描述 */
  note: string
  /** 图片 URL 列表（本地 blob URL） */
  images: string[]
  /** 创建时间 */
  created_at: string
  /** 标记为游客记录 */
  is_guest: true
}

interface GuestStore {
  /** 游客情绪记录列表 */
  records: GuestMoodRecord[]
  /** 是否有未同步的记录 */
  hasUnsynced: boolean

  // ==================== 操作 ====================

  /** 添加记录 */
  addRecord: (
    record: Omit<GuestMoodRecord, "id" | "created_at" | "is_guest">
  ) => GuestMoodRecord

  /** 更新记录 */
  updateRecord: (id: string, updates: Partial<GuestMoodRecord>) => void

  /** 删除记录 */
  deleteRecord: (id: string) => void

  /** 获取所有记录 */
  getRecords: () => GuestMoodRecord[]

  /** 获取单条记录 */
  getRecord: (id: string) => GuestMoodRecord | undefined

  /** 清空所有记录（同步完成后调用） */
  clearAll: () => void

  /** 标记为已同步 */
  markSynced: () => void
}

// ==================== 工具函数 ====================

/** 生成 UUID */
function generateId(): string {
  return "guest-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9)
}

/** 获取今天的日期字符串 */
function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

// ==================== Store ====================

export const useGuestStore = create<GuestStore>()(
  persist(
    (set, get) => ({
      records: [],
      hasUnsynced: false,

      addRecord: (record) => {
        const newRecord: GuestMoodRecord = {
          ...record,
          id: generateId(),
          created_at: new Date().toISOString(),
          is_guest: true,
        }
        set((state) => ({
          records: [newRecord, ...state.records],
          hasUnsynced: true,
        }))
        return newRecord
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
          hasUnsynced: true,
        }))
      },

      deleteRecord: (id) => {
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
          hasUnsynced: true,
        }))
      },

      getRecords: () => get().records,

      getRecord: (id) => get().records.find((r) => r.id === id),

      clearAll: () => {
        set({ records: [], hasUnsynced: false })
      },

      markSynced: () => {
        set({ hasUnsynced: false })
      },
    }),
    {
      name: "moodwave-guest-records",
      // 只持久化 records，hasUnsynced 每次启动重新计算
      partialize: (state) => ({ records: state.records }),
    }
  )
)

// ==================== 同步工具 ====================

/**
 * 将游客记录转换为后端 MoodEntryCreate 格式
 * 用于登录后批量同步
 */
export function toMoodEntryCreate(record: GuestMoodRecord) {
  return {
    date: record.date || getToday(),
    mood_type: record.mood_type,
    intensity: record.intensity,
    tags: record.tags,
    note: record.note,
    images: record.images,
  }
}
