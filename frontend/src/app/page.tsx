import Link from "next/link"
import { ArrowRight, HeartHandshake, MoonStar, Music4, Sparkles, Waves } from "lucide-react"
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

const journeyItems = [
  { icon: "1", title: "先写下此刻", helper: "三十秒开始，不需要把所有情绪都解释清楚。" },
  { icon: "2", title: "收到温柔回应", helper: "从记录、分析到陪伴对话，形成一个轻量闭环。" },
  { icon: "3", title: "让今晚变轻一点", helper: "需要的时候再去音乐房间，或者继续和伙伴聊聊。" },
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

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.94fr_1.06fr] lg:gap-16 lg:py-14">
            <div className="min-w-0 space-y-8">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/82 px-4 py-2 text-sm text-[#ff708b] ring-1 ring-white/80">
                <MoonStar className="h-4 w-4" />
                <span className="leading-6">今晚不用强撑，先把情绪放下来一点点。</span>
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl font-display text-[clamp(2.5rem,8vw,5rem)] font-semibold leading-[1.02] tracking-tight text-[#202636]">
                  当你说不清楚自己怎么了，
                  <span className="block bg-gradient-to-r from-[#ff8fa7] via-[#f7b4c7] to-[#79d5c8] bg-clip-text text-transparent">
                    让灵音先陪你坐一会儿。
                  </span>
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                  MoodWave 灵音不是让你“立刻变好”的工具，而是一个能先接住情绪、再慢慢帮你整理和安抚的空间。
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex min-h-[54px] w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(255,180,194,0.3)] sm:w-auto"
                >
                  开始体验
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/mood"
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-white/82 px-6 text-sm font-semibold text-slate-700 ring-1 ring-white/80 shadow-[0_12px_28px_rgba(255,215,224,0.18)]"
                >
                  先写下此刻
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {supportPoints.map((item) => {
                  const Icon = item.icon
                  return (
                    <article
                      key={item.title}
                      className="rounded-[30px] bg-white/76 p-5 shadow-[0_16px_40px_rgba(255,214,224,0.14)] ring-1 ring-white/78 backdrop-blur-xl"
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

            <div className="relative min-w-0">
              <div className="pointer-events-none absolute left-[10%] top-[8%] h-32 w-32 rounded-full bg-[#ffdbe4]/80 blur-3xl" />
              <div className="pointer-events-none absolute right-[5%] top-[22%] h-28 w-28 rounded-full bg-[#d1f6ef]/90 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[10%] left-[26%] h-36 w-36 rounded-full bg-[#ddd5ff]/65 blur-3xl" />

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <CompanionHeroMascot
                  character="cat"
                  className="lg:col-span-2"
                  subtitle="灵音会先把气氛放软一点，再陪你慢慢看清今晚真正卡住的是哪件事。"
                />

                <section className="rounded-[34px] bg-white/78 p-5 shadow-[0_20px_48px_rgba(255,210,220,0.18)] ring-1 ring-white/80 backdrop-blur-xl">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#ff7894]">
                    <Waves className="h-4 w-4" />
                    今晚可以怎么开始
                  </div>
                  <div className="mt-4 space-y-3">
                    {journeyItems.map((item) => (
                      <div key={item.title} className="rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f8e7eb]">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-[#ffbfd0] to-[#8de1d5] text-xs font-semibold text-white">
                            {item.icon}
                          </span>
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.helper}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[34px] bg-gradient-to-br from-white via-[#fff7fa] to-[#eefdfa] p-5 shadow-[0_20px_48px_rgba(255,210,220,0.18)] ring-1 ring-white/80">
                  <p className="text-sm font-semibold text-slate-500">适合你的节奏</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#1f2635]">先被接住，再被理解，最后再慢慢变轻。</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    记录情绪、收到回应、去音乐房间缓一缓，或者继续和伙伴聊下去。你不需要一次完成全部。
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["一句话记录", "语音倾诉", "AI 温柔反馈", "治愈音乐", "伙伴对话"].map((item) => (
                      <span key={item} className="rounded-full bg-white/88 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-[#f5e1e7]">
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
