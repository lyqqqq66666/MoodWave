"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

type IOSGlassCardProps = {
  children: ReactNode
  className?: string
}

export function IOSGlassCard({ children, className }: IOSGlassCardProps) {
  return (
    <section
      className={cn(
        "rounded-[32px] border border-white/75 bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,206,216,0.2)] backdrop-blur-2xl",
        className,
      )}
    >
      {children}
    </section>
  )
}
