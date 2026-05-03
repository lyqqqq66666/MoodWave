"use client"

import Image from "next/image"
import { motion } from "framer-motion"

export function OnboardingStep1({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 170, damping: 18 }}
        className="relative h-32 w-40 md:h-40 md:w-52"
      >
        <Image
          src="/brand/moodwave-logo-mark.png"
          alt=""
          fill
          priority
          sizes="208px"
          className="object-contain drop-shadow-[0_20px_36px_rgba(255,151,173,0.28)]"
        />
        <div className="absolute inset-4 -z-10 animate-pulse rounded-full bg-[#ffdce6]/80 blur-3xl" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-7 font-display text-4xl font-bold text-slate-900 md:text-5xl"
      >
        欢迎来到灵音
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="mt-4 max-w-sm text-base leading-8 text-slate-600"
      >
        记录情绪的潮汐，遇见内心的风景。每一次情绪，都会变成一段专属于你的声音与颜色。
      </motion.p>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        onClick={onStart}
        className="mt-10 flex min-h-14 w-full max-w-xs items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffc2cf] to-[#8de1d5] px-8 font-semibold text-white shadow-[0_18px_38px_rgba(255,151,173,0.32)] transition hover:scale-[1.02]"
      >
        开始探索
      </motion.button>
    </div>
  )
}
