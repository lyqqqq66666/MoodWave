"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Brain, Check, Loader2, MessageCircleHeart, Palette, Send, Sparkles } from "lucide-react"
import { aiAPI, authAPI, companionAPI } from "@/lib/api"
import { MoodWaveShell } from "@/components/moodwave-shell"
import {
  CompanionAvatar,
  companionCharacters,
  companionColors,
  getCompanionCharacter,
  normalizeCompanionCharacter,
  type CompanionCharacter,
  type CompanionColor,
} from "@/components/companion-avatar"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import type { MoodType } from "@/lib/types"

type TabKey = "chat" | "dress" | "memory"
type ChatMessage = {
  id: string
  role: "assistant" | "user"
  content: string
}
type SSEMessage = {
  type?: "text" | "done" | "error"
  content?: string
}
type CompanionMemory = {
  id: string
  content: string
}
type MemoriesPayload = {
  memories?: unknown[]
  source?: "ai" | "rules" | "empty"
  character?: string
  mbti?: string
  zodiac?: string
}

const tabs: { key: TabKey; label: string; icon: typeof MessageCircleHeart }[] = [
  { key: "chat", label: "对话", icon: MessageCircleHeart },
  { key: "dress", label: "装扮", icon: Palette },
  { key: "memory", label: "记忆", icon: Brain },
]

const starterMessages: ChatMessage[] = [
  {
    id: "hello",
    role: "assistant",
    content: "今天感觉怎么样？我会慢慢听，也可以帮你把事情拆小一点。",
  },
  {
    id: "care",
    role: "assistant",
    content: "如果你现在还说不清，也可以只发一个关键词，比如「考试」「失眠」「开心」。",
  },
]

function inferMood(text: string): MoodType {
  if (/开心|顺利|高兴|快乐|兴奋/.test(text)) return "happy"
  if (/焦虑|紧张|考试|deadline|来不及/.test(text)) return "anxious"
  if (/生气|烦|火大|愤怒/.test(text)) return "angry"
  if (/难过|失落|哭|低落|累/.test(text)) return "sad"
  if (/平静|放松|还好/.test(text)) return "calm"
  return "neutral"
}

export default function CompanionPage() {
  const { user, token, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabKey>("chat")
  const [character, setCharacter] = useState<CompanionCharacter>(normalizeCompanionCharacter(user?.avatar_character))
  const [color, setColor] = useState<CompanionColor>((user?.character_color as CompanionColor) || "pink")
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages)
  const [memories, setMemories] = useState<CompanionMemory[]>([])
  const [isMemoryLoading, setIsMemoryLoading] = useState(true)
  const [memoryNotice, setMemoryNotice] = useState("")
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [notice, setNotice] = useState("")

  const latestMood = useMemo(() => inferMood(messages[messages.length - 1]?.content || ""), [messages])
  const companion = getCompanionCharacter(character)
  const serverCharacter = character === "planet" ? "star" : character

  useEffect(() => {
    setCharacter(normalizeCompanionCharacter(user?.avatar_character))
    setColor((user?.character_color as CompanionColor) || "pink")
  }, [user?.avatar_character, user?.character_color])

  useEffect(() => {
    let active = true

    async function loadMemories() {
      setIsMemoryLoading(true)
      setMemoryNotice("")
      try {
        const response = await companionAPI.memories()
        if (!active) return
        const payload = (response.data?.data ?? response.data) as MemoriesPayload | unknown[]
        const payloadRecord = Array.isArray(payload) ? undefined : payload
        const rows = Array.isArray(payloadRecord?.memories) ? payloadRecord.memories : Array.isArray(payload) ? payload : []
        setMemories(
          rows.map((item: unknown, index: number) => ({
            id: `memory-${index}`,
            content: typeof item === "string" ? item : String((item as { content?: string; text?: string })?.content || (item as { text?: string })?.text || ""),
          })).filter((item: CompanionMemory) => item.content.trim()),
        )
        updateUser({
          avatar_character: payloadRecord?.character || user?.avatar_character,
          mbti: payloadRecord?.mbti ?? user?.mbti,
          zodiac: payloadRecord?.zodiac ?? user?.zodiac,
        })
      } catch {
        if (!active) return
        setMemories([])
        setMemoryNotice("记忆同步暂时没有成功，等接口恢复后这里会自动刷新。")
      } finally {
        if (active) setIsMemoryLoading(false)
      }
    }

    loadMemories()
    return () => {
      active = false
    }
  }, [updateUser, user?.avatar_character, user?.mbti, user?.zodiac])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: text }
    const assistantId = `assistant-${Date.now()}`
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "" }])
    setInput("")
    setIsStreaming(true)
    setNotice("")

    // AbortController：30 秒超时防止无限等待
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000)

    try {
      const response = await fetch(aiAPI.chatUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          mood_type: inferMood(text),
          intensity: 5,
          tags: [],
          history: messages.slice(-8).map((item) => ({ role: item.role, content: item.content })),
          avatar_character: serverCharacter,
          mbti: user?.mbti || "",
          zodiac: user?.zodiac || "",
        }),
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) throw new Error("companion stream unavailable")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streamedText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""

        for (const eventChunk of events) {
          const dataLine = eventChunk
            .split("\n")
            .map((line) => line.trim())
            .find((line) => line.startsWith("data:"))
          if (!dataLine) continue

          let payload: SSEMessage
          try {
            payload = JSON.parse(dataLine.replace(/^data:\s*/, "")) as SSEMessage
          } catch {
            continue // 跳过无法解析的 SSE 行
          }

          if (payload.type === "text" && payload.content) {
            streamedText += payload.content
            setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: streamedText } : item))
          }
          if (payload.type === "error") throw new Error(payload.content || "stream error")
          if (payload.type === "done") {
            clearTimeout(timeoutId)
            return
          }
        }
      }
      clearTimeout(timeoutId)
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setNotice("AI 响应超时，已切换成本地陪伴回应。")
      } else {
        setNotice("AI 流式接口暂时不可用，已切换成本地陪伴回应。")
      }
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? { ...item, content: "我先用本地模式陪你一下：把这件事写成一句最小的问题，我们一起从最容易的一步开始。" }
            : item,
        ),
      )
    } finally {
      clearTimeout(timeoutId)
      setIsStreaming(false)
    }
  }

  async function saveLook(nextCharacter = character, nextColor = color) {
    setCharacter(nextCharacter)
    setColor(nextColor)
    updateUser({ avatar_character: nextCharacter, character_color: nextColor })
    try {
      if (token) {
        const response = await authAPI.updateMe(token, {
          avatar_character: nextCharacter === "planet" ? "star" : nextCharacter,
          mbti: user?.mbti || undefined,
          zodiac: user?.zodiac || undefined,
        })
        const payload = response.data?.data ?? response.data
        updateUser({ ...payload, character_color: nextColor })
      }
    } catch {
      setNotice("伙伴造型已先保存在本地，稍后会再同步到账号。")
    }
  }

  return (
    <MoodWaveShell title="灵音伙伴">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.88fr_1.12fr]">
        <section className="rounded-[36px] bg-white/84 p-6 text-center shadow-[0_22px_70px_rgba(255,206,216,0.22)] ring-1 ring-white/75">
          <div className="mx-auto w-fit rounded-[48px] bg-gradient-to-br from-[#fff7f9] to-[#effdfa] p-5">
            <CompanionAvatar character={character} color={color} mood={latestMood} size="lg" />
          </div>
          <div className="mt-5">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#fff4f7] px-4 py-2 text-sm font-medium text-[#ff718b]">
              <Sparkles className="h-4 w-4" />
              {companion.tagline}
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900">{companion.name}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">{companion.personality}</p>
          </div>
          <div className="mt-6 rounded-[28px] bg-white/86 p-4 text-left ring-1 ring-[#f8e7eb]">
            <p className="text-xs font-semibold text-slate-400">今日问候</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              “{user?.username || "你"}，今天感觉怎么样？我在这里，可以可爱一点，也可以理性一点。”
            </p>
          </div>
        </section>

        <section className="min-w-0 rounded-[36px] bg-white/84 p-4 shadow-[0_22px_70px_rgba(255,206,216,0.2)] ring-1 ring-white/75 md:p-5">
          <div className="grid grid-cols-3 gap-2 rounded-[28px] bg-[#fff7f9] p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn("flex min-h-11 items-center justify-center gap-2 rounded-[22px] text-sm font-medium transition", active ? "bg-white text-[#ff718b] shadow-sm" : "text-slate-500")}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === "chat" ? (
            <div className="mt-4 flex min-h-[560px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-[30px] bg-gradient-to-br from-[#fffafb] to-[#f2fffb] p-4">
                {messages.map((message) => {
                  const fromAssistant = message.role === "assistant"
                  const isTyping = fromAssistant && isStreaming && !message.content
                  return (
                    <div key={message.id} className={cn("flex gap-3", fromAssistant ? "justify-start" : "justify-end")}>
                      {fromAssistant ? <CompanionAvatar character={character} color={color} mood={latestMood} size="sm" /> : null}
                      <div className={cn("max-w-[78%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm", fromAssistant ? "bg-white text-slate-700" : "bg-[#ff9fb4] text-white")}>
                        {message.content ? (
                          message.content
                        ) : isTyping ? (
                          <span className="inline-flex items-center gap-1 text-slate-400" aria-label="伙伴正在输入">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#ff9fb4]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#ffb8c8] [animation-delay:120ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8de1d5] [animation-delay:240ms]" />
                          </span>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {notice ? <p className="mt-3 rounded-[18px] bg-[#fff4df] px-4 py-2 text-xs text-slate-600">{notice}</p> : null}
              <form onSubmit={handleSend} className="mt-4 flex gap-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="输入想说的话..."
                  className="min-h-12 min-w-0 flex-1 rounded-full border border-[#f0dbe2] bg-white px-4 text-sm outline-none transition focus:border-[#ff9fb4]"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,181,194,0.28)] disabled:cursor-wait disabled:opacity-60"
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isStreaming ? "发送中" : "发送"}
                </button>
              </form>
            </div>
          ) : null}

          {activeTab === "dress" ? (
            <div className="mt-5 grid gap-5">
              <div>
                <h3 className="font-semibold text-slate-900">选择伙伴形象</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {companionCharacters.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void saveLook(item.id, color)}
                      className={cn("flex items-center gap-3 rounded-[26px] bg-white/88 p-4 text-left ring-1 ring-[#f8e7eb] transition hover:-translate-y-0.5", character === item.id && "ring-2 ring-[#ffb5c2]")}
                    >
                      <CompanionAvatar character={item.id} color={color} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">{item.name}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{item.tagline}</span>
                      </span>
                      {character === item.id ? <Check className="h-4 w-4 text-[#ff7894]" /> : null}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">选择配色</h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {companionColors.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void saveLook(character, item.id)}
                      className={cn("flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-[#f8e7eb]", color === item.id && "ring-2 ring-[#ffb5c2]")}
                    >
                      <span className={cn("h-5 w-5 rounded-full", item.chip)} />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "memory" ? (
            <div className="mt-5">
              <div className="rounded-[30px] bg-gradient-to-br from-[#fff7f9] to-[#effdfa] p-5">
                <h3 className="font-semibold text-slate-900">伙伴记住的小线索</h3>
                <p className="mt-1 text-sm text-slate-500">来自你的情绪历史和灵音伙伴的长期观察。</p>
              </div>
              {memoryNotice ? <p className="mt-3 rounded-[18px] bg-[#fff4df] px-4 py-2 text-xs text-slate-600">{memoryNotice}</p> : null}
              <div className="mt-4 space-y-3">
                {isMemoryLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex gap-3 rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e7eb]">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[#effdfa]" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 w-11/12 animate-pulse rounded-full bg-[#f2e8ed]" />
                        <div className="h-3 w-7/12 animate-pulse rounded-full bg-[#edf8f5]" />
                      </div>
                    </div>
                  ))
                ) : null}
                {!isMemoryLoading && memories.length === 0 ? (
                  <div className="rounded-[26px] bg-white/88 p-4 text-sm leading-6 text-slate-600 ring-1 ring-[#f8e7eb]">
                    伙伴还没有形成稳定记忆。多记录几次心情后，这里会慢慢长出你的专属线索。
                  </div>
                ) : null}
                {!isMemoryLoading && memories.map((memory, index) => (
                  <div key={memory.id} className="flex gap-3 rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e7eb]">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#effdfa] text-sm font-semibold text-[#2d8f78]">{index + 1}</span>
                    <p className="text-sm leading-6 text-slate-700">{memory.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </MoodWaveShell>
  )
}
