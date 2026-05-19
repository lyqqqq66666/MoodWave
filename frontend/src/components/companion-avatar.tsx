"use client"

import { Cat, Moon, PawPrint, Rocket, Sparkles, Star, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MoodType } from "@/lib/types"

export type CompanionCharacter = "sakura" | "planet" | "sunny" | "astronaut" | "moon" | "cat" | "fox"
export type CompanionColor = "pink" | "mint" | "blue" | "amber" | "purple"

export const companionCharacters: {
  id: CompanionCharacter
  name: string
  tagline: string
  icon: string
  personality: string
}[] = [
  { id: "sakura", name: "小樱", tagline: "轻柔陪伴型", icon: "✿", personality: "说话温柔，适合睡前倾诉。" },
  { id: "planet", name: "小星球", tagline: "安静观察型", icon: "◐", personality: "像一颗小行星，帮你整理思绪轨道。" },
  { id: "sunny", name: "阳光少年", tagline: "清爽鼓励型", icon: "☀", personality: "活力但不吵，适合男生和喜欢直接鼓励的用户。" },
  { id: "astronaut", name: "小宇航员", tagline: "理性探索型", icon: "✦", personality: "一起拆问题、找出口，适合学习和 deadline 场景。" },
  { id: "moon", name: "月光伙伴", tagline: "深夜守候型", icon: "☾", personality: "低声量陪伴，把情绪慢慢放下来。" },
  { id: "cat", name: "小喵", tagline: "软萌贴贴型", icon: "ฅ", personality: "轻轻接住委屈和疲惫，用软乎乎的话陪你慢慢缓过来。" },
  { id: "fox", name: "小狐狸", tagline: "灵动拆解型", icon: "✧", personality: "机灵但不催促，帮你把焦虑拆成可以行动的小线索。" },
]

export const companionColors: {
  id: CompanionColor
  name: string
  from: string
  to: string
  chip: string
}[] = [
  { id: "pink", name: "樱粉", from: "#FFB5C2", to: "#FFE8A8", chip: "bg-[#ffb5c2]" },
  { id: "mint", name: "薄荷", from: "#A8E6CF", to: "#90E0EF", chip: "bg-[#a8e6cf]" },
  { id: "blue", name: "晴空", from: "#90E0EF", to: "#CBC3E3", chip: "bg-[#90e0ef]" },
  { id: "amber", name: "暖阳", from: "#FFD166", to: "#EF8D7B", chip: "bg-[#ffd166]" },
  { id: "purple", name: "薰衣草", from: "#CBC3E3", to: "#FFB5C2", chip: "bg-[#cbc3e3]" },
]

const moodFace: Record<MoodType | "default", string> = {
  happy: "＾▽＾",
  calm: "˘◡˘",
  anxious: "・_・",
  angry: "｀へ´",
  sad: "；︿；",
  neutral: "・‿・",
  default: "・‿・",
}

const IconByCharacter = {
  sakura: Sparkles,
  planet: Star,
  sunny: Sun,
  astronaut: Rocket,
  moon: Moon,
  cat: Cat,
  fox: PawPrint,
}

export function getCompanionCharacter(value?: string | null) {
  const normalized = value === "star" ? "planet" : value
  return companionCharacters.find((item) => item.id === normalized) ?? companionCharacters[1]
}

export function normalizeCompanionCharacter(value?: string | null): CompanionCharacter {
  return getCompanionCharacter(value).id
}

export function getCompanionColor(value?: string | null) {
  return companionColors.find((item) => item.id === value) ?? companionColors[0]
}

type CompanionAvatarProps = {
  character?: string | null
  color?: string | null
  mood?: MoodType
  size?: "sm" | "md" | "lg"
  className?: string
}

export function CompanionAvatar({
  character,
  color,
  mood,
  size = "md",
  className,
}: CompanionAvatarProps) {
  const companion = getCompanionCharacter(character)
  const palette = getCompanionColor(color)
  const Icon = IconByCharacter[companion.id]
  const sizes = {
    sm: "h-12 w-12 rounded-[18px]",
    md: "h-24 w-24 rounded-[30px]",
    lg: "h-44 w-44 rounded-[44px] md:h-52 md:w-52",
  }
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-7 w-7",
    lg: "h-12 w-12",
  }

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-white shadow-[0_18px_44px_rgba(255,181,194,0.22)] ring-1 ring-white/80",
        sizes[size],
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
      aria-label={companion.name}
      role="img"
    >
      <div className="absolute inset-2 rounded-[inherit] bg-white/38" />
      <div className="absolute left-3 top-3 h-3 w-3 rounded-full bg-white/75" />
      <div className="relative grid place-items-center text-slate-800">
        <Icon className={cn("mb-1 text-white drop-shadow-sm", iconSizes[size])} />
        <div className={cn("font-semibold", size === "lg" ? "text-2xl" : size === "md" ? "text-base" : "text-[10px]")}>
          {moodFace[mood ?? "default"]}
        </div>
      </div>
      <div className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white/82 text-sm text-slate-700 shadow-sm">
        {companion.icon}
      </div>
    </div>
  )
}
