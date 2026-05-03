"use client"

import { Loader2 } from "lucide-react"
import { MoodSelector } from "@/components/mood-selector"
import { IntensitySlider } from "@/components/intensity-slider"
import { getMoodOption } from "@/lib/moodwave"
import { useOnboardingStore } from "@/store/onboarding"

export function OnboardingStep4() {
  const {
    demoMood,
    demoIntensity,
    demoNote,
    isLoadingAI,
    setDemoMood,
    setDemoIntensity,
    setDemoNote,
    analyzeDemo,
  } = useOnboardingStore()
  const mood = demoMood ?? "calm"
  const meta = getMoodOption(mood)

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#ff7894]">互动速记</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 md:text-4xl">来，试一次</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
          选一个最贴近此刻心情的表情。这次只用于演示，不会写入正式记录。
        </p>
      </div>
      <div className="mt-7 rounded-[32px] bg-white/78 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.18)] ring-1 ring-white/75 md:p-6">
        <MoodSelector value={mood} onChange={setDemoMood} className="gap-3 [&>button]:min-h-24 [&>button]:p-4" />
        <IntensitySlider
          value={demoIntensity}
          onChange={setDemoIntensity}
          moodColor={meta.accent}
          className="mt-6 rounded-[26px] bg-[#fffafb] p-4 ring-1 ring-[#f6e4e9]"
        />
        <label className="mt-5 block">
          <span className="text-sm font-medium text-slate-700">此刻想说点什么？</span>
          <textarea
            value={demoNote}
            onChange={(event) => setDemoNote(event.target.value.slice(0, 180))}
            rows={4}
            placeholder="写下几行字，也可以先空着。"
            className="mt-2 w-full resize-none rounded-[24px] border border-[#f6dfe6] bg-white/90 px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition focus:ring-2 focus:ring-[#ffb5c2]"
          />
        </label>
        <button
          type="button"
          onClick={() => void analyzeDemo()}
          disabled={isLoadingAI}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 font-semibold text-white shadow-[0_16px_34px_rgba(255,151,173,0.26)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
        >
          {isLoadingAI ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {isLoadingAI ? "正在感受你的心情..." : "分析我的心情"}
        </button>
      </div>
    </div>
  )
}
