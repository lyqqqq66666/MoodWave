"use client"

import Link from "next/link"
import { ArrowRight, RotateCcw } from "lucide-react"
import { EmptyStateGuide } from "@/components/onboarding/empty-state-guide"
import { OnboardingStep1 } from "@/components/onboarding/onboarding-step-1"
import { OnboardingStep2 } from "@/components/onboarding/onboarding-step-2"
import { OnboardingStep3 } from "@/components/onboarding/onboarding-step-3"
import { OnboardingStep4 } from "@/components/onboarding/onboarding-step-4"
import { OnboardingStep5 } from "@/components/onboarding/onboarding-step-5"
import { DASHBOARD_TOOLTIP_KEY, LEGACY_ONBOARDING_KEY, ONBOARDING_KEY } from "@/lib/onboarding"

const sections = [
  {
    title: "Step 1",
    description: "欢迎页：品牌认知和情感连接",
    content: <OnboardingStep1 onStart={() => undefined} />,
  },
  {
    title: "Step 2",
    description: "核心流程：记录、AI 分析、音乐治愈",
    content: <OnboardingStep2 />,
  },
  {
    title: "Step 3",
    description: "音乐房间预览：可以切换情绪并试听",
    content: <OnboardingStep3 />,
  },
  {
    title: "Step 4",
    description: "互动速记：选择情绪、强度和文字",
    content: <OnboardingStep4 />,
  },
  {
    title: "Step 5",
    description: "完成页：展示第一份演示情绪报告",
    content: <OnboardingStep5 onComplete={() => undefined} />,
  },
]

function clearOnboardingCache() {
  localStorage.removeItem(ONBOARDING_KEY)
  localStorage.removeItem(LEGACY_ONBOARDING_KEY)
  localStorage.removeItem(DASHBOARD_TOOLTIP_KEY)
  window.location.reload()
}

function DashboardTooltipPreview() {
  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-[30px] bg-white/72 p-5 shadow-inner ring-1 ring-white/75">
      <div className="grid gap-3 md:grid-cols-3">
        {["我的趋势", "治愈音乐", "灵音伙伴"].map((item) => (
          <div key={item} className="rounded-[24px] bg-white/84 p-4 text-sm font-semibold text-slate-600 shadow-sm">
            {item}
            <p className="mt-2 text-xs font-normal leading-5 text-slate-400">首页功能入口</p>
          </div>
        ))}
      </div>
      <div className="absolute left-6 top-24 w-[min(86vw,390px)] rounded-[28px] border border-white/80 bg-white/94 p-4 shadow-[0_24px_70px_rgba(255,151,173,0.28)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ffb4c4] to-[#8de1d5] text-white">
            ✦
          </div>
          <div>
            <p className="font-semibold text-slate-900">从这里开始你的第一次记录</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">写下此刻心情，灵音会带你去看分析和音乐房间。</p>
          </div>
        </div>
        <div className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white">
          说说此刻的心情
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPreviewPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,210,221,0.78),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(180,242,232,0.74),_transparent_28%),linear-gradient(180deg,#fffdfb_0%,#fff7f0_100%)] px-4 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="sticky top-4 z-30 rounded-[30px] border border-white/75 bg-white/82 p-4 shadow-[0_18px_48px_rgba(255,181,194,0.2)] backdrop-blur-xl md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#ff7894]">MoodWave Onboarding Preview</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 md:text-3xl">新手指引一览</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">这个页面不受 localStorage 影响，用来一次看完所有引导画面。</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 md:mt-0">
            <button
              type="button"
              onClick={clearOnboardingCache}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#fff3f6] px-5 text-sm font-semibold text-[#ff718b]"
            >
              <RotateCcw className="h-4 w-4" />
              清除引导缓存
            </button>
            <Link
              href="/onboarding"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(255,151,173,0.24)]"
            >
              打开真实流程
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="mt-8 grid gap-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[34px] border border-white/75 bg-white/68 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.18)] backdrop-blur-xl md:p-6">
              <div className="mb-6 flex flex-col gap-2 border-b border-white/70 pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#ff7894]">{section.title}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{section.description}</h2>
                </div>
              </div>
              <div className="rounded-[30px] bg-gradient-to-br from-white/70 via-[#fff8fb]/70 to-[#effdfa]/70 px-3 py-8 md:px-6">
                {section.content}
              </div>
            </section>
          ))}

          <section className="rounded-[34px] border border-white/75 bg-white/68 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.18)] backdrop-blur-xl md:p-6">
            <p className="text-sm font-semibold text-[#ff7894]">Dashboard Tooltip</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">首页首次进入气泡提示</h2>
            <div className="mt-6">
              <DashboardTooltipPreview />
            </div>
          </section>

          <section className="rounded-[34px] border border-white/75 bg-white/68 p-4 shadow-[0_20px_60px_rgba(255,208,219,0.18)] backdrop-blur-xl md:p-6">
            <p className="text-sm font-semibold text-[#ff7894]">Empty States</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">无数据页面引导</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <EmptyStateGuide variant="analytics" />
              <EmptyStateGuide variant="music" />
              <EmptyStateGuide variant="discovery" />
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
