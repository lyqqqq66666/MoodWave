"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MiniMusicVisualizer } from "./mini-music-visualizer"
import type { MoodType } from "@/lib/types"
import { getMoodOption } from "@/lib/moodwave"
import { cn } from "@/lib/utils"

const previewMoods: MoodType[] = ["happy", "calm", "sad"]

export function OnboardingStep3() {
  const [mood, setMood] = useState<MoodType>("calm")

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#55bdb0]">音乐房间预览</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 md:text-4xl">
          你的情绪，可以听见
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
          试听一下不同心情的声音，颜色和节奏会跟着变化。
        </p>
      </div>
      <div className="mt-7">
        <MiniMusicVisualizer mood={mood} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {previewMoods.map((item) => {
          const meta = getMoodOption(item)
          const active = item === mood
          return (
            <motion.button
              key={item}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setMood(item)}
              className={cn(
                "min-h-12 rounded-full bg-white/78 px-4 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-white/70 transition",
                active && "text-white shadow-[0_14px_30px_rgba(255,151,173,0.24)]",
              )}
              style={active ? { background: `linear-gradient(135deg, ${meta.accent}, #8de1d5)` } : undefined}
            >
              {meta.emoji} {meta.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
