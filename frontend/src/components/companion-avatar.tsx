"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { MoodType } from "@/lib/types"
import {
  companionCharacters,
  companionColors,
  getCompanionCharacter,
  getCompanionColor,
  normalizeCompanionCharacter,
  type CompanionCharacter,
  type CompanionColor,
} from "@/config/companion-characters"

const moodFace: Record<MoodType | "default", { eyeScale: string; mouth: string }> = {
  happy: { eyeScale: "scale-y-[0.45]", mouth: "smile" },
  calm: { eyeScale: "scale-y-[0.55]", mouth: "flat" },
  anxious: { eyeScale: "scale-y-[0.95]", mouth: "worry" },
  angry: { eyeScale: "scale-y-[0.9]", mouth: "zig" },
  sad: { eyeScale: "scale-y-[0.75]", mouth: "sad" },
  neutral: { eyeScale: "scale-y-[0.75]", mouth: "flat" },
  default: { eyeScale: "scale-y-[0.75]", mouth: "flat" },
}

function CompanionFace({ mood, accent }: { mood?: MoodType; accent: string }) {
  const expression = moodFace[mood ?? "default"]
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-[27%] top-[40%] flex w-[46%] items-center justify-between">
        <span className={cn("block h-2.5 w-2 rounded-full bg-[#3f4350] transition-transform", expression.eyeScale)} />
        <span className={cn("block h-2.5 w-2 rounded-full bg-[#3f4350] transition-transform", expression.eyeScale)} />
      </div>
      <span className="absolute left-[21%] top-[52%] h-3.5 w-6 rounded-full opacity-70 blur-[1px]" style={{ backgroundColor: accent }} />
      <span className="absolute right-[21%] top-[52%] h-3.5 w-6 rounded-full opacity-70 blur-[1px]" style={{ backgroundColor: accent }} />
      {expression.mouth === "smile" ? (
        <span className="absolute left-1/2 top-[58%] h-5 w-8 -translate-x-1/2 rounded-b-full border-b-[3px] border-[#4d5160]" />
      ) : null}
      {expression.mouth === "flat" ? (
        <span className="absolute left-1/2 top-[61%] h-[3px] w-6 -translate-x-1/2 rounded-full bg-[#4d5160]" />
      ) : null}
      {expression.mouth === "worry" ? (
        <span className="absolute left-1/2 top-[60%] h-4 w-8 -translate-x-1/2 rounded-t-full border-t-[3px] border-[#4d5160]" />
      ) : null}
      {expression.mouth === "sad" ? (
        <span className="absolute left-1/2 top-[61%] h-4 w-8 -translate-x-1/2 rounded-t-full border-t-[3px] border-[#4d5160]" />
      ) : null}
      {expression.mouth === "zig" ? (
        <span className="absolute left-1/2 top-[61%] h-[3px] w-7 -translate-x-1/2 rotate-[8deg] rounded-full bg-[#4d5160]" />
      ) : null}
    </div>
  )
}

function MascotShape({
  character,
  mood,
  size,
}: {
  character: CompanionCharacter
  mood?: MoodType
  size: "sm" | "md" | "lg" | "hero"
}) {
  const companion = getCompanionCharacter(character)
  const dotSize = size === "hero" ? "h-[76%] w-[76%]" : size === "lg" ? "h-[74%] w-[74%]" : size === "md" ? "h-[72%] w-[72%]" : "h-[70%] w-[70%]"

  return (
    <div className={cn("relative", dotSize)}>
      {character === "cat" ? (
        <>
          <span className="absolute left-[12%] top-[1%] h-[26%] w-[24%] rotate-[-22deg] rounded-[48%_52%_34%_66%/42%_36%_64%_58%] bg-white/88" />
          <span className="absolute right-[12%] top-[1%] h-[26%] w-[24%] rotate-[22deg] rounded-[52%_48%_66%_34%/36%_42%_58%_64%] bg-white/88" />
        </>
      ) : null}
      {character === "fox" ? (
        <>
          <span className="absolute left-[10%] top-[2%] h-[24%] w-[20%] rotate-[-16deg] rounded-[40%_60%_30%_70%/40%_26%_74%_60%] bg-white/88" />
          <span className="absolute right-[10%] top-[2%] h-[24%] w-[20%] rotate-[16deg] rounded-[60%_40%_70%_30%/26%_40%_60%_74%] bg-white/88" />
        </>
      ) : null}
      {character === "astronaut" ? (
        <span className="absolute left-1/2 top-[7%] h-[12%] w-[54%] -translate-x-1/2 rounded-full border border-white/80 bg-white/24" />
      ) : null}
      {character === "sakura" ? (
        <>
          <span className="absolute left-[3%] top-[21%] text-lg text-white/90">✿</span>
          <span className="absolute right-[3%] top-[28%] text-sm text-white/80">✿</span>
        </>
      ) : null}
      {character === "planet" ? (
        <span className="absolute left-1/2 top-[51%] h-[16%] w-[104%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/70 opacity-80" />
      ) : null}
      {character === "moon" ? (
        <span className="absolute right-[5%] top-[8%] text-lg text-white/90">☾</span>
      ) : null}
      {character === "sunny" ? (
        <>
          <span className="absolute left-[2%] top-[24%] text-base text-white/90">✦</span>
          <span className="absolute right-[8%] top-[18%] text-sm text-white/80">✦</span>
        </>
      ) : null}

      <div className="relative h-full w-full animate-[breathe_4.8s_ease-in-out_infinite] rounded-[46%_54%_48%_52%/48%_44%_56%_52%] bg-white/92 shadow-[inset_0_-10px_24px_rgba(255,255,255,0.55)]">
        <div className="absolute left-[18%] top-[13%] h-[26%] w-[26%] rounded-full bg-white/70 blur-[2px]" />
        <CompanionFace mood={mood} accent={companion.face.blush} />
      </div>
    </div>
  )
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
  const sizes = {
    sm: "h-12 w-12 rounded-[20px]",
    md: "h-24 w-24 rounded-[32px]",
    lg: "h-44 w-44 rounded-[48px] md:h-52 md:w-52",
  }

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden ring-1 ring-white/85",
        "shadow-[0_18px_44px_rgba(255,181,194,0.22)]",
        sizes[size],
        className,
      )}
      style={{ background: `linear-gradient(145deg, ${palette.from}, ${palette.to})` }}
      aria-label={companion.name}
      role="img"
    >
      <span className="absolute inset-[10%] rounded-[inherit] bg-white/28" />
      <span className="absolute left-[14%] top-[12%] h-4 w-4 rounded-full bg-white/75 blur-[1px]" />
      <MascotShape character={companion.id} mood={mood} size={size} />
      <span className="absolute bottom-2 right-2 grid h-7 min-w-7 place-items-center rounded-full bg-white/82 px-1 text-[11px] font-semibold text-slate-700 shadow-sm">
        {companion.symbol}
      </span>
    </div>
  )
}

type CompanionPetOrbProps = {
  character?: string | null
  color?: string | null
  mood?: MoodType
  size?: "sm" | "md" | "lg"
  className?: string
  showLabel?: boolean
  showOrbitPills?: boolean
}

export function CompanionPetOrb({
  character,
  color,
  mood,
  size = "md",
  className,
  showLabel = false,
  showOrbitPills = false,
}: CompanionPetOrbProps) {
  const companion = getCompanionCharacter(character)
  const palette = getCompanionColor(color)
  const shellSize = {
    sm: "h-20 w-20",
    md: "h-36 w-36",
    lg: "h-56 w-56",
  }
  const stageSize = {
    sm: "h-14 w-14",
    md: "h-24 w-24",
    lg: "h-40 w-40",
  }
  const mascotSize = size === "lg" ? "lg" : size === "md" ? "md" : "sm"

  return (
    <div className={cn("relative grid place-items-center", shellSize[size], className)}>
      <motion.div
        className="absolute inset-[8%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${palette.from}, ${palette.to})` }}
        animate={{ scale: [0.92, 1.06, 0.95], opacity: [0.45, 0.78, 0.5] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[20%] rounded-full border border-white/50"
        animate={{ scale: [0.96, 1.02, 0.97], opacity: [0.24, 0.55, 0.26] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[3%] rounded-full border border-white/28"
        animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.28, 0.1] }}
        transition={{ duration: 6.1, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn("relative grid place-items-center rounded-[42%_58%_52%_48%/46%_48%_52%_54%] shadow-[0_18px_40px_rgba(255,181,194,0.22)]", stageSize[size])}
        style={{ background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.88), transparent 26%), linear-gradient(145deg, ${companion.gradient[0]}, ${companion.gradient[1]} 54%, ${companion.gradient[2]})` }}
        animate={{ y: [0, -8, 0], rotate: [0, -1, 0.6, 0], scale: [1, 1.015, 1] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="absolute inset-[10%] rounded-[inherit] bg-white/28" />
        <MascotShape character={companion.id} mood={mood} size={mascotSize} />
      </motion.div>
      {showOrbitPills && size === "lg" ? (
        <>
          {companion.orbitPills.map((pill, index) => (
            <motion.span
              key={pill}
              className={cn(
                "absolute rounded-full bg-white/82 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-[0_10px_20px_rgba(255,204,214,0.16)]",
                index === 0 && "left-0 top-7",
                index === 1 && "right-0 top-12",
                index === 2 && "bottom-1 left-7",
              )}
              animate={{ y: [0, -7, 0], rotate: [0, 1.2, 0] }}
              transition={{ duration: 4.8 + index * 0.3, repeat: Infinity, ease: "easeInOut", delay: index * 0.25 }}
            >
              {pill}
            </motion.span>
          ))}
        </>
      ) : null}
      {showLabel ? (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-[0_10px_20px_rgba(255,181,194,0.18)]">
          {companion.name}
        </span>
      ) : null}
    </div>
  )
}

type CompanionHeroMascotProps = {
  character?: string | null
  className?: string
  subtitle?: string
}

export function CompanionHeroMascot({
  character,
  className,
  subtitle,
}: CompanionHeroMascotProps) {
  const companion = getCompanionCharacter(character)

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[42px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(255,248,240,0.92))] p-6 shadow-[0_24px_80px_rgba(255,196,209,0.22)] backdrop-blur-2xl",
        className,
      )}
    >
      <motion.div
        className="pointer-events-none absolute left-8 top-8 h-20 w-20 rounded-full blur-2xl"
        style={{ backgroundColor: companion.halo }}
        animate={{ scale: [0.92, 1.06, 0.94], opacity: [0.55, 0.8, 0.58] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-6 right-10 h-24 w-24 rounded-full bg-white/60 blur-3xl"
        animate={{ y: [0, -10, 0], opacity: [0.35, 0.7, 0.4] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[radial-gradient(circle_at_center,_rgba(255,191,208,0.18),_transparent_70%)]" />

      {companion.orbitPills.map((pill, index) => (
        <motion.span
          key={pill}
          className={cn(
            "pointer-events-none absolute rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-[0_10px_20px_rgba(255,204,214,0.16)] backdrop-blur-sm",
            index === 0 && "left-4 top-10",
            index === 1 && "right-4 top-16",
            index === 2 && "bottom-6 left-8",
          )}
          animate={{ y: [0, -8, 0], rotate: [0, 1.5, 0] }}
          transition={{ duration: 4.8 + index * 0.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
        >
          {pill}
        </motion.span>
      ))}

      <div className="relative flex flex-col items-center gap-4 text-center">
        <CompanionPetOrb character={companion.id} size="lg" showOrbitPills className="mt-3" />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ff7894]">{companion.sceneTitle}</p>
          <p className="text-sm font-semibold text-[#ff7894]">{companion.tagline}</p>
          <p className="max-w-xs text-sm leading-6 text-slate-600">{subtitle || companion.personality}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-slate-600">{companion.species}</span>
          {companion.expressions.map((item) => (
            <span key={item} className="rounded-full bg-white/82 px-3 py-1 text-xs text-slate-500 shadow-sm ring-1 ring-white/80">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export {
  companionCharacters,
  companionColors,
  getCompanionCharacter,
  normalizeCompanionCharacter,
}
export type { CompanionCharacter, CompanionColor }
