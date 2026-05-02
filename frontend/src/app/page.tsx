import Link from "next/link"
import { ArrowRight, HeartHandshake, Music4, Sparkles, TrendingUp } from "lucide-react"
import { MoodWaveLogo } from "@/components/moodwave-logo"

const featureCards = [
  {
    icon: TrendingUp,
    title: "情绪记录",
    description: "用 5 步把今天的感受留住，形成你自己的情绪地图。",
    href: "/mood",
  },
  {
    icon: Sparkles,
    title: "AI 分析",
    description: "从情绪、强度、标签里给出温柔而不说教的洞察。",
    href: "/analytics",
  },
  {
    icon: Music4,
    title: "治愈音乐",
    description: "把心情转成更适合当下的声音与陪伴氛围。",
    href: "/music",
  },
]

const previewLinks = [
  { href: "/analytics", label: "我的趋势", icon: TrendingUp },
  { href: "/music", label: "治愈音乐", icon: Music4 },
  { href: "/discovery", label: "解忧角", icon: HeartHandshake },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,197,211,0.8),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(181,240,231,0.8),_transparent_26%),radial-gradient(circle_at_bottom_center,_rgba(199,193,255,0.45),_transparent_24%),linear-gradient(180deg,#fffdfb_0%,#fff7ef_100%)] text-slate-900">
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 pb-10 pt-6 md:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <MoodWaveLogo href="/" />
          <div className="flex items-center gap-3">
            <Link className="hidden text-sm text-slate-500 md:inline-flex" href="/login">
              已有账号
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_30px_rgba(255,205,215,0.25)] ring-1 ring-white/70"
            >
              登录
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 pb-6 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-14">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-[#ff6f8c] ring-1 ring-white/70">
              <HeartHandshake className="h-4 w-4" />
              78.1% 的大学生每周都会经历负面情绪
            </div>

            <div className="space-y-5">
              <p className="font-display whitespace-nowrap text-5xl font-semibold leading-tight tracking-tight md:text-6xl lg:text-7xl">
                让情绪不只是<span className="bg-gradient-to-r from-[#ff879f] via-[#ffb9c7] to-[#70d6cb] bg-clip-text text-transparent">忍过去</span>
              </p>
              <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                MoodWave 把情绪记录、温柔分析和治愈音乐放进一个移动优先的轻量空间里。
                67.7% 的受访者愿意尝试音乐治愈，我们想让它真的落地。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(255,180,194,0.3)]"
              >
                立即体验
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon
                return (
                  <Link
                    key={feature.title}
                    href={feature.href}
                    className="rounded-[28px] bg-white/76 p-5 shadow-[0_20px_45px_rgba(255,214,224,0.18)] ring-1 ring-white/75 backdrop-blur-xl"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff0f5] to-[#eefdfa] text-[#ff7894]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold">{feature.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 top-3 h-24 rounded-full bg-[#ffd4de]/70 blur-3xl" />
            <div className="relative rounded-[40px] border border-white/70 bg-white/72 p-4 shadow-[0_24px_80px_rgba(255,205,215,0.32)] backdrop-blur-2xl md:p-6">
              <div className="rounded-[34px] bg-gradient-to-br from-[#fff7f9] via-[#fffdfa] to-[#eefdfa] p-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-sm">
                    今晚的情绪波纹
                  </span>
                  <span className="text-4xl">🌙</span>
                </div>

                <div className="mt-8 rounded-[32px] bg-white/90 p-6 shadow-[0_16px_40px_rgba(255,204,214,0.16)]">
                  <div className="text-center">
                    <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#ffe8a8] to-[#ffd298] text-6xl shadow-[0_14px_28px_rgba(255,205,120,0.28)]">
                      😌
                    </div>
                    <p className="mt-5 text-sm text-slate-500">今日心情</p>
                    <p className="mt-1 text-2xl font-semibold">平静，也有一点点疲惫</p>
                  </div>
                  <Link href="/mood" className="mt-6 block rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] p-[1px]">
                    <div className="flex items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-medium text-slate-700">
                      🎤 说说此刻的心情
                    </div>
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {previewLinks.map((item) => {
                    const Icon = item.icon
                    return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-[24px] bg-white/90 px-4 py-5 text-center text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(255,209,219,0.14)]"
                    >
                      <Icon className="mx-auto mb-2 h-4 w-4 text-[#ff7894]" />
                      {item.label}
                    </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
