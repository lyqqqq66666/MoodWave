"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { hasCompletedOnboarding } from "@/lib/onboarding"

type Mode = "login" | "register"

const moodBullets = [
  { text: "今天终于把拖了很久的事做完了，心里轻了一点。", tone: "pink", top: "14%", duration: 34, delay: 0 },
  { text: "有点累，但听到喜欢的歌以后慢慢安静下来了。", tone: "mint", top: "28%", duration: 38, delay: -12 },
  { text: "我好像只是需要有人说一句：你已经很努力了。", tone: "cream", top: "43%", duration: 42, delay: -22 },
  { text: "和朋友散步之后，心情真的变好很多。", tone: "blue", top: "59%", duration: 36, delay: -7 },
  { text: "今天没有很开心，但我有认真照顾自己。", tone: "lavender", top: "72%", duration: 40, delay: -18 },
  { text: "deadline 前夜有点紧张，不过我开始一点点推进了。", tone: "pink", top: "20%", duration: 44, delay: -28 },
  { text: "想把脑袋里的声音调小一点，先深呼吸三次。", tone: "mint", top: "52%", duration: 39, delay: -31 },
  { text: "谢谢这里，让我可以不用解释太多。", tone: "cream", top: "83%", duration: 35, delay: -16 },
]

const bulletToneClass: Record<string, string> = {
  pink: "border-[#ffdbe4] bg-white/76 text-[#c75f78]",
  mint: "border-[#d7f7ef] bg-[#f6fffc]/78 text-[#218f82]",
  cream: "border-[#fff0c8] bg-[#fffdf2]/80 text-[#9c7a25]",
  blue: "border-[#ddecff] bg-[#f7fbff]/78 text-[#597498]",
  lavender: "border-[#eadfff] bg-[#fbf8ff]/78 text-[#7b65a5]",
}

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

  // 表单字段
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState("")
  const [notice, setNotice] = useState("")

  // 已登录则跳走
  useEffect(() => {
    if (user) {
      router.replace(hasCompletedOnboarding() ? redirectUrl : "/onboarding")
    }
  }, [user, router, redirectUrl])

  // 切换模式时清除状态
  const switchMode = (m: Mode) => {
    setMode(m)
    setLocalError("")
    setNotice("")
    clearError()
  }

  const showComingSoon = (label: string) => {
    setNotice(`${label}即将上线，当前请使用邮箱登录。`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        // 跳转由 useEffect 监听 user 状态统一处理，避免双重重定向崩溃
      } else {
        await register(email, username, password)
        // 跳转由 useEffect 监听 user 状态统一处理
      }
    } catch {
      // error 已由 store 持有，UI 靠 error 状态展示
    }
  }

  const displayError = localError || error || ""

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,200,214,0.8),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(171,236,227,0.8),_transparent_24%),radial-gradient(circle_at_bottom_center,_rgba(203,198,255,0.4),_transparent_24%),linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] items-stretch lg:grid-cols-[1.05fr_0.95fr]">
        {/* 左侧品牌区 */}
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
              <p className="font-display text-3xl font-bold text-[#263145]">
                MoodWave
              </p>
              <p className="text-sm font-medium text-slate-500">
                记录情绪的潮汐，遇见内心的风景
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute left-10 top-16 h-80 w-80 rounded-full bg-[#ffd2dc]/70 blur-3xl" />
          <div className="pointer-events-none absolute right-6 top-10 h-72 w-72 rounded-full bg-[#c9fff3]/60 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-56 bg-[radial-gradient(circle_at_center,_rgba(189,174,255,0.34),_transparent_58%)]" />
          <div className="relative z-10 flex flex-1 flex-col justify-center">
            <div className="max-w-2xl space-y-7">
              <div className="space-y-4">
                <h1 className="max-w-2xl font-display text-5xl font-bold leading-tight text-[#121b33]">
                  今天的感受，会被温柔接住。
                </h1>
                <p className="max-w-xl text-lg leading-8 text-slate-600">
                  写下此刻心情，MoodWave 会为你生成情绪洞察和一段专属的治愈声音。
                </p>
              </div>

              <div className="relative w-full max-w-[640px] overflow-hidden rounded-[36px] border border-white/75 bg-white/62 p-4 shadow-[0_28px_90px_rgba(255,190,205,0.24)] backdrop-blur-2xl">
                <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[#9de8dc]/45 blur-3xl" />
                <div className="absolute -bottom-20 left-8 h-52 w-52 rounded-full bg-[#ffd0db]/55 blur-3xl" />
                <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(255,251,252,0.95),rgba(236,255,250,0.88))] p-6">
                  <div className="relative z-10 flex items-start justify-between gap-5">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#ff7894]">
                        Mood Notes
                      </p>
                      <h2 className="mt-3 max-w-md font-display text-3xl font-bold leading-tight text-[#263145]">
                        这里流过很多真实的心情，也会接住你的这一条。
                      </h2>
                    </div>
                    <div className="hidden rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#20a797] shadow-sm md:block">
                      今日 128 条共鸣
                    </div>
                  </div>

                  <div className="relative mt-7 h-[260px] overflow-hidden rounded-[28px] border border-white/70 bg-white/44 shadow-inner">
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-[#fffbfc] to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-[#f1fffb] to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-white/80 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-gradient-to-t from-white/70 to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_36%,rgba(255,216,226,0.56),transparent_28%),radial-gradient(circle_at_72%_70%,rgba(157,232,220,0.46),transparent_30%)]" />
                    {moodBullets.map((item, index) => (
                      <div
                        key={`${item.text}-${index}`}
                        className={`mood-bullet absolute whitespace-nowrap rounded-full border px-5 py-3 text-sm font-medium shadow-[0_12px_28px_rgba(255,200,214,0.18)] backdrop-blur-xl ${bulletToneClass[item.tone]}`}
                        style={{
                          top: item.top,
                          animationDuration: `${item.duration}s`,
                          animationDelay: `${item.delay}s`,
                        }}
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 mt-5 grid grid-cols-3 gap-3">
                    {["匿名记录", "温柔评论", "情绪共鸣"].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl bg-white/66 px-4 py-3 text-center text-sm font-semibold text-slate-600 shadow-[0_10px_24px_rgba(255,214,224,0.12)]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-8 grid max-w-[610px] grid-cols-3 gap-3">
                {["30 秒记录", "AI 温柔反馈", "一键进入音乐房间"].map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] border border-white/70 bg-white/48 px-4 py-3 text-center text-sm font-semibold text-slate-600 shadow-[0_12px_28px_rgba(255,214,224,0.12)] backdrop-blur-xl"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-12 flex max-w-xl items-center gap-3 rounded-full bg-white/55 px-4 py-3 text-sm font-medium text-slate-500 shadow-[0_16px_36px_rgba(255,214,224,0.14)] backdrop-blur-xl">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1f5] text-[#ff7894]">♡</span>
            <span>先登录，再把今晚的心情交给一段柔软的声音。</span>
          </div>
        </section>

        {/* 右侧表单区 */}
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
                  <p className="font-display text-2xl font-bold tracking-tight text-[#263145]">
                    MoodWave
                  </p>
                  <p className="text-sm font-medium text-slate-500">记录情绪的潮汐</p>
                </div>
              </Link>
            </div>

            {/* 模式切换 Tab */}
            <div className="mb-6 flex rounded-full bg-[#fff1f5] p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  mode === "login"
                    ? "bg-white shadow-sm text-[#ff708b]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  mode === "register"
                    ? "bg-white shadow-sm text-[#ff708b]"
                    : "text-slate-500 hover:text-slate-700"
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
                {mode === "login" ? "登录你的情绪空间" : "创建账号"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {mode === "login"
                  ? "登录后继续你的情绪之旅，今晚的感受会被温柔接住。"
                  : "只需几步，开启你的情绪觉察之旅。"}
              </p>
            </div>

            {/* 错误提示 */}
            {displayError && (
              <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {displayError}
              </div>
            )}
            {notice && (
              <div className="mt-4 rounded-2xl border border-[#d6f3ea] bg-[#effdfa] px-4 py-3 text-sm text-slate-600">
                {notice}
              </div>
            )}

            <form className="mt-8 min-h-[310px] space-y-5 transition-all duration-300" onSubmit={handleSubmit}>
              {/* 用户名（仅注册） */}
              {mode === "register" && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">用户名</span>
                  <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                    <User className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="给自己起个昵称"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </span>
                </label>
              )}

              {/* 邮箱 */}
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">邮箱地址</span>
                <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="hello@moodwave.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>

              {/* 密码 */}
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">密码</span>
                <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)] transition-all duration-300 focus-within:border-[#ff8fa7] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(255,143,167,0.12),0_12px_26px_rgba(255,180,194,0.22)]">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400"
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => showComingSoon("找回密码")}
                    className="text-sm text-slate-500 transition hover:text-[#ff7894]"
                  >
                    忘记密码？
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] text-sm font-semibold text-white shadow-[0_18px_36px_rgba(255,180,194,0.32)] transition hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {mode === "login" ? "登录中..." : "注册中..."}
                  </span>
                ) : (
                  mode === "login" ? "登录" : "注册"
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#f2dde4]" />
              <span className="text-xs text-slate-400">或</span>
              <div className="h-px flex-1 bg-[#f2dde4]" />
            </div>

            <div className="flex items-center justify-center gap-4">
              {[
                {
                  label: "微信登录",
                  content: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                      <path
                        d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.674 2.232c-.095.318.237.586.545.432l2.452-1.24a.82.82 0 0 1 .608-.04c.907.299 1.873.461 2.865.461h.01c.207 0 .414-.006.621-.019-.483-.84-.725-1.794-.725-2.802 0-3.672 3.449-6.676 7.875-6.879C15.344 5.278 12.319 2.188 8.691 2.188Z"
                        fill="#07C160"
                      />
                      <path
                        d="M16.875 9.656c-3.794 0-6.875 2.578-6.875 5.75s3.082 5.75 6.875 5.75c.68 0 1.344-.085 1.977-.244a.603.603 0 0 1 .444.028l1.774.895c.227.115.448-.14.385-.349l-.45-1.484a.568.568 0 0 1 .16-.536c1.365-1.17 2.17-2.72 2.17-4.06 0-3.172-3.08-5.75-6.875-5.75Z"
                        fill="#07C160"
                      />
                      <circle cx="6.125" cy="9.25" r="1.25" fill="#fff" />
                      <circle cx="11.125" cy="9.25" r="1.25" fill="#fff" />
                      <circle cx="14.156" cy="16.25" r="1.063" fill="#fff" />
                      <circle cx="18.75" cy="16.25" r="1.063" fill="#fff" />
                    </svg>
                  ),
                },
                {
                  label: "Apple 登录",
                  content: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                    </svg>
                  ),
                },
                {
                  label: "Google 登录",
                  content: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
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
                  aria-label={item.label}
                  title="即将上线"
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f4dde3] bg-white text-slate-700 shadow-[0_10px_24px_rgba(255,214,224,0.16)] transition hover:-translate-y-0.5"
                >
                  {item.content}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === "login" ? "还没有账号？" : "已有账号？"}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="ml-1 font-semibold text-[#ff7894]"
              >
                {mode === "login" ? "免费注册" : "去登录"}
              </button>
            </p>
          </div>
        </section>
      </div>
      <style jsx>{`
        .mood-bullet {
          left: max(100%, 640px);
          animation-name: moodBulletFlow;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }

        .mood-bullet:nth-child(even) {
          transform: translateX(0) translateY(6px);
        }

        @keyframes moodBulletFlow {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 0;
          }
          8%,
          88% {
            opacity: 0.92;
          }
          100% {
            transform: translateX(calc(-100vw - 760px)) translateY(-6px);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mood-bullet {
            animation: none;
            left: 6%;
            position: relative;
            top: auto !important;
            display: inline-flex;
            margin: 0.4rem;
          }
        }
      `}</style>
    </main>
  )
}
