"use client"

import Link from "next/link"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { useState } from "react"
import { MoodWaveLogo } from "@/components/moodwave-logo"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,200,214,0.8),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(171,236,227,0.8),_transparent_24%),radial-gradient(circle_at_bottom_center,_rgba(203,198,255,0.4),_transparent_24%),linear-gradient(180deg,#fffdfb_0%,#fff5ef_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] items-stretch lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden px-10 py-12 lg:flex lg:flex-col">
          <MoodWaveLogo href="/" />
          <div className="pointer-events-none absolute left-10 top-16 h-80 w-80 rounded-full bg-[#ffd2dc]/70 blur-3xl" />
          <div className="pointer-events-none absolute right-6 top-10 h-72 w-72 rounded-full bg-[#c9fff3]/60 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-[radial-gradient(circle_at_center,_rgba(189,174,255,0.4),_transparent_55%)]" />
          <div className="relative z-10 flex flex-1 flex-col justify-center">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-[32px] bg-white/70 text-5xl shadow-[0_20px_55px_rgba(255,204,214,0.2)] backdrop-blur-xl">
                🌊
              </div>
              <div className="space-y-4">
                <h1 className="font-display text-5xl font-semibold tracking-tight text-slate-900">
                  MoodWave
                </h1>
                <p className="text-lg leading-8 text-slate-600">
                  记录情绪的潮汐，遇见内心的风景。今天不用逞强，先把自己的感受放到一个安全的地方。
                </p>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-auto text-sm text-slate-500">
            ✦ 让每一份情绪都值得被温柔以待
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 md:px-6">
          <div className="w-full max-w-md rounded-[36px] border border-white/70 bg-white/82 p-6 shadow-[0_24px_80px_rgba(255,201,213,0.3)] backdrop-blur-2xl md:p-8">
            <div className="mb-8 lg:hidden">
              <MoodWaveLogo href="/" />
            </div>

            <div className="text-center">
              <div className="mx-auto inline-flex rounded-full bg-[#fff1f5] px-4 py-2 text-sm text-[#ff708b]">
                欢迎回来
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold text-slate-900">
                登录你的情绪空间
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                移动端优先体验已经准备好，今晚的感受可以继续留在这里。
              </p>
            </div>

            <form className="mt-8 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">邮箱地址</span>
                <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)]">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="hello@moodwave.app"
                    className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">密码</span>
                <span className="relative flex min-h-12 items-center rounded-[20px] border border-[#f4dde3] bg-white/90 px-4 shadow-[0_8px_20px_rgba(255,220,228,0.12)]">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    className="ml-3 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-slate-400"
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              <div className="flex justify-end">
                <button type="button" className="text-sm text-slate-500 transition hover:text-[#ff7894]">
                  忘记密码？
                </button>
              </div>

              <Link
                href="/dashboard"
                className="flex min-h-[52px] items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffbfd0] to-[#85dfd4] text-sm font-semibold text-white shadow-[0_18px_36px_rgba(255,180,194,0.32)] transition hover:scale-[1.01]"
              >
                登录
              </Link>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#f2dfe4]" />
              <span className="text-xs text-slate-400">或</span>
              <div className="h-px flex-1 bg-[#f2dfe4]" />
            </div>

            <div className="flex items-center justify-center gap-4">
              {[
                {
                  label: "微信登录",
                  content: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM16.938 8.858c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122z" />
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
                  aria-label={item.label}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f4dde3] bg-white text-slate-700 shadow-[0_10px_24px_rgba(255,214,224,0.16)] transition hover:-translate-y-0.5"
                >
                  {item.content}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              还没有账号？
              <Link href="/" className="ml-1 font-semibold text-[#ff7894]">
                免费注册
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
