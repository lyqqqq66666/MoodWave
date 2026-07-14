"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import axios from "axios"
import { API_URL } from "@/lib/api"

export interface AuthUser {
  id: number
  email: string
  username: string
  avatar_url?: string | null
  mbti?: string | null
  zodiac?: string | null
  avatar_character?: string | null
  character_color?: string | null
  email_verified?: boolean
  email_verified_at?: string | null
  created_at: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  error: string | null

  // Actions
  sendEmailCode: (email: string, purpose: "register" | "login") => Promise<void>
  register: (email: string, username: string, password: string, confirmPassword: string, code: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithCode: (email: string, code: string) => Promise<void>
  logout: () => void
  clearError: () => void
  fetchMe: () => Promise<void>
  updateUser: (patch: Partial<AuthUser>) => void
}

// Cookie 名（与 middleware 同步）
const AUTH_COOKIE = "moodwave_token"

// 写 / 删认证 cookie（供 Next.js middleware 读取）
function setAuthCookie(token: string) {
  if (typeof document === "undefined") return
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

function clearAuthCookie() {
  if (typeof document === "undefined") return
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      sendEmailCode: async (email, purpose) => {
        set({ isLoading: true, error: null })
        try {
          await axios.post(`${API_URL}/api/auth/email-code`, {
            email,
            purpose,
          })
          set({ isLoading: false })
        } catch (err: any) {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.msg ||
            "验证码发送失败，请稍后重试"
          set({ error: msg, isLoading: false })
          throw err
        }
      },

      register: async (email, username, password, confirmPassword, code) => {
        set({ isLoading: true, error: null })
        try {
          const res = await axios.post(`${API_URL}/api/auth/register`, {
            email,
            username,
            password,
            confirm_password: confirmPassword,
            code,
          })
          const { access_token, user } = res.data.data
          setAuthCookie(access_token)
          set({ user, token: access_token, isLoading: false })
        } catch (err: any) {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.msg ||
            "注册失败，请重试"
          set({ error: msg, isLoading: false })
          throw err
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password,
          })
          const { access_token, user } = res.data.data
          setAuthCookie(access_token)
          set({ user, token: access_token, isLoading: false })
        } catch (err: any) {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.msg ||
            "登录失败，请检查邮箱和密码"
          set({ error: msg, isLoading: false })
          throw err
        }
      },

      loginWithCode: async (email, code) => {
        set({ isLoading: true, error: null })
        try {
          const res = await axios.post(`${API_URL}/api/auth/login/code`, {
            email,
            code,
          })
          const { access_token, user } = res.data.data
          setAuthCookie(access_token)
          set({ user, token: access_token, isLoading: false })
        } catch (err: any) {
          const msg =
            err.response?.data?.detail ||
            err.response?.data?.msg ||
            "验证码登录失败，请检查邮箱和验证码"
          set({ error: msg, isLoading: false })
          throw err
        }
      },

      logout: () => {
        clearAuthCookie()
        set({ user: null, token: null, error: null })
      },

      clearError: () => {
        set({ error: null })
      },

      fetchMe: async () => {
        const { token } = get()
        if (!token) return
        try {
          const res = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          set({ user: res.data.data })
        } catch {
          clearAuthCookie()
          set({ user: null, token: null })
        }
      },

      updateUser: (patch) => {
        const { user } = get()
        if (!user) return
        set({ user: { ...user, ...patch } })
      },
    }),
    {
      name: "moodwave-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)

export const getToken = () => useAuthStore.getState().token
