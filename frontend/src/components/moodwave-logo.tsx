import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

type MoodWaveLogoProps = {
  href?: string
  className?: string
  compact?: boolean
  markOnly?: boolean
}

export function MoodWaveLogo({
  href = "/dashboard",
  className,
  compact = false,
  markOnly = false,
}: MoodWaveLogoProps) {
  const markWidth = compact ? 44 : 54
  const markHeight = compact ? 36 : 42

  const content = (
    <div className={cn("flex min-w-0 items-center", compact ? "gap-2" : "gap-3", className)}>
      <div
        className="relative shrink-0"
        style={{ width: markWidth, height: markHeight }}
      >
        <Image
          src="/brand/moodwave-logo-mark.png"
          alt=""
          fill
          sizes={`${markWidth}px`}
          className="object-contain"
          priority={false}
        />
      </div>
      {!markOnly && (
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
