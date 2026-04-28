import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { MoodWaveShell } from "./moodwave-shell"

type PlaceholderPageProps = {
  title: string
  eyebrow: string
  description: string
}

export function PlaceholderPage({
  title,
  eyebrow,
  description,
}: PlaceholderPageProps) {
  return (
    <MoodWaveShell title={title}>
      <section className="mx-auto flex max-w-4xl flex-col gap-6 rounded-[36px] bg-white/80 p-8 shadow-[0_20px_60px_rgba(250,205,214,0.28)] ring-1 ring-white/70">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fff0f4] px-4 py-2 text-sm text-[#ff6f8c]">
          <Sparkles className="h-4 w-4" />
          {eyebrow}
        </span>
        <div className="space-y-3">
          <h2 className="font-display text-3xl font-semibold text-slate-900">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-gradient-to-r from-[#ff9fb4] to-[#8de1d5] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,181,194,0.28)]"
          >
            回到首页
          </Link>
          <Link
            href="/mood"
            className="inline-flex items-center gap-2 rounded-full border border-[#ffd4df] bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          >
            继续记录情绪
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </MoodWaveShell>
  )
}
