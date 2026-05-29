"use client"

import { create } from "zustand"
import { analyticsAPI } from "@/lib/api"
import { demoResultCopy, markOnboardingCompleted, type DemoAIResult } from "@/lib/onboarding"
import type { MoodType } from "@/lib/types"

type OnboardingState = {
  currentStep: number
  isCompleted: boolean
  demoMood: MoodType | null
  demoIntensity: number
  demoNote: string
  aiResult: DemoAIResult | null
  isLoadingAI: boolean
  aiError: string
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  skipAll: () => void
  complete: () => void
  reset: () => void
  setDemoMood: (mood: MoodType) => void
  setDemoIntensity: (intensity: number) => void
  setDemoNote: (note: string) => void
  analyzeDemo: () => Promise<void>
}

function clampStep(step: number) {
  return Math.min(4, Math.max(0, step))
}

function fallbackResult(mood: MoodType, intensity: number): DemoAIResult {
  return {
    mood,
    intensity,
    ...demoResultCopy[mood],
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 0,
  isCompleted: false,
  demoMood: "calm",
  demoIntensity: 6,
  demoNote: "",
  aiResult: null,
  isLoadingAI: false,
  aiError: "",
  setStep: (step) => set({ currentStep: clampStep(step) }),
  nextStep: () => set((state) => ({ currentStep: clampStep(state.currentStep + 1) })),
  prevStep: () => set((state) => ({ currentStep: clampStep(state.currentStep - 1) })),
  skipAll: () => {
    markOnboardingCompleted()
    set({ isCompleted: true })
  },
  complete: () => {
    markOnboardingCompleted()
    set({ isCompleted: true })
  },
  reset: () => set({
    currentStep: 0,
    isCompleted: false,
    demoMood: "calm",
    demoIntensity: 6,
    demoNote: "",
    aiResult: null,
    aiError: "",
  }),
  setDemoMood: (demoMood) => set({ demoMood }),
  setDemoIntensity: (demoIntensity) => set({ demoIntensity }),
  setDemoNote: (demoNote) => set({ demoNote }),
  analyzeDemo: async () => {
    const { demoMood, demoIntensity, demoNote } = get()
    const mood = demoMood ?? "calm"
    set({ isLoadingAI: true, aiError: "" })
    try {
      const response = await analyticsAPI.analyze({
        mood_type: mood,
        intensity: demoIntensity,
        note: demoNote || "这是一次新手引导里的演示情绪速记。",
        tags: ["onboarding"],
      })
      const envelope = response.data as { data?: Record<string, unknown>; fallback?: boolean }
      const payload = (envelope?.data ?? response.data ?? {}) as Record<string, unknown>
      const result: DemoAIResult = {
        mood,
        intensity: demoIntensity,
        keywords: Array.isArray(payload.keywords) ? payload.keywords.map(String).slice(0, 3) : fallbackResult(mood, demoIntensity).keywords,
        insight: String(payload.insight || payload.summary || fallbackResult(mood, demoIntensity).insight),
        suggestion: String(payload.suggestion || fallbackResult(mood, demoIntensity).suggestion),
      }
      set({ aiResult: result, currentStep: 4 })
    } catch {
      set({
        aiResult: fallbackResult(mood, demoIntensity),
        aiError: "分析需要一点时间，先给你一份本地情绪报告。",
        currentStep: 4,
      })
    } finally {
      set({ isLoadingAI: false })
    }
  },
}))
