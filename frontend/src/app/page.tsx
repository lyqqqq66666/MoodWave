import Link from "next/link"
import { ArrowRight, HeartHandshake, Music4, Sparkles } from "lucide-react"
import { MoodWaveLogo } from "@/components/moodwave-logo"
import { CompanionHeroMascot } from "@/components/companion-avatar"

const supportPoints = [
  {
    icon: HeartHandshake,
    title: "情绪说不清",
    description: "用一句话、一次语音或一张图，把模糊的心情先接住。",
  },
  {
    icon: Sparkles,
    title: "需要被理解",
    description: "灵音会帮你整理情绪线索，不会用说教的方式催你振作。",
  },
  {
    icon: Music4,
    title: "想慢慢缓下来",
    description: "把当下状态转成一段更适合你的治愈节奏和陪伴空间。",
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,213,224,0.9),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(185,239,228,0.85),_transparent_26%),radial-gradient(circle_at_bottom_center,_rgba(210,200,255,0.5),_transparent_30%),linear-gradient(180deg,#fffdf9_0%,#fff6ef_100%)] text-slate-900">
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.38),transparent_28%,rgba(255,255,255,0.18))]" />
        <div className="relative mx-auto flex min-h-screen max-w-[1380px] flex-col px-5 pb-16 pt-6 md:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <MoodWaveLogo href="/" />
            <div className="flex items-center gap-3">
              <Link className="hidden text-sm text-slate-500 md:inline-flex" href="/login">
                已有账号
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center rounded-full bg-white/88 px-5 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_30px_rgba(255,205,215,0.22)] ring-1 ring-white/75"
              >
                登录
              </Link>
            </div>
          </header>

          <div className="relative flex flex-1 flex-col items-center justify-center py-10 lg:py-16">
            <div className="pointer-events-none absolute left-[8%] top-[16%] h-32 w-32 rounded-full bg-[#ffdbe4]/80 blur-3xl" />
            <div className="pointer-events-none absolute right-[10%] top-[22%] h-28 w-28 rounded-full bg-[#d1f6ef]/90 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[12%] left-[50%] h-36 w-36 -translate-x-1/2 rounded-full bg-[#ddd5ff]/65 blur-3xl" />

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
              <CompanionHeroMascot
                character="cat"
                className="w-full max-w-3xl"
                subtitle="灵音会先把气氛放软一点，再陪你慢慢看清今天真正卡住的是哪件事。"
              />

              <div className="mt-8 max-w-3xl space-y-5">
                <p className="inline-flex rounded-full bg-white/84 px-4 py-2 text-sm font-semibold text-[#ff708b] ring-1 ring-white/80">
                  先被接住，再慢慢理解自己
                </p>
                <h1 className="font-display text-[clamp(2.4rem,7vw,4.8rem)] font-semibold leading-[1.04] tracking-tight text-[#202636]">
                  当你说不清楚自己怎么了，
                  <span className="block bg-gradient-to-r from-[#ff8fa7] via-[#f7b4c7] to-[#79d5c8] bg-clip-text text-transparent">
                    让灵音先陪你坐一会儿。
                  </span>
                </h1>
                <p className="mx-auto max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                  MoodWave 灵音是一个把情绪记录、温柔分析、伙伴陪伴和治愈音乐放在一起的轻量空间。
                </p>
              </div>

              <div className="mt-8">
                <Link
                  href="/login"
                  className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(255,180,194,0.3)]"
                >
                  开始体验
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10 grid w-full gap-3 md:grid-cols-3">
                {supportPoints.map((item) => {
                  const Icon = item.icon
                  return (
                    <article
                      key={item.title}
                      className="rounded-[30px] bg-white/76 p-5 text-left shadow-[0_16px_40px_rgba(255,214,224,0.14)] ring-1 ring-white/78 backdrop-blur-xl"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff0f5] to-[#eefdfa] text-[#ff7894]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-[#1f2635]">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
