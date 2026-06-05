"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { Eye, EyeOff, Lock, Mail, MessageCircle, User } from "lucide-react"
import { CompanionHeroMascot } from "@/components/companion-avatar"
import { useAuthStore } from "@/store/auth"
import { hasCompletedOnboarding } from "@/lib/onboarding"

type Mode = "login" | "register"

const companionHighlights = [
  "先把模糊的情绪接住。",
  "再慢慢整理今天真正卡住的点。",
  "最后把陪伴、趋势和音乐留给你自己选择。",
]

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get("redirect") || "/dashboard"
  const { user, isLoading, error, login, register, clearError } = useAuthStore()

  const [mode, setMode] = useState<Mode>("login")
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState("")
  const [notice, setNotice] = useState("")
  const [successNotice, setSuccessNotice] = useState("")
  const justAuthenticatedRef = useRef(false)

  useEffect(() => {
    if (user && !justAuthenticatedRef.current) {
      router.replace(hasCompletedOnboarding() ? redirectUrl : "/onboarding")
    }
  }, [user, router, redirectUrl])

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setLocalError("")
    setNotice("")
    clearError()
  }

  const showComingSoon = (label: string) => {
    setNotice(`${label} 即将上线，当前请先使用邮箱登录。`)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError("")

    if (!email.includes("@")) {
      setLocalError("请输入有效的邮箱地址")
      return
    }
    if (password.length < 6) {
      setLocalError("密码至少 6 位")
      return
    }
    if (mode === "register" && !username.trim()) {
      setLocalError("请输入用户名")
      return
    }

    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await register(email, username, password)
      }
      justAuthenticatedRef.current = true
      setSuccessNotice(mode === "login" ? "登录成功，正在进入你的情绪空间…" : "注册成功，正在为你打开灵音空间…")
      window.setTimeout(() => {
        router.replace(hasCompletedOnboarding() ? redirectUrl : "/onboarding")
      }, 900)
    } catch {
      // store 持有错误状态
    }
  }

  const displayError = localError || error || ""

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,204,219,0.85),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(181,240,231,0.88),_transparent_24%),radial-gradient(circle_at_bottom_center,_rgba(213,205,255,0.45),_transparent_28%),linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1520px] items-stretch lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden px-10 py-12 lg:flex lg:flex-col">
          <div className="relative z-10 flex items-center gap-4">
            <div className="relative h-20 w-28 shrink-0">
              <Image
                src="/brand/moodwave-logo-mark.png"
                alt=""
                fill
                sizes="112px"
                className="object-contain drop-shadow-[0_14px_24px_rgba(255,151,173,0.26)]"
                priority
              />
            </div>
            <div className="space-y-1.5">
              <p className="font-display text-3xl font-bold text-[#263145]">MoodWave</p>
              <p className="text-sm font-medium text-slate-500">记录情绪的潮汐，遇见内心的风景</p>
            </div>
          </div>

          <div className="pointer-events-none absolute left-10 top-16 h-80 w-80 rounded-full bg-[#ffd2dc]/70 blur-3xl" />
          <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-[#c9fff3]/60 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 bg-[radial-gradient(circle_at_center,_rgba(189,174,255,0.32),_transparent_58%)]" />

          <div className="relative z-10 flex flex-1 flex-col justify-center">
            <div className="max-w-2xl space-y-7">
              <div className="space-y-4">
                <p className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#ff7894] shadow-[0_10px_24px_rgba(255,190,205,0.16)]">
                  先被温柔接住
                </p>
                <h1 className="max-w-[11ch] font-display text-[clamp(2.6rem,4vw,4rem)] font-bold leading-[1.15] tracking-[-0.03em] text-[#121b33]">
                  不用急着解释
                  <span className="block">自己怎么了，</span>
                  <span className="block text-[#ff7894]">先让灵音陪你浮一会儿。</span>
                </h1>
                <p className="max-w-xl text-lg leading-8 text-slate-600">
                  先登录，再把今天的心情交给一个更柔软的入口。你可以从一句话开始，也可以先安静看着它陪你慢慢落地。
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.16fr_0.84fr]">
                <CompanionHeroMascot
                  character="cat"
                  subtitle="这次先把登录页主视觉换成更接近 iOS 原型气质的小灵体宠物，后续再继续补正式 Lottie 动画。"
                />

                <div className="rounded-[34px] border border-white/80 bg-white/74 p-5 shadow-[0_24px_80px_rgba(255,190,205,0.18)] backdrop-blur-2xl">
                  <p className="text-sm font-semibold text-[#ff7894]">登录后你会看到</p>
                  <div className="mt-4 space-y-3">
                    {companionHighlights.map((item, index) => (
                      <div key={item} className="rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f7e2e8]">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-r from-[#ffbfd0] to-[#8de1d5] text-xs font-semibold text-white">
                            {index + 1}
                          </span>
                          <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10 flex max-w-xl items-center gap-3 rounded-full bg-white/58 px-4 py-3 text-sm font-medium text-slate-500 shadow-[0_16px_36px_rgba(255,214,224,0.14)] backdrop-blur-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1f5] text-[#ff7894]">♡</span>
            <span>登录后就能保留聊天历史、伙伴记忆和更完整的陪伴闭环。</span>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 md:px-6">
          <div className="w-full max-w-md rounded-[36px] border border-white/70 bg-white/82 p-6 shadow-[0_24px_80px_rgba(255,201,213,0.3)] backdrop-blur-2xl md:p-8">
            <div className="mb-8 lg:hidden">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <div className="relative h-14 w-20 shrink-0">
                  <Image
                    src="/brand/moodwave-logo-mark.png"
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold tracking-tight text-[#263145]">MoodWave</p>
                  <p className="text-sm font-medium text-slate-500">记录情绪的潮汐</p>
                </div>
              </Link>
            </div>

            <div className="mb-6 flex rounded-full bg-[#fff1f5] p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  mode === "login" ? "bg-white text-[#ff708b] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  mode === "register" ? "bg-white text-[#ff708b] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                注册
              </button>
            </div>

            <div className="text-center">
              <div className="mx-auto inline-flex rounded-full bg-[#fff1f5] px-4 py-2 text-sm text-[#ff708b]">
                {mode === "login" ? "欢迎回来" : "开启你的情绪之旅"}
              </div>
              <h1 className="mt-4 font-display text-[34px] font-bold leading-tight text-slate-900 md:text-4xl">
                {mode === "login" ? "登录你的情绪空间" : "创建你的灵音账号"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {mode === "login"
                  ? "你留下过的情绪、陪伴和节奏，都会从这里继续。"
                  : "只需要几步，就能把你的记录、陪伴和记忆留在这里。"}
              </p>
            </div>

            {displayError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {displayError}
              </div>
            ) : null}
            {successNotice ? (
              <div className="mt-4 rounded-2xl border border-[#d2f5eb] bg-[#effdf7] px-4 py-3 text-sm font-medium text-[#2c7a67]">
                {successNotice}
              </div>
            ) : null}
            {notice ? (
              <div className="mt-4 rounded-2xl border border-[#d6f3ea] bg-[#effdfa] px-4 py-3 text-sm text-slate-600">
                {notice}
              </div>
            ) : null}

            <form className="mt-8 min-h-[310px] space-y-5 transition-all duration-300" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">用户名</span>
                  <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                    <User className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="给自己起个昵称"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </span>
                </label>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">邮箱地址</span>
                <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">密码</span>
                <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] px-6 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(255,181,194,0.3)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登录" : "注册"}
              </button>
            </form>

            <div className="mt-6">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.22em] text-slate-400">更多方式</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "微信登录",
                    icon: (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#07c160] text-white">
                        <MessageCircle className="h-3.5 w-3.5 fill-white" />
                      </span>
                    ),
                  },
                  {
                    label: "Apple 登录",
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M15.53 3.83c.84-1.01 1.4-2.43 1.24-3.83-1.2.05-2.66.81-3.53 1.82-.78.89-1.45 2.33-1.27 3.71 1.34.11 2.72-.68 3.56-1.7Zm3.59 8.23c.03-2.58 2.12-3.82 2.21-3.87-1.21-1.77-3.08-2.01-3.74-2.04-1.59-.16-3.11.94-3.92.94-.81 0-2.04-.92-3.35-.89-1.72.03-3.31 1-4.2 2.55-1.8 3.11-.46 7.71 1.29 10.24.86 1.24 1.88 2.64 3.22 2.59 1.29-.05 1.77-.83 3.33-.83 1.56 0 2 .83 3.36.8 1.39-.02 2.27-1.25 3.12-2.5.98-1.43 1.38-2.82 1.4-2.89-.03-.01-2.68-1.03-2.72-4.1Z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Google 登录",
                    icon: (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => showComingSoon(item.label)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-[20px] border border-[#f3dfe5] bg-white/90 text-sm font-semibold text-slate-600 shadow-[0_10px_24px_rgba(255,220,228,0.12)] transition hover:-translate-y-0.5"
                  >
                    <span>{item.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? "还没有账号？" : "已经有账号了？"}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="ml-2 font-semibold text-[#ff708b] transition hover:text-[#ff567a]"
              >
                {mode === "login" ? "免费注册" : "去登录"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
