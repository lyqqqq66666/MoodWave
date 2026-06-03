"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

type IOSSafeAreaProps = {
  children: ReactNode
  className?: string
}

export function IOSSafeArea({ children, className }: IOSSafeAreaProps) {
  return (
    <div
      className={cn(
        "min-h-screen overflow-x-hidden px-0 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+10px)]",
        className,
      )}
    >
      {children}
    </div>
  )
}
