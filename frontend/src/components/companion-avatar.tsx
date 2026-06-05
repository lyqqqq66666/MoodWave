"use client"

import Image from "next/image"
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
  size = "md",
  className,
}: CompanionAvatarProps) {
  const companion = getCompanionCharacter(character)
  const palette = getCompanionColor(color)
  const sizes = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-32 w-32 md:h-36 md:w-36",
  }

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center rounded-full", sizes[size], className)}
      aria-label={companion.name}
      role="img"
    >
      <span
        className="absolute inset-[8%] rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${palette.from}, ${palette.to})` }}
      />
      <span className="absolute inset-0 rounded-full border border-white/75 bg-white/58 shadow-[0_16px_34px_rgba(255,181,194,0.18)]" />
      <div className="relative h-[88%] w-[88%] overflow-hidden rounded-full">
        <Image src={companion.artwork} alt={companion.name} fill sizes="144px" className="object-contain" />
      </div>
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
    lg: "h-60 w-60",
  }
  const artSize = {
    sm: "h-14 w-14",
    md: "h-24 w-24",
    lg: "h-40 w-40",
  }

  return (
    <div className={cn("relative grid place-items-center", shellSize[size], className)}>
      <motion.div
        className="absolute inset-[4%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${palette.from}, ${palette.to})` }}
        animate={{ scale: [0.94, 1.08, 0.96], opacity: [0.46, 0.82, 0.52] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[17%] rounded-full border border-white/55"
        animate={{ scale: [0.98, 1.03, 0.98], opacity: [0.28, 0.52, 0.3] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[2%] rounded-full border border-white/28"
        animate={{ scale: [1, 1.08, 1], opacity: [0.1, 0.26, 0.12] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[10%] h-[16%] w-[56%] rounded-full bg-white/50 blur-lg"
        animate={{ scaleX: [0.92, 1.04, 0.94], opacity: [0.28, 0.4, 0.28] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="relative z-10 grid place-items-center rounded-full border border-white/65 bg-white/54 shadow-[0_22px_50px_rgba(255,181,194,0.22)] backdrop-blur-sm"
        style={{
          width: size === "lg" ? "72%" : size === "md" ? "68%" : "66%",
          height: size === "lg" ? "72%" : size === "md" ? "68%" : "66%",
          background: `radial-gradient(circle at 36% 26%, rgba(255,255,255,0.95), rgba(255,255,255,0.54) 48%, rgba(255,255,255,0.22) 100%)`,
        }}
        animate={{ y: [0, -10, 0], rotate: [0, -1.4, 0.8, 0], scale: [1, 1.018, 1] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className={cn("relative", artSize[size])}>
          <Image src={companion.artwork} alt={companion.name} fill sizes="220px" className="object-contain drop-shadow-[0_16px_24px_rgba(255,255,255,0.35)]" />
        </div>
      </motion.div>

      {showOrbitPills && size === "lg" ? (
        <>
          {companion.orbitPills.map((pill, index) => (
            <motion.span
              key={pill}
              className={cn(
                "absolute rounded-full bg-white/84 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-[0_10px_20px_rgba(255,204,214,0.16)]",
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
        "relative overflow-hidden rounded-[42px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(255,248,240,0.92))] p-6 shadow-[0_24px_80px_rgba(255,196,209,0.22)] backdrop-blur-2xl",
        className,
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-10 bottom-0 h-40 rounded-full blur-3xl"
        style={{ backgroundColor: companion.halo }}
        animate={{ scale: [0.9, 1.04, 0.92], opacity: [0.34, 0.58, 0.38] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-8 top-8 h-20 w-20 rounded-full blur-2xl"
        style={{ backgroundColor: companion.halo }}
        animate={{ scale: [0.92, 1.06, 0.94], opacity: [0.55, 0.8, 0.58] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {companion.orbitPills.map((pill, index) => (
        <motion.span
          key={pill}
          className={cn(
            "pointer-events-none absolute rounded-full bg-white/84 px-3 py-1.5 text-[11px] font-medium text-slate-500 shadow-[0_10px_20px_rgba(255,204,214,0.16)] backdrop-blur-sm",
            index === 0 && "left-4 top-10",
            index === 1 && "right-4 top-16",
            index === 2 && "bottom-6 left-8",
          )}
          animate={{ y: [0, -8, 0], rotate: [0, 1.2, 0] }}
          transition={{ duration: 4.8 + index * 0.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
        >
          {pill}
        </motion.span>
      ))}

      <div className="relative flex flex-col items-center gap-4 text-center">
        <CompanionPetOrb character={companion.id} size="lg" showOrbitPills className="mt-2" />
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ff7894]">{companion.sceneTitle}</p>
          <p className="text-sm font-semibold text-[#ff7894]">{companion.tagline}</p>
          <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600">{subtitle || companion.personality}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-slate-600">{companion.species}</span>
          {companion.expressions.map((item) => (
            <span key={item} className="rounded-full bg-white/84 px-3 py-1 text-xs text-slate-500 shadow-sm ring-1 ring-white/80">
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
