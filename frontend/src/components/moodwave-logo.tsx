import Link from "next/link"
import { cn } from "@/lib/utils"

type MoodWaveLogoProps = {
  href?: string
  className?: string
  compact?: boolean
}

export function MoodWaveLogo({
  href = "/dashboard",
  className,
  compact = false,
}: MoodWaveLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-9 w-11 items-center justify-center overflow-hidden rounded-full bg-white/90 shadow-[0_10px_30px_rgba(255,180,194,0.18)] ring-1 ring-white/70">
        <div className="absolute left-1 top-3 h-2 w-4 rounded-full bg-[#ff9fb4]" />
        <div className="absolute right-1 top-3 h-2 w-4 rounded-full bg-[#8ad9d2]" />
        <div className="absolute left-2 top-4 h-[3px] w-7 rounded-full bg-gradient-to-r from-[#ff9fb4] via-[#ffd9aa] to-[#8ad9d2]" />
        <div className="absolute left-2 top-[18px] h-[3px] w-7 rounded-full bg-gradient-to-r from-[#ffb9c8] via-[#fff2cf] to-[#a6ece5]" />
      </div>
      {!compact && (
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-slate-800">
            MoodWave
          </p>
          <p className="text-[11px] text-slate-500">记录情绪的潮汐</p>
        </div>
      )}
    </div>
  )

  return <Link href={href}>{content}</Link>
}
