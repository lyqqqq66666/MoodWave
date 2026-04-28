"use client"

import { useState } from "react"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"
import { GlassOrbs } from "./glass-orbs"

export function LoginCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  return (
    <div className="relative w-full max-w-md px-4">
      {/* Glass Orbs floating around the card */}
      <GlassOrbs />

      {/* Card with frosted glass effect and colored glow shadow */}
      <div
        className="relative z-20 overflow-hidden rounded-3xl border border-white/40 px-8 py-10 md:px-10 md:py-12"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow:
            '0 8px 60px rgba(183,148,224,0.12), 0 4px 30px rgba(125,200,240,0.08), 0 2px 15px rgba(245,180,160,0.06)',
        }}
      >
        {/* Inner glow highlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(183,148,224,0.03) 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-2 text-center">
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              MoodWave
            </h1>
          </div>

          {/* Subtitle */}
          <p className="mb-8 text-center text-sm leading-relaxed text-muted-foreground md:text-base">
            记录情绪的潮汐，遇见内心的风景
          </p>

          {/* Login Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
            }}
            className="space-y-5"
          >
            {/* Email field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground/80"
              >
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@moodwave.app"
                  className="w-full rounded-xl border border-white/50 bg-white/50 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-lilac/30 focus:outline-none focus:ring-2 focus:ring-lilac/20 transition-all"
                  style={{
                    backdropFilter: 'blur(8px)',
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground/80"
              >
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full rounded-xl border border-white/50 bg-white/50 py-3 pl-10 pr-12 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-lilac/30 focus:outline-none focus:ring-2 focus:ring-lilac/20 transition-all"
                  style={{
                    backdropFilter: 'blur(8px)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-muted-foreground/70 hover:text-lilac transition-colors"
              >
                忘记密码？
              </button>
            </div>

            {/* Login button - capsule shaped with gradient and inner glow */}
            <button
              type="submit"
              className="relative w-full overflow-hidden rounded-full py-3.5 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              style={{
                background:
                  'linear-gradient(135deg, hsl(262, 60%, 65%) 0%, hsl(199, 80%, 68%) 50%, hsl(15, 70%, 75%) 100%)',
                boxShadow:
                  '0 4px 20px rgba(183,148,224,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <span className="relative z-10">登 录</span>
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-foreground/5" />
            <span className="text-xs text-muted-foreground/50">或</span>
            <div className="h-px flex-1 bg-foreground/5" />
          </div>

          {/* Social login options */}
          <div className="flex justify-center gap-4">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/50 bg-white/40 text-muted-foreground/60 transition-all hover:bg-white/60 hover:text-foreground"
              aria-label="使用微信登录"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-2.18 2.768c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.553 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/50 bg-white/40 text-muted-foreground/60 transition-all hover:bg-white/60 hover:text-foreground"
              aria-label="使用Apple登录"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/50 bg-white/40 text-muted-foreground/60 transition-all hover:bg-white/60 hover:text-foreground"
              aria-label="使用Google登录"
              style={{ backdropFilter: 'blur(8px)' }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </button>
          </div>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-muted-foreground/60">
            还没有账号？
            <button
              type="button"
              className="ml-1 font-medium text-lilac hover:text-lilac/80 transition-colors"
            >
              免费注册
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
