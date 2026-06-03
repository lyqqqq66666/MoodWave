"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Brain, Check, ChevronDown, Edit3, History, Loader2, MessageCircleHeart, MessageSquarePlus, MoreVertical, Music2, Palette, RefreshCw, Send, Sparkles, Trash2, X } from "lucide-react"
import { aiAPI, authAPI, companionAPI } from "@/lib/api"
import { IOSGlassCard } from "@/components/ios/ios-glass-card"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { useAuthGuard } from "@/hooks/useAuthGuard"
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
import { isIOSApp } from "@/lib/platform"
import type { MoodType } from "@/lib/types"

type TabKey = "chat" | "dress" | "memory"
type ChatMessage = {
  id: string
  role: "assistant" | "user"
  content: string
  created_at?: string
  music_recommendation?: AgentMusicRecommendation
  nodes_executed?: string[]
}
type CompanionConversation = {
  id: number
  title: string
  character: string
  created_at: string
  updated_at?: string
  message_count?: number
}
type StoredCompanionMessage = {
  id: number
  conversation_id: number
  role: "assistant" | "user" | "system"
  content: string
  mood_type?: MoodType | null
  created_at: string
}
type SSEMessage = {
  type?: "text" | "status" | "music" | "done" | "error"
  content?: string | AgentMusicRecommendation | AgentDonePayload
}
type AgentMusicRecommendation = {
  mood?: string
  bpm?: number
  energy?: string
  texture?: string
  style?: string
  intensity_adjusted?: boolean
}
type AgentDonePayload = {
  reply?: string
  mood_type?: string
  music_recommendation?: AgentMusicRecommendation
  memory_refs?: number[]
  agent_status?: string
  nodes_executed?: string[]
  assistant_message_id?: number
  assistant_created_at?: string
}
type AgentStatusPayload = {
  langgraph_available?: boolean
  agent_version?: string
  nodes?: string[]
}
type CompanionMemory = {
  id: string
  rawId?: number
  content: string
  source?: string
  memory_type?: string
  mood_context?: string | null
  tags?: string[]
  created_at?: string
  updated_at?: string
}
type MemoriesPayload = {
  memories?: unknown[]
  source?: "ai" | "rules" | "empty"
  character?: string
  mbti?: string
  zodiac?: string
}
type GreetingPayload = {
  greeting?: string
  starter_messages?: unknown[]
  source?: "today_mood" | "character" | "fallback"
  mood_type?: MoodType
  character?: string
}

const tabs: { key: TabKey; label: string; icon: typeof MessageCircleHeart }[] = [
  { key: "chat", label: "对话", icon: MessageCircleHeart },
  { key: "dress", label: "装扮", icon: Palette },
  { key: "memory", label: "记忆", icon: Brain },
]

const memoryTypes = [
  { key: "all", label: "全部" },
  { key: "personality", label: "性格线索" },
  { key: "preference", label: "偏好" },
  { key: "habit", label: "习惯" },
  { key: "event", label: "事件" },
]

const memoryTypeLabels: Record<string, string> = {
  personality: "性格线索",
  preference: "偏好",
  habit: "习惯",
  event: "事件",
}

const moodLabels: Record<string, string> = {
  happy: "开心",
  calm: "平静",
  anxious: "焦虑",
  angry: "愤怒",
  sad: "低落",
  neutral: "平淡",
}

function inferMood(text: string): MoodType {
  if (/开心|顺利|高兴|快乐|兴奋/.test(text)) return "happy"
  if (/焦虑|紧张|考试|deadline|来不及/.test(text)) return "anxious"
  if (/生气|烦|火大|愤怒/.test(text)) return "angry"
  if (/难过|失落|哭|低落|累/.test(text)) return "sad"
  if (/平静|放松|还好/.test(text)) return "calm"
  return "neutral"
}

const characterGreetingFallback: Record<CompanionCharacter, { greeting: string; starters: string[] }> = {
  sakura: {
    greeting: "今天我会轻轻陪着你，像把心事放进一小片花影里。",
    starters: ["要不要先告诉我，今天哪一刻最需要被温柔接住？", "如果还没想好，也可以只发一个关键词给我。"],
  },
  planet: {
    greeting: "我在这里慢慢观察你的情绪轨道，今天也不用急着给自己答案。",
    starters: ["今天你的心情更像靠近太阳，还是躲进云后面？", "我们可以先从一件最小的小事开始整理。"],
  },
  sunny: {
    greeting: "今天我给你留了一点清爽的阳光，想聊什么都可以直接说。",
    starters: ["现在最想被鼓励的是哪件事？", "如果你愿意，我可以陪你把今天拆成好完成的小步骤。"],
  },
  astronaut: {
    greeting: "小宇航员已上线，我们可以一起检查今天的情绪仪表盘。",
    starters: ["今天最像警报灯闪烁的是哪件事？", "我可以陪你把问题拆成三个可执行的小任务。"],
  },
  moon: {
    greeting: "我会把声音放低一点，陪你把今天慢慢放下来。",
    starters: ["今天有没有一个瞬间，让你特别想安静一下？", "你可以慢慢说，我会在这里听完。"],
  },
  cat: {
    greeting: "小喵在这里轻轻蹭一下你，今天的心事可以慢慢摊开喵。",
    starters: ["今天有没有一点点委屈，想先放到我这里？", "发一个词也可以，小喵会陪你顺着它慢慢聊。"],
  },
  fox: {
    greeting: "小狐狸准备好陪你理线索啦，今天不用一个人把所有事都扛住。",
    starters: ["现在最缠住你的那根线索是什么？", "我可以先陪你找一个最容易动手的入口。"],
  },
}

function buildFallbackGreeting(character: CompanionCharacter, username?: string | null) {
  const fallback = characterGreetingFallback[character] ?? characterGreetingFallback.planet
  const name = username || "你"
  return {
    greeting: `${name}，${fallback.greeting}`,
    starterMessages: fallback.starters.map((content, index) => ({
      id: `starter-${character}-${index}`,
      role: "assistant" as const,
      content,
    })),
  }
}

function normalizeGreetingMessages(payload: GreetingPayload, character: CompanionCharacter, username?: string | null) {
  const fallback = buildFallbackGreeting(character, username)
  const rows = Array.isArray(payload.starter_messages) ? payload.starter_messages : []
  const starterMessages = rows
    .map((item, index) => ({
      id: `starter-api-${index}`,
      role: "assistant" as const,
      content: typeof item === "string" ? item : String((item as { content?: string; text?: string })?.content || (item as { text?: string })?.text || ""),
    }))
    .filter((item) => item.content.trim())

  return {
    greeting: payload.greeting?.trim() || fallback.greeting,
    starterMessages: starterMessages.length > 0 ? starterMessages : fallback.starterMessages,
  }
}

function normalizeConversations(payload: unknown): CompanionConversation[] {
  const rows = Array.isArray(payload) ? payload : []
  return rows
    .map((item) => {
      const row = item as Partial<CompanionConversation>
      return {
        id: Number(row.id),
        title: row.title || "未命名对话",
        character: row.character || "cat",
        created_at: row.created_at || "",
        updated_at: row.updated_at,
        message_count: Number(row.message_count || 0),
      }
    })
    .filter((item) => Number.isFinite(item.id))
}

function normalizeStoredMessages(payload: unknown, fallback: ChatMessage[]): ChatMessage[] {
  const rows = Array.isArray(payload) ? payload : []
  const messages = rows
    .map((item): ChatMessage | null => {
      const row = item as StoredCompanionMessage
      if (row.role === "system") return null
      return {
        id: `stored-${row.id}`,
        role: row.role === "assistant" ? "assistant" as const : "user" as const,
        content: row.content || "",
        created_at: row.created_at,
      }
    })
    .filter((item): item is ChatMessage => Boolean(item?.content?.trim()))

  return messages.length > 0 ? messages : fallback
}

function parseBackendTime(value?: string) {
  if (!value) return null
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatConversationTime(value?: string) {
  const date = parseBackendTime(value)
  if (!date) return ""
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function formatMessageTime(value?: string) {
  const date = value ? parseBackendTime(value) : new Date()
  if (!date || Number.isNaN(date.getTime())) return ""
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function normalizeMemories(payload: unknown): CompanionMemory[] {
  const payloadRecord = Array.isArray(payload) ? undefined : payload as MemoriesPayload
  const rows = Array.isArray(payloadRecord?.memories) ? payloadRecord.memories : Array.isArray(payload) ? payload : []

  return rows
    .map((item, index) => {
      const row = item as Partial<CompanionMemory> & { text?: string; id?: number | string }
      const rawId = Number(row.id)
      const content = typeof item === "string" ? item : String(row.content || row.text || "")
      const tags = Array.isArray(row.tags) ? row.tags.map(String) : []
      return {
        id: Number.isFinite(rawId) ? `memory-${rawId}` : `memory-${index}`,
        rawId: Number.isFinite(rawId) ? rawId : undefined,
        content,
        source: row.source,
        memory_type: row.memory_type,
        mood_context: row.mood_context ?? null,
        tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })
    .filter((item) => item.content.trim())
}

function formatMemoryDate(value?: string) {
  if (!value) return "刚刚"
  const date = parseBackendTime(value)
  if (!date) return "刚刚"
  if (Number.isNaN(date.getTime())) return "刚刚"
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

export default function CompanionPage() {
  const { user, token, updateUser } = useAuthStore()
  const { isGuest } = useAuthGuard({ silent: true })
  const [activeTab, setActiveTab] = useState<TabKey>("chat")
  const [character, setCharacter] = useState<CompanionCharacter>(normalizeCompanionCharacter(user?.avatar_character))
  const [color, setColor] = useState<CompanionColor>((user?.character_color as CompanionColor) || "pink")
  const [starterMessages, setStarterMessages] = useState<ChatMessage[]>(() => buildFallbackGreeting(normalizeCompanionCharacter(user?.avatar_character), user?.username).starterMessages)
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildFallbackGreeting(normalizeCompanionCharacter(user?.avatar_character), user?.username).starterMessages)
  const [memories, setMemories] = useState<CompanionMemory[]>([])
  const [isMemoryLoading, setIsMemoryLoading] = useState(true)
  const [isMemoryGenerating, setIsMemoryGenerating] = useState(false)
  const [memoryTypeFilter, setMemoryTypeFilter] = useState("all")
  const [selectedMemory, setSelectedMemory] = useState<CompanionMemory | null>(null)
  const [memoryNotice, setMemoryNotice] = useState("")
  const [dailyGreeting, setDailyGreeting] = useState(() => buildFallbackGreeting(normalizeCompanionCharacter(user?.avatar_character), user?.username).greeting)
  const [isGreetingLoading, setIsGreetingLoading] = useState(true)
  const [conversations, setConversations] = useState<CompanionConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [isConversationLoading, setIsConversationLoading] = useState(false)
  const [conversationNotice, setConversationNotice] = useState("")
  const [agentStatuses, setAgentStatuses] = useState<string[]>([])
  const [agentNodes, setAgentNodes] = useState<string[]>([])
  const [agentDebugOpen, setAgentDebugOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [agentAvailable, setAgentAvailable] = useState<boolean | null>(null)
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [notice, setNotice] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const iosApp = isIOSApp()

  const latestMood = useMemo(() => inferMood(messages[messages.length - 1]?.content || ""), [messages])
  const filteredMemories = useMemo(
    () => memories.filter((memory) => memoryTypeFilter === "all" || memory.memory_type === memoryTypeFilter),
    [memories, memoryTypeFilter],
  )
  const companion = getCompanionCharacter(character)
  const serverCharacter = character === "planet" ? "star" : character
  const activeConversation = conversations.find((item) => item.id === activeConversationId)
  const agentStatusSummary = isStreaming
    ? agentStatuses[agentStatuses.length - 1] || "灵音正在想一想..."
    : agentNodes.length > 0
      ? "灵音已完成回应"
      : ""

  useEffect(() => {
    setCharacter(normalizeCompanionCharacter(user?.avatar_character))
    setColor((user?.character_color as CompanionColor) || "pink")
  }, [user?.avatar_character, user?.character_color])

  useEffect(() => {
    let active = true

    async function loadGreeting() {
      const fallback = buildFallbackGreeting(character, user?.username)
      setIsGreetingLoading(true)
      try {
        const response = await companionAPI.greeting({ character: serverCharacter })
        if (!active) return
        const payload = (response.data?.data ?? response.data) as GreetingPayload
        const nextGreeting = normalizeGreetingMessages(payload, character, user?.username)
        setDailyGreeting(nextGreeting.greeting)
        setStarterMessages(nextGreeting.starterMessages)
        setMessages((current) => {
          const isStillStarter = current.every((item) => item.role === "assistant" && item.id.startsWith("starter"))
          return isStillStarter ? nextGreeting.starterMessages : current
        })
      } catch {
        if (!active) return
        setDailyGreeting(fallback.greeting)
        setStarterMessages(fallback.starterMessages)
        setMessages((current) => {
          const isStillStarter = current.every((item) => item.role === "assistant" && item.id.startsWith("starter"))
          return isStillStarter ? fallback.starterMessages : current
        })
      } finally {
        if (active) setIsGreetingLoading(false)
      }
    }

    loadGreeting()
    return () => {
      active = false
    }
  }, [character, serverCharacter, user?.username])

  useEffect(() => {
    let active = true

    async function loadAgentStatus() {
      try {
        const response = await companionAPI.agentStatus()
        if (!active) return
        const payload = (response.data?.data ?? response.data) as AgentStatusPayload
        setAgentAvailable(Boolean(payload.langgraph_available))
        setAgentNodes(Array.isArray(payload.nodes) ? payload.nodes : [])
      } catch {
        if (!active) return
        setAgentAvailable(false)
      }
    }

    loadAgentStatus()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadConversationList() {
      if (!token) {
        setConversationNotice("登录后可以保存和切换聊天历史。")
        return
      }

      setIsConversationLoading(true)
      setConversationNotice("")
      try {
        const response = await companionAPI.conversations()
        if (!active) return
        const rows = normalizeConversations(response.data?.data ?? response.data)
        setConversations(rows)
        if (!activeConversationId && rows[0]?.id) {
          setActiveConversationId(rows[0].id)
          await loadConversationMessages(rows[0].id, active)
        }
      } catch {
        if (!active) return
        setConversationNotice("聊天历史暂时没有同步成功，当前仍可本地对话。")
      } finally {
        if (active) setIsConversationLoading(false)
      }
    }

    loadConversationList()
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isStreaming])

  useEffect(() => {
    let active = true

    async function loadMemories() {
      setIsMemoryLoading(true)
      setMemoryNotice("")
      try {
        const response = await companionAPI.memories({ memory_type: memoryTypeFilter === "all" ? undefined : memoryTypeFilter, limit: 50 })
        if (!active) return
        const payload = (response.data?.data ?? response.data) as MemoriesPayload | unknown[]
        const payloadRecord = Array.isArray(payload) ? undefined : payload as MemoriesPayload
        setMemories(normalizeMemories(payload))
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
  }, [memoryTypeFilter, updateUser, user?.avatar_character, user?.mbti, user?.zodiac])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return

    const conversationId = await ensureActiveConversation()
    const now = new Date().toISOString()
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: text, created_at: now }
    const assistantId = `assistant-${Date.now()}`
    setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", content: "", created_at: now }])
    setInput("")
    setIsStreaming(true)
    setNotice("")
    setAgentStatuses([])
    setAgentNodes([])
    setAgentDebugOpen(false)

    // AbortController：30 秒超时防止无限等待
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000)

    try {
      if (conversationId) {
        const agentResponse = await fetch(companionAPI.sendAgentMessageUrl(conversationId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            content: text,
            mood_type: inferMood(text),
            intensity: 5,
            tags: [],
            avatar_character: serverCharacter,
            mbti: user?.mbti || "",
            zodiac: user?.zodiac || "",
          }),
          signal: abortController.signal,
        })

        if (!agentResponse.ok || !agentResponse.body) throw new Error("agent conversation stream unavailable")
        await consumeChatStream(agentResponse, assistantId, timeoutId)
        await refreshConversations(conversationId)
        await reloadMemories()
        return
      }

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
      await consumeChatStream(response, assistantId, timeoutId)
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

  async function consumeChatStream(response: Response, assistantId: string, timeoutId: ReturnType<typeof setTimeout>) {
    if (!response.body) throw new Error("stream unavailable")

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
          continue
        }

        if (payload.type === "status" && typeof payload.content === "string") {
          setAgentStatuses((current) => current.includes(payload.content as string) ? current : [...current, payload.content as string])
        }
        if (payload.type === "music" && payload.content && typeof payload.content === "object") {
          const music = payload.content as AgentMusicRecommendation
          setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, music_recommendation: music } : item))
        }
        if (payload.type === "text" && typeof payload.content === "string") {
          streamedText += payload.content
          setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: streamedText } : item))
        }
        if (payload.type === "error") throw new Error(typeof payload.content === "string" ? payload.content : "stream error")
        if (payload.type === "done") {
          if (payload.content && typeof payload.content === "object") {
            const done = payload.content as AgentDonePayload
            setMessages((current) => current.map((item) => item.id === assistantId ? {
              ...item,
              id: done.assistant_message_id ? `stored-${done.assistant_message_id}` : item.id,
              created_at: done.assistant_created_at || item.created_at || new Date().toISOString(),
              music_recommendation: done.music_recommendation || item.music_recommendation,
              nodes_executed: done.nodes_executed || item.nodes_executed,
            } : item))
            if (Array.isArray(done.nodes_executed)) setAgentNodes(done.nodes_executed)
          }
          clearTimeout(timeoutId)
          return
        }
      }
    }
    clearTimeout(timeoutId)
  }

  async function refreshConversations(selectedId = activeConversationId) {
    if (!token) return
    try {
      const response = await companionAPI.conversations()
      const rows = normalizeConversations(response.data?.data ?? response.data)
      setConversations(rows)
      if (selectedId) setActiveConversationId(selectedId)
    } catch {
      setConversationNotice("聊天历史刷新失败，稍后会自动恢复。")
    }
  }

  async function loadConversationMessages(conversationId: number, active = true) {
    setIsConversationLoading(true)
    setConversationNotice("")
    try {
      const response = await companionAPI.conversationMessages(conversationId)
      if (!active) return
      setMessages(normalizeStoredMessages(response.data?.data ?? response.data, starterMessages))
      setActiveConversationId(conversationId)
    } catch {
      if (!active) return
      setConversationNotice("这段聊天暂时没有加载成功。")
    } finally {
      if (active) setIsConversationLoading(false)
    }
  }

  async function createConversation() {
    if (!token) return null
    try {
      const response = await companionAPI.createConversation({ character: serverCharacter })
      const payload = response.data?.data ?? response.data
      const conversationId = Number(payload?.id)
      if (!Number.isFinite(conversationId)) return null
      setActiveConversationId(conversationId)
      await refreshConversations(conversationId)
      return conversationId
    } catch {
      setConversationNotice("新建聊天暂时没有同步到账号，已保留本地聊天。")
      return null
    }
  }

  async function ensureActiveConversation() {
    if (activeConversationId) return activeConversationId
    return createConversation()
  }

  async function handleNewChat() {
    if (isStreaming) return
    const conversationId = await createConversation()
    if (conversationId) setActiveConversationId(conversationId)
    setMessages(starterMessages)
    setInput("")
    setNotice("")
    setAgentStatuses([])
    setAgentNodes([])
    setAgentDebugOpen(false)
  }

  async function handleSelectConversation(conversationId: number) {
    if (isStreaming || conversationId === activeConversationId) return
    setAgentStatuses([])
    setAgentNodes([])
    setAgentDebugOpen(false)
    setHistoryOpen(false)
    await loadConversationMessages(conversationId)
  }

  async function reloadMemories() {
    setIsMemoryLoading(true)
    setMemoryNotice("")
    try {
      const response = await companionAPI.memories({ memory_type: memoryTypeFilter === "all" ? undefined : memoryTypeFilter, limit: 50 })
      setMemories(normalizeMemories(response.data?.data ?? response.data))
    } catch {
      setMemoryNotice("记忆同步暂时没有成功，稍后再试试。")
    } finally {
      setIsMemoryLoading(false)
    }
  }

  async function handleGenerateMemories() {
    if (!token || isMemoryGenerating) return
    setIsMemoryGenerating(true)
    setMemoryNotice("")
    try {
      const response = await companionAPI.generateMemories()
      const payload = response.data?.data ?? response.data
      const count = Number(payload?.count || 0)
      setMemoryNotice(count > 0 ? `灵音新整理了 ${count} 条记忆。` : response.data?.msg || "这次没有生成新的稳定记忆。")
      await reloadMemories()
    } catch {
      setMemoryNotice("生成记忆暂时没有成功，可能需要更多情绪记录。")
    } finally {
      setIsMemoryGenerating(false)
    }
  }

  async function handleDeleteMemory(memory: CompanionMemory) {
    if (!memory.rawId) {
      setSelectedMemory(null)
      return
    }
    try {
      await companionAPI.deleteMemory(memory.rawId)
      setSelectedMemory(null)
      setMemories((current) => current.filter((item) => item.id !== memory.id))
      setMemoryNotice("这条记忆已删除。")
    } catch {
      setMemoryNotice("删除记忆暂时没有成功。")
    }
  }

  async function handleRenameConversation(conversationId: number) {
    const title = editingTitle.trim()
    if (!title) {
      setConversationNotice("标题不能为空。")
      return
    }
    if (title.length > 40) {
      setConversationNotice("标题不能超过 40 个字。")
      return
    }
    try {
      const response = await companionAPI.updateConversation(conversationId, { title })
      const payload = response.data?.data ?? response.data
      setConversations((current) => current.map((item) => item.id === conversationId ? {
        ...item,
        title: payload?.title || title,
        updated_at: payload?.updated_at || item.updated_at,
      } : item))
      setEditingConversationId(null)
      setEditingTitle("")
      setConversationNotice("会话标题已更新。")
    } catch {
      setConversationNotice("更新标题暂时没有成功。")
    }
  }

  async function handleDeleteConversation(conversationId: number) {
    try {
      await companionAPI.deleteConversation(conversationId)
      const nextConversations = conversations.filter((item) => item.id !== conversationId)
      setConversations(nextConversations)
      setConversationNotice("会话已删除，长期记忆不会受影响。")
      if (activeConversationId === conversationId) {
        const next = nextConversations[0]
        if (next) {
          await loadConversationMessages(next.id)
        } else {
          setActiveConversationId(null)
          setMessages(starterMessages)
        }
      }
    } catch {
      setConversationNotice("删除会话暂时没有成功。")
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

  if (isGuest) {
    return (
      <MoodWaveShell title="灵音伙伴">
        <div className="mx-auto grid min-h-[calc(100svh-12rem)] max-w-5xl place-items-center">
          <section className="w-full overflow-hidden rounded-[38px] bg-white/86 shadow-[0_24px_80px_rgba(255,206,216,0.24)] ring-1 ring-white/75 md:grid md:grid-cols-[0.9fr_1.1fr]">
            <div className="grid place-items-center bg-gradient-to-br from-[#fff7fa] via-[#effdfa] to-[#fff7df] p-8 text-center">
              <div className="rounded-[52px] bg-white/70 p-6 shadow-[0_18px_46px_rgba(255,181,194,0.18)]">
                <CompanionAvatar character={character} color={color} mood={latestMood} size="lg" />
              </div>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/82 px-4 py-2 text-sm font-semibold text-[#ff718b]">
                <Sparkles className="h-4 w-4" />
                {companion.tagline}
              </p>
            </div>
            <div className="p-6 md:p-8">
              <p className="text-sm font-semibold text-[#62bda9]">登录后解锁</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">让灵音伙伴记住你最近的情绪线索</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                游客可以先记录心情和播放音乐。登录后，灵音伙伴会保存对话历史、长期记忆和你的专属形象，回应会更贴近你。
              </p>
              <div className="mt-6 grid gap-3">
                {["长期记忆与历史对话", "结合情绪记录生成建议", "同步伙伴形象与个人资料"].map((item) => (
                  <div key={item} className="rounded-[22px] bg-[#fffafb] px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-[#f8e7eb]">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/login?redirect=/companion" className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,181,194,0.28)]">
                  登录后开始对话
                </Link>
                <Link href="/mood" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-700 ring-1 ring-[#f1dbe2]">
                  先记录一条心情
                </Link>
              </div>
            </div>
          </section>
        </div>
      </MoodWaveShell>
    )
  }

  return (
    <MoodWaveShell title="灵音伙伴">
      <div className={cn("mx-auto grid gap-5", iosApp ? "max-w-[460px] grid-cols-1" : "max-w-6xl lg:grid-cols-[0.88fr_1.12fr]")}>
        <section className={cn("rounded-[36px] bg-white/84 p-6 text-center shadow-[0_22px_70px_rgba(255,206,216,0.22)] ring-1 ring-white/75", iosApp ? "block" : "hidden lg:block")}>
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
            <p className="mt-2 text-sm leading-6 text-slate-700">“{dailyGreeting}”</p>
            {isGreetingLoading ? <p className="mt-2 text-xs text-slate-400">正在同步今天的情绪问候...</p> : null}
          </div>
        </section>

        <section className={cn("min-w-0 rounded-[30px] bg-white/84 p-3 shadow-[0_22px_70px_rgba(255,206,216,0.2)] ring-1 ring-white/75 md:rounded-[36px] md:p-5", iosApp && "overflow-hidden rounded-[34px] bg-gradient-to-br from-white/88 via-[#fff9fb] to-[#eefdfa] p-4")}>
          <div className="relative mb-3 flex items-center justify-between gap-3 rounded-[24px] bg-gradient-to-br from-[#fff7f9] to-[#effdfa] p-3 ring-1 ring-white/80 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <CompanionAvatar character={character} color={color} mood={latestMood} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{companion.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{companion.tagline}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMobileMenu((value) => !value)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-[#f8dce5]"
              aria-label="打开伙伴菜单"
              aria-expanded={showMobileMenu}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showMobileMenu ? (
              <div className="absolute right-3 top-[calc(100%+8px)] z-30 w-48 rounded-[24px] bg-white p-2 shadow-[0_20px_60px_rgba(99,76,89,0.2)] ring-1 ring-[#f8e7eb]">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.key)
                        setShowMobileMenu(false)
                      }}
                      className={cn("flex min-h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-sm font-medium", activeTab === tab.key ? "bg-[#fff1f5] text-[#ff718b]" : "text-slate-600")}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => {
                    setHistoryOpen(true)
                    setActiveTab("chat")
                    setShowMobileMenu(false)
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-sm font-medium text-slate-600"
                >
                  <History className="h-4 w-4" />
                  历史对话
                </button>
              </div>
            ) : null}
          </div>
          <div className={cn("grid-cols-3 gap-2 rounded-[28px] bg-[#fff7f9] p-2", iosApp ? "mb-3 grid" : "hidden md:grid")}>
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
            <div className={cn("flex flex-col", iosApp ? "h-[calc(100svh-11rem)] min-h-[620px]" : "h-[calc(100svh-10rem)] min-h-[560px] md:mt-4 md:h-[560px]")}>
              <div className="relative mb-3 flex items-center justify-between gap-3 rounded-[24px] bg-white/72 px-4 py-3 ring-1 ring-[#f8e7eb]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{activeConversation?.title || "新的伙伴对话"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {agentAvailable === null ? "正在检查 Agent 模式" : agentAvailable ? "Agent 模式已开启" : "普通对话模式"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((open) => !open)}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-[#f8dce5] transition hover:-translate-y-0.5"
                  >
                    <History className="h-3.5 w-3.5" />
                    历史
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeConversation) return
                      setEditingConversationId(activeConversation.id)
                      setEditingTitle(activeConversation.title)
                      setHistoryOpen(true)
                    }}
                    disabled={!activeConversation}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-[#f8dce5] transition hover:-translate-y-0.5 disabled:opacity-40"
                    aria-label="修改会话标题"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => activeConversationId ? void handleDeleteConversation(activeConversationId) : undefined}
                    disabled={!activeConversationId || isStreaming}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#e15d5d] shadow-sm ring-1 ring-[#f8dce5] transition hover:-translate-y-0.5 disabled:opacity-40"
                    aria-label="删除当前会话"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    disabled={isStreaming}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#ff9fb4] px-3 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    新建
                  </button>
                </div>
                {historyOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-full max-w-md rounded-[28px] bg-white p-4 shadow-[0_22px_70px_rgba(99,76,89,0.2)] ring-1 ring-[#f8e7eb]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">历史对话</p>
                        <p className="mt-0.5 text-xs text-slate-400">删除对话不会删除长期记忆。</p>
                      </div>
                      <button type="button" onClick={() => setHistoryOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-[#fff4f7] text-slate-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1 [scrollbar-color:#ffb5c2_transparent] [scrollbar-width:thin]">
                      {isConversationLoading ? (
                        <div className="flex items-center gap-2 rounded-[18px] bg-[#fffafc] px-3 py-3 text-xs text-slate-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          正在同步历史对话...
                        </div>
                      ) : null}
                      {!isConversationLoading && conversations.length === 0 ? (
                        <div className="rounded-[18px] bg-[#fffafc] px-3 py-3 text-xs leading-5 text-slate-500">
                          {token ? "还没有历史对话，发送第一句话后会自动保存。" : "登录后可以保存聊天历史。"}
                        </div>
                      ) : null}
                      {conversations.map((conversation) => {
                        const active = activeConversationId === conversation.id
                        const editing = editingConversationId === conversation.id
                        return (
                          <div key={conversation.id} className={cn("rounded-[20px] p-3 ring-1", active ? "bg-[#fff1f5] ring-[#ffb5c2]" : "bg-[#fffafc] ring-[#f6e3e9]")}>
                            {editing ? (
                              <div className="flex gap-2">
                                <input
                                  value={editingTitle}
                                  onChange={(event) => setEditingTitle(event.target.value)}
                                  maxLength={40}
                                  className="min-h-9 min-w-0 flex-1 rounded-full border border-[#f0dbe2] bg-white px-3 text-xs outline-none focus:border-[#ff9fb4]"
                                  autoFocus
                                />
                                <button type="button" onClick={() => void handleRenameConversation(conversation.id)} className="rounded-full bg-[#ff9fb4] px-3 text-xs font-semibold text-white">保存</button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <button type="button" onClick={() => void handleSelectConversation(conversation.id)} className="min-w-0 flex-1 text-left">
                                  <span className="block truncate text-sm font-semibold text-slate-800">{conversation.title}</span>
                                  <span className="mt-1 block text-xs text-slate-400">{conversation.message_count || 0} 条 · {formatConversationTime(conversation.updated_at || conversation.created_at)}</span>
                                </button>
                                <button type="button" onClick={() => { setEditingConversationId(conversation.id); setEditingTitle(conversation.title) }} className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-500">
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => void handleDeleteConversation(conversation.id)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#e15d5d]">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {conversationNotice ? <p className="mt-3 rounded-[16px] bg-[#fff4df] px-3 py-2 text-xs leading-5 text-[#b7791f]">{conversationNotice}</p> : null}
                  </div>
                ) : null}
              </div>
              {agentStatusSummary ? (
                <div className="mb-3 rounded-[20px] bg-[#fffafc] px-4 py-2 ring-1 ring-[#f8e7eb]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-500">{agentStatusSummary}</span>
                    <button type="button" onClick={() => setAgentDebugOpen((open) => !open)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#ff718b]">
                      查看 Agent 过程
                      <ChevronDown className={cn("h-3.5 w-3.5 transition", agentDebugOpen && "rotate-180")} />
                    </button>
                  </div>
                  {agentDebugOpen ? (
                    <div className="mt-2 space-y-2">
                      {agentStatuses.length > 0 ? <p className="text-xs leading-5 text-slate-500">{agentStatuses.join(" / ")}</p> : null}
                      {agentNodes.length > 0 ? <p className="text-[11px] leading-5 text-slate-400">{agentNodes.join(" → ")}</p> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={cn("min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-[30px] bg-gradient-to-br from-[#fffafb] to-[#f2fffb] p-4 pr-2 [scrollbar-color:#ffb5c2_transparent] [scrollbar-width:thin]", iosApp && "rounded-[32px] bg-white/72 p-3.5")}>
                {messages.map((message) => {
                  const fromAssistant = message.role === "assistant"
                  const isTyping = fromAssistant && isStreaming && !message.content
                  return (
                    <div key={message.id} className={cn("flex gap-3", fromAssistant ? "justify-start" : "justify-end")}>
                      {fromAssistant ? <CompanionAvatar character={character} color={color} mood={latestMood} size="sm" /> : null}
                      <div className={cn("max-w-[78%]", !fromAssistant && "text-right")}>
                        <div className={cn("rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm", fromAssistant ? "bg-white text-slate-700" : "bg-[#ff9fb4] text-white")}>
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
                        <p className={cn("mt-1 px-2 text-[11px]", fromAssistant ? "text-slate-400" : "text-[#e9859a]")}>{formatMessageTime(message.created_at)}</p>
                        {message.music_recommendation ? (
                          <div className="mt-2 rounded-[20px] bg-white/92 p-3 text-left ring-1 ring-[#f8e7eb]">
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <Music2 className="h-4 w-4 text-[#ff718b]" />
                                灵音推荐音乐
                              </span>
                              <span className="rounded-full bg-[#fff4f7] px-2.5 py-1 text-[11px] font-semibold text-[#e85f7d]">
                                {moodLabels[message.music_recommendation.mood || ""] || message.music_recommendation.mood || "疗愈"}
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="rounded-[16px] bg-[#fffafc] px-2 py-2">
                                <p className="text-slate-400">BPM</p>
                                <p className="mt-1 font-semibold text-slate-800">{message.music_recommendation.bpm || "--"}</p>
                              </div>
                              <div className="rounded-[16px] bg-[#fffafc] px-2 py-2">
                                <p className="text-slate-400">能量</p>
                                <p className="mt-1 font-semibold text-slate-800">{message.music_recommendation.energy || "--"}</p>
                              </div>
                              <div className="rounded-[16px] bg-[#fffafc] px-2 py-2">
                                <p className="text-slate-400">风格</p>
                                <p className="mt-1 font-semibold text-slate-800">{message.music_recommendation.style || "--"}</p>
                              </div>
                            </div>
                            {message.music_recommendation.texture ? <p className="mt-2 text-xs leading-5 text-slate-500">{message.music_recommendation.texture}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              {notice ? <p className="mt-3 rounded-[18px] bg-[#fff4df] px-4 py-2 text-xs text-slate-600">{notice}</p> : null}
              <form onSubmit={handleSend} className={cn("mt-4 flex gap-3", iosApp && "rounded-[28px] bg-white/84 p-3 shadow-[0_16px_30px_rgba(255,206,216,0.18)] backdrop-blur-xl")}>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="输入想说的话..."
                  className={cn("min-h-12 min-w-0 flex-1 rounded-full border border-[#f0dbe2] bg-white px-4 text-sm outline-none transition focus:border-[#ff9fb4]", iosApp && "min-h-[52px]")}
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className={cn("inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,181,194,0.28)] disabled:cursor-wait disabled:opacity-60", iosApp && "min-h-[52px]")}
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isStreaming ? "发送中" : "发送"}
                </button>
              </form>
            </div>
          ) : null}

          {activeTab === "dress" ? (
            <div className={cn("mt-5 grid gap-5", iosApp && "gap-4")}>
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
              <IOSGlassCard className={cn("bg-gradient-to-br from-[#fff7f9] to-[#effdfa] p-5", iosApp && "rounded-[30px] bg-white/84 p-5")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">伙伴记住的小线索</h3>
                    <p className="mt-1 text-sm text-slate-500">来自你的情绪历史和灵音伙伴的长期观察。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleGenerateMemories()}
                    disabled={!token || isMemoryGenerating}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#ff718b] shadow-sm ring-1 ring-[#f8dce5] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isMemoryGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {isMemoryGenerating ? "整理中" : "生成记忆"}
                  </button>
                </div>
              </IOSGlassCard>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-color:#ffb5c2_transparent] [scrollbar-width:thin]">
                {memoryTypes.map((item) => {
                  const active = memoryTypeFilter === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMemoryTypeFilter(item.key)}
                      className={cn(
                        "shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 transition",
                        active ? "bg-[#fff1f5] text-[#e85f7d] ring-[#ffb5c2]" : "bg-white/86 text-slate-500 ring-[#f6e3e9] hover:-translate-y-0.5",
                      )}
                    >
                      {item.label}
                    </button>
                  )
                })}
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
                {!isMemoryLoading && filteredMemories.length === 0 ? (
                  <div className="rounded-[26px] bg-white/88 p-4 text-sm leading-6 text-slate-600 ring-1 ring-[#f8e7eb]">
                    {token ? "伙伴还没有形成稳定记忆。多记录几次心情后，或点「生成记忆」试试看。" : "登录后，灵音伙伴才能为你保存长期记忆。"}
                  </div>
                ) : null}
                {!isMemoryLoading && filteredMemories.map((memory, index) => (
                  <button
                    key={memory.id}
                    type="button"
                    onClick={() => setSelectedMemory(memory)}
                    className="flex w-full gap-3 rounded-[26px] bg-white/88 p-4 text-left ring-1 ring-[#f8e7eb] transition hover:-translate-y-0.5 hover:ring-[#ffcad4]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#effdfa] text-sm font-semibold text-[#2d8f78]">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#fff4f7] px-2.5 py-1 text-[11px] font-semibold text-[#e85f7d]">
                          {memoryTypeLabels[memory.memory_type || ""] || "记忆"}
                        </span>
                        {memory.mood_context ? (
                          <span className="rounded-full bg-[#effdfa] px-2.5 py-1 text-[11px] font-semibold text-[#2d8f78]">{memory.mood_context}</span>
                        ) : null}
                        <span className="text-[11px] text-slate-400">{formatMemoryDate(memory.created_at)}</span>
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-slate-700">{memory.content}</span>
                      {memory.tags?.length ? (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {memory.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full bg-[#f7f1ff] px-2 py-0.5 text-[11px] text-slate-500">#{tag}</span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
      {selectedMemory ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/24 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-[34px] bg-white p-5 shadow-[0_24px_80px_rgba(99,76,89,0.22)] ring-1 ring-white/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400">记忆详情</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {memoryTypeLabels[selectedMemory.memory_type || ""] || "灵音记忆"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemory(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff4f7] text-slate-500 transition hover:-translate-y-0.5"
                aria-label="关闭记忆详情"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-[26px] bg-gradient-to-br from-[#fff7f9] to-[#effdfa] p-4">
              <p className="text-sm leading-7 text-slate-700">{selectedMemory.content}</p>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#fffafc] px-4 py-3 ring-1 ring-[#f8e7eb]">
                <span className="text-slate-400">来源</span>
                <span className="font-medium">{selectedMemory.source === "rules" ? "规则整理" : selectedMemory.source === "ai" ? "AI 整理" : selectedMemory.source || "伙伴观察"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#fffafc] px-4 py-3 ring-1 ring-[#f8e7eb]">
                <span className="text-slate-400">记录时间</span>
                <span className="font-medium">{formatMemoryDate(selectedMemory.created_at)}</span>
              </div>
              {selectedMemory.mood_context ? (
                <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#fffafc] px-4 py-3 ring-1 ring-[#f8e7eb]">
                  <span className="text-slate-400">情绪上下文</span>
                  <span className="font-medium">{selectedMemory.mood_context}</span>
                </div>
              ) : null}
              {selectedMemory.tags?.length ? (
                <div className="rounded-[20px] bg-[#fffafc] px-4 py-3 ring-1 ring-[#f8e7eb]">
                  <span className="text-slate-400">标签</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMemory.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[#f7f1ff] px-3 py-1 text-xs font-medium text-slate-500">#{tag}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-3">
              {selectedMemory.rawId ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteMemory(selectedMemory)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#fff4f4] px-4 text-sm font-semibold text-[#e15d5d] ring-1 ring-[#ffd6d6] transition hover:-translate-y-0.5"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedMemory(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#ff9fb4] px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(255,181,194,0.28)] transition hover:-translate-y-0.5"
              >
                收起
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </MoodWaveShell>
  )
}
