"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { HeartHandshake, PenLine, Send, SmilePlus, Sparkles } from "lucide-react"
import { postsAPI } from "@/lib/api"
import { IOSGlassCard } from "@/components/ios/ios-glass-card"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { EmptyStateGuide } from "@/components/onboarding/empty-state-guide"
import { isIOSApp } from "@/lib/platform"
import { cn } from "@/lib/utils"

type Category = "all" | "study" | "emotion" | "vent"
type Post = {
  id: string
  category: Category
  emoji: string
  author: string
  time: string
  content: string
  hugs: number
  comments: number
  tone: string
}
type ApiPost = {
  id: number
  content: string
  category?: Category
  author_label?: string
  likes_count?: number
  comments_count?: number
  created_at?: string
  user_mood_type?: string | null
}

const categories: Array<{ key: Category; label: string }> = [
  { key: "all", label: "全部" },
  { key: "study", label: "学习" },
  { key: "emotion", label: "情感" },
  { key: "vent", label: "树洞" },
]

const moodEmojiMap: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  anxious: "😟",
  angry: "😠",
  sad: "😢",
  neutral: "🙂",
}

const toneList = [
  "from-[#fff7d9] to-[#fff0f5]",
  "from-[#eaf8ff] to-[#f8f0ff]",
  "from-[#effbea] to-[#fff8e8]",
  "from-[#fff0f5] to-[#eefbf8]",
  "from-[#eef6ff] to-[#fff7db]",
  "from-[#f8f4dc] to-[#edf7f3]",
]

function normalize(payload: unknown) {
  const wrapped = payload as { data?: unknown }
  return wrapped?.data ?? payload
}

function formatRelativeTime(value?: string) {
  if (!value) return "刚刚"
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return "刚刚"
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

function mapApiPost(post: ApiPost, index: number): Post {
  return {
    id: String(post.id),
    category: post.category ?? "vent",
    emoji: moodEmojiMap[post.user_mood_type ?? ""] ?? "😊",
    author: post.author_label ?? "匿名用户",
    time: formatRelativeTime(post.created_at),
    content: post.content,
    hugs: post.likes_count ?? 0,
    comments: post.comments_count ?? 0,
    tone: toneList[index % toneList.length],
  }
}

export default function DiscoveryPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("all")
  const [posts, setPosts] = useState<Post[]>([])
  const [composerText, setComposerText] = useState("")
  const [isApiConnected, setIsApiConnected] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const iosApp = isIOSApp()

  const loadPosts = useCallback(async (category: Category) => {
    try {
      const response = await postsAPI.list({
        category,
        page: 1,
        page_size: 30,
      })
      const data = normalize(response.data) as { posts?: ApiPost[] }
      if (Array.isArray(data.posts)) {
        setPosts(data.posts.map(mapApiPost))
        setIsApiConnected(true)
      }
    } catch {
      setPosts([])
      setIsApiConnected(false)
    }
  }, [])

  useEffect(() => {
    loadPosts(activeCategory)
  }, [activeCategory, loadPosts])

  const visiblePosts = useMemo(() => posts, [posts])

  async function hugPost(id: string) {
    setPosts((current) => current.map((post) => (post.id === id ? { ...post, hugs: post.hugs + 1 } : post)))
    if (id.startsWith("p") || id.startsWith("local")) return
    try {
      const response = await postsAPI.like(id)
      const data = normalize(response.data) as { likes_count?: number }
      if (typeof data.likes_count === "number") {
        setPosts((current) => current.map((post) => (post.id === id ? { ...post, hugs: data.likes_count ?? post.hugs } : post)))
      }
    } catch {
      setPosts((current) => current.map((post) => (post.id === id ? { ...post, hugs: Math.max(0, post.hugs - 1) } : post)))
    }
  }

  async function helpPost(id: string) {
    setPosts((current) => current.map((post) => (post.id === id ? { ...post, comments: post.comments + 1 } : post)))
    if (id.startsWith("p") || id.startsWith("local")) return
    try {
      const response = await postsAPI.comment(id, "给你一个温柔的回应。")
      const data = normalize(response.data) as { comments_count?: number }
      if (typeof data.comments_count === "number") {
        setPosts((current) => current.map((post) => (post.id === id ? { ...post, comments: data.comments_count ?? post.comments } : post)))
      }
    } catch {
      setPosts((current) => current.map((post) => (post.id === id ? { ...post, comments: Math.max(0, post.comments - 1) } : post)))
    }
  }

  async function publishLocalPost() {
    const text = composerText.trim()
    if (!text) return
    setIsPosting(true)
    try {
      const response = await postsAPI.create({
        content: text,
        is_anonymous: true,
        category: activeCategory === "all" ? "vent" : activeCategory,
      })
      const data = normalize(response.data) as ApiPost
      setPosts((current) => [mapApiPost(data, 0), ...current])
      setIsApiConnected(true)
    } catch {
      setPosts((current) => [
        {
          id: `local-${Date.now()}`,
          category: activeCategory === "all" ? "vent" : activeCategory,
          emoji: "🌷",
          author: "我",
          time: "刚刚",
          content: text,
          hugs: 0,
          comments: 0,
          tone: "from-[#fff0f5] to-[#effdfa]",
        },
        ...current,
      ])
      setIsApiConnected(false)
    } finally {
      setIsPosting(false)
    }
    setComposerText("")
    setActiveCategory("all")
  }

  return (
    <MoodWaveShell
      title={iosApp ? "解忧" : "解忧角"}
      rightSlot={
        <Link
          href="/mood"
          className="hidden items-center gap-2 rounded-full bg-gradient-to-r from-[#ff91a9] to-[#7edccb] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(255,145,169,0.24)] md:inline-flex"
        >
          <PenLine className="h-4 w-4" />
          发布心情
        </Link>
      }
    >
      <div className={cn("mx-auto grid gap-5", iosApp ? "max-w-[460px] grid-cols-1" : "max-w-6xl lg:grid-cols-[0.95fr_1.45fr]")}>
        <IOSGlassCard className={cn("rounded-[34px] p-5 md:p-6", !iosApp && "lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-5", iosApp && "bg-white/88")}>
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#caf5ee] via-[#fff4df] to-[#ffdce6] text-4xl shadow-[0_16px_34px_rgba(166,224,213,0.24)]">
              🐰
            </div>
            <div>
              <p className="text-xs font-medium text-[#ff7894]">匿名树洞 · 轻社交 · 无压力</p>
              <h2 className="mt-2 text-2xl font-semibold">有什么想说的吗？我在听 😊</h2>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] bg-white/92 p-4 shadow-inner ring-1 ring-[#f8e4e9]">
            <textarea
              value={composerText}
              onChange={(event) => setComposerText(event.target.value.slice(0, 160))}
              placeholder="分享此刻的心情..."
              className="min-h-24 w-full resize-none bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{composerText.length}/160</span>
              <button
                type="button"
                onClick={publishLocalPost}
                disabled={isPosting}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0ede8] text-slate-500 transition hover:bg-gradient-to-r hover:from-[#ff91a9] hover:to-[#7edccb] hover:text-white"
                aria-label="发布本地心情"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {categories.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveCategory(item.key)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm transition",
                  activeCategory === item.key
                    ? "bg-gradient-to-r from-[#ff9fb4] to-[#8de1d5] font-semibold text-white shadow-[0_12px_26px_rgba(255,159,180,0.24)]"
                    : "bg-white text-slate-500 ring-1 ring-[#f4e3e8]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] bg-gradient-to-br from-[#fff7dc] via-[#fff0f5] to-[#effdfa] p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 rounded-2xl bg-white/80 p-2 text-[#ff8fa3]" />
              <div>
                <p className="font-semibold">解忧角规则</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  温柔回应，不评判，不追问隐私。每一句心情都可以慢慢说。
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/mood"
            className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff91a9] to-[#7edccb] px-5 font-semibold text-white shadow-[0_16px_34px_rgba(255,145,169,0.26)] md:hidden"
          >
            <PenLine className="h-4 w-4" />
            发布我的心情
          </Link>
        </IOSGlassCard>

        <section className={cn("min-w-0", !iosApp && "lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2")}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">大家的心情</h3>
              <p className="mt-1 text-sm text-slate-400">
                {isApiConnected ? "实时更新" : "温柔回应，不评判"}
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#ff7894] shadow-sm">
              {visiblePosts.length} 条
            </span>
          </div>

          {visiblePosts.length === 0 ? (
            <EmptyStateGuide variant="discovery" />
          ) : (
          <div className={cn("columns-1 gap-5", !iosApp && "md:columns-2 xl:columns-3")}>
            {visiblePosts.map((post, index) => (
              <article
                key={post.id}
                className={cn(
                  "mb-5 break-inside-avoid rounded-[28px] bg-white/84 p-4 shadow-[0_18px_44px_rgba(255,216,225,0.18)] ring-1 ring-white/75 transition hover:-translate-y-1",
                  index % 3 === 1 && "md:mt-8",
                )}
              >
                <div className={cn("rounded-[24px] bg-gradient-to-br p-4", post.tone)}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/78 text-2xl shadow-sm">
                      {post.emoji}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{post.author}</p>
                      <p className="text-xs text-slate-400">{post.time}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700">{post.content}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => hugPost(post.id)}
                    className="flex min-h-10 items-center gap-2 rounded-full bg-[#fff3f6] px-4 text-sm font-medium text-[#ff708b] transition hover:bg-[#ffe9ef]"
                  >
                    <HeartHandshake className="h-4 w-4" />
                    抱抱 {post.hugs}
                  </button>
                  <button
                    type="button"
                    onClick={() => helpPost(post.id)}
                    className="flex min-h-10 items-center gap-2 rounded-full bg-[#f3fbf8] px-4 text-sm font-medium text-[#4fbdae] transition hover:bg-[#e8f8f4]"
                  >
                    <SmilePlus className="h-4 w-4" />
                    帮助 {post.comments}
                  </button>
                </div>
              </article>
            ))}
          </div>
          )}
        </section>
      </div>
    </MoodWaveShell>
  )
}
