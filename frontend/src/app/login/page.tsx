"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Eye, EyeOff, KeyRound, Lock, Mail, User } from "lucide-react"
import { CompanionPetOrb } from "@/components/companion-avatar"
import { useAuthStore } from "@/store/auth"
import { hasCompletedOnboarding } from "@/lib/onboarding"

type Mode = "login" | "register"
type LoginMethod = "password" | "code"

const showcaseScreens = [
  {
    title: "治愈音乐工作台",
    image: "/showcase/music-v2-workstation.png",
  },
  {
    title: "情绪总览",
    image: "/showcase/mood-v2-overview.png",
  },
  {
    title: "身体感受地图",
    image: "/showcase/mood-v2-body-map.png",
  },
  {
    title: "意象情绪记录",
    image: "/showcase/mood-v2-imagery.png",
  },
]

const showcaseLayers = [
  { x: 0, y: 18, scale: 1, rotate: -2, zIndex: 40, opacity: 1 },
  { x: 200, y: -82, scale: 0.72, rotate: 4, zIndex: 30, opacity: 0.5 },
  { x: 154, y: 142, scale: 0.62, rotate: 1.5, zIndex: 20, opacity: 0.38 },
  { x: -42, y: -90, scale: 0.68, rotate: -3.5, zIndex: 25, opacity: 0.48 },
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
  const { user, isLoading, error, sendEmailCode, login, loginWithCode, register, clearError } = useAuthStore()

  const [mode, setMode] = useState<Mode>("login")
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password")
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [emailCode, setEmailCode] = useState("")
  const [codeCountdown, setCodeCountdown] = useState(0)
  const [activeShowcase, setActiveShowcase] = useState(0)
  const [localError, setLocalError] = useState("")
  const [notice, setNotice] = useState("")
  const [successNotice, setSuccessNotice] = useState("")
  const justAuthenticatedRef = useRef(false)

  const switchShowcase = (direction: -1 | 1) => {
    setActiveShowcase((current) => (current + direction + showcaseScreens.length) % showcaseScreens.length)
  }

  useEffect(() => {
    if (user && !justAuthenticatedRef.current) {
      router.replace(hasCompletedOnboarding() ? redirectUrl : "/onboarding")
    }
  }, [user, router, redirectUrl])

  useEffect(() => {
    if (codeCountdown <= 0) return
    const timer = window.setTimeout(() => {
      setCodeCountdown((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [codeCountdown])

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setLocalError("")
    setNotice("")
    setSuccessNotice("")
    setEmailCode("")
    setPassword("")
    setConfirmPassword("")
    clearError()
  }

  const switchLoginMethod = (nextMethod: LoginMethod) => {
    setLoginMethod(nextMethod)
    setLocalError("")
    setNotice("")
    setSuccessNotice("")
    clearError()
  }

  const validateEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError("请输入有效的邮箱地址")
      return false
    }
    return true
  }

  const handleSendCode = async () => {
    setLocalError("")
    setNotice("")
    setSuccessNotice("")
    clearError()
    if (!validateEmail()) return

    try {
      await sendEmailCode(email, mode === "register" ? "register" : "login")
      setCodeCountdown(60)
      setNotice("验证码已发送，请去邮箱查收。")
    } catch {
      // store 持有错误状态
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError("")
    setNotice("")

    if (!validateEmail()) return
    if (mode === "register" && !username.trim()) {
      setLocalError("请输入用户名")
      return
    }
    if (mode === "register" || loginMethod === "password") {
      if (password.length < 6) {
        setLocalError("密码至少 6 位")
        return
      }
    }
    if (mode === "register" && password !== confirmPassword) {
      setLocalError("两次输入的密码不一致")
      return
    }
    if ((mode === "register" || loginMethod === "code") && !/^\d{6}$/.test(emailCode.trim())) {
      setLocalError("请输入 6 位邮箱验证码")
      return
    }

    try {
      if (mode === "login") {
        if (loginMethod === "password") {
          await login(email, password)
        } else {
          await loginWithCode(email, emailCode)
        }
      } else {
        await register(email, username, password, confirmPassword, emailCode)
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
    <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,204,219,0.85),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(181,240,231,0.88),_transparent_24%),radial-gradient(circle_at_bottom_center,_rgba(213,205,255,0.45),_transparent_28%),linear-gradient(180deg,#fffdfb_0%,#fff6ef_100%)]">
      <div className="mx-auto grid h-full max-w-[1480px] items-stretch lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden px-7 py-5 lg:grid lg:grid-rows-[auto_1fr]">
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative h-16 w-24 shrink-0">
              <Image
                src="/brand/moodwave-logo-mark.png"
                alt=""
                fill
                sizes="96px"
                className="object-contain drop-shadow-[0_14px_24px_rgba(255,151,173,0.26)]"
                priority
              />
            </div>
            <div className="space-y-1">
              <p className="font-display text-[2rem] font-bold text-[#263145]">MoodWave</p>
              <p className="text-[13px] font-medium text-slate-500">记录情绪的潮汐，遇见内心的风景</p>
            </div>
          </div>

          <div className="pointer-events-none absolute left-10 top-16 h-80 w-80 rounded-full bg-[#ffd2dc]/70 blur-3xl" />
          <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-[#c9fff3]/60 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-4rem] left-10 right-0 h-72 bg-[radial-gradient(circle_at_center,_rgba(189,174,255,0.28),_transparent_58%)]" />
          <div className="pointer-events-none absolute right-[-40px] top-24 z-[5] h-72 w-72 rounded-full bg-[#fffdfb]/62 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 right-[-20px] z-[5] h-80 w-64 rounded-full bg-[#fff5ef]/48 blur-3xl" />

          <div className="relative z-10 min-h-0">
            <div className="relative h-full min-h-[620px]">
              {showcaseScreens.map((screen, index) => {
                const layer = showcaseLayers[(index - activeShowcase + showcaseScreens.length) % showcaseScreens.length]
                const isActive = index === activeShowcase

                return (
                  <button
                    key={screen.image}
                    type="button"
                    onMouseEnter={() => setActiveShowcase(index)}
                    onFocus={() => setActiveShowcase(index)}
                    aria-label={`查看${screen.title}`}
                    className="absolute left-[1%] top-[18%] aspect-[16/10] w-[96%] max-w-[980px] overflow-hidden rounded-[32px] border border-white/78 bg-white/72 shadow-[0_34px_105px_rgba(255,181,194,0.3)] outline-none backdrop-blur-xl transition-all duration-500 ease-out focus-visible:ring-4 focus-visible:ring-[#ffb6c8]/35"
                    style={{
                      transform: `translate3d(${layer.x}px, ${layer.y}px, 0) rotate(${layer.rotate}deg) scale(${layer.scale})`,
                      zIndex: layer.zIndex,
                      opacity: layer.opacity,
                    }}
                  >
                    <Image
                      src={screen.image}
                      alt={screen.title}
                      fill
                      sizes="(min-width: 1024px) 48vw, 100vw"
                      className="object-cover"
                      priority={isActive}
                    />
                    <span className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/55" />
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => switchShowcase(-1)}
                className="absolute left-[-8px] top-[49%] z-50 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/84 text-[#ff7894] shadow-[0_14px_30px_rgba(255,181,194,0.24)] ring-1 ring-white/75 backdrop-blur-xl transition hover:-translate-x-0.5 hover:bg-white"
                aria-label="上一张界面"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => switchShowcase(1)}
                className="absolute right-[-4px] top-[49%] z-50 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/84 text-[#ff7894] shadow-[0_14px_30px_rgba(255,181,194,0.24)] ring-1 ring-white/75 backdrop-blur-xl transition hover:translate-x-0.5 hover:bg-white"
                aria-label="下一张界面"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-[-1px] left-[47%] z-50 flex -translate-x-1/2 items-center gap-2.5">
                {showcaseScreens.map((screen, index) => (
                  <button
                    key={screen.title}
                    type="button"
                    onMouseEnter={() => setActiveShowcase(index)}
                    onFocus={() => setActiveShowcase(index)}
                    onClick={() => setActiveShowcase(index)}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      index === activeShowcase ? "bg-[#ff7f96]" : "bg-white/86 shadow-sm ring-1 ring-white/70"
                    }`}
                    aria-label={`切换到${screen.title}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-20 flex h-full items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 lg:overflow-visible lg:py-4">
          <div className="pointer-events-none absolute right-[-14px] top-[11%] z-30 hidden lg:block">
            <CompanionPetOrb character="planet" color="blue" size="md" className="scale-[0.9]" />
          </div>
          <div className="w-full max-w-sm rounded-[30px] border border-white/70 bg-white/84 p-5 shadow-[0_20px_64px_rgba(255,201,213,0.26)] backdrop-blur-2xl md:p-6">
            <div className="mb-5 lg:hidden">
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

            <div className="mb-4 flex rounded-full bg-[#fff1f5] p-1">
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
              <div className="mx-auto inline-flex rounded-full bg-[#fff1f5] px-3.5 py-1.5 text-xs font-semibold text-[#ff708b]">
                {mode === "login" ? "欢迎回来" : "开启你的情绪之旅"}
              </div>
              <h1 className="mt-3 font-display text-[28px] font-bold leading-tight text-slate-900 md:text-[32px]">
                {mode === "login" ? "登录你的情绪空间" : "创建你的灵音账号"}
              </h1>
              <p className="mt-2 text-[13px] leading-5 text-slate-500">
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

            {mode === "login" ? (
              <div className="mt-4 grid grid-cols-2 rounded-full bg-[#fff1f5] p-1">
                <button
                  type="button"
                  onClick={() => switchLoginMethod("password")}
                  className={`rounded-full py-2 text-sm font-medium transition-all ${
                    loginMethod === "password" ? "bg-white text-[#ff708b] shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  密码登录
                </button>
                <button
                  type="button"
                  onClick={() => switchLoginMethod("code")}
                  className={`rounded-full py-2 text-sm font-medium transition-all ${
                    loginMethod === "code" ? "bg-white text-[#ff708b] shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  验证码登录
                </button>
              </div>
            ) : null}

            <form className="mt-5 space-y-3 transition-all duration-300" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-slate-700">用户名</span>
                  <span className="relative flex min-h-11 items-center rounded-[18px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
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
                <span className="text-xs font-semibold text-slate-700">邮箱地址</span>
                <span className="relative flex min-h-11 items-center rounded-[18px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
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

              {mode === "register" || loginMethod === "password" ? (
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-slate-700">密码</span>
                  <span className="relative flex min-h-11 items-center rounded-[18px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
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
              ) : null}

              {mode === "register" ? (
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-slate-700">确认密码</span>
                  <span className="relative flex min-h-11 items-center rounded-[18px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="请再次输入密码"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </span>
                </label>
              ) : null}

              {mode === "register" || loginMethod === "code" ? (
                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-slate-700">邮箱验证码</span>
                  <span className="relative flex min-h-11 items-center rounded-[18px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6 位验证码"
                      value={emailCode}
                      onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={isLoading || codeCountdown > 0}
                      className="shrink-0 rounded-full bg-[#fff1f5] px-3 py-1.5 text-xs font-semibold text-[#ff708b] transition hover:bg-[#ffe6ed] disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {codeCountdown > 0 ? `${codeCountdown}s` : "获取验证码"}
                    </button>
                  </span>
                </label>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] px-6 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(255,181,194,0.3)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登录" : "注册并登录"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
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
