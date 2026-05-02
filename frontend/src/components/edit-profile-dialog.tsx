"use client"

import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import {
  CompanionAvatar,
  companionCharacters,
  companionColors,
  normalizeCompanionCharacter,
  type CompanionCharacter,
  type CompanionColor,
} from "@/components/companion-avatar"
import { cn } from "@/lib/utils"

const mbtiOptions = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
]

export const zodiacOptions = [
  { id: "aries", label: "白羊座", symbol: "♈" },
  { id: "taurus", label: "金牛座", symbol: "♉" },
  { id: "gemini", label: "双子座", symbol: "♊" },
  { id: "cancer", label: "巨蟹座", symbol: "♋" },
  { id: "leo", label: "狮子座", symbol: "♌" },
  { id: "virgo", label: "处女座", symbol: "♍" },
  { id: "libra", label: "天秤座", symbol: "♎" },
  { id: "scorpio", label: "天蝎座", symbol: "♏" },
  { id: "sagittarius", label: "射手座", symbol: "♐" },
  { id: "capricorn", label: "摩羯座", symbol: "♑" },
  { id: "aquarius", label: "水瓶座", symbol: "♒" },
  { id: "pisces", label: "双鱼座", symbol: "♓" },
]

export function getZodiac(value?: string | null) {
  return zodiacOptions.find((item) => item.id === value || item.label === value) ?? null
}

function getZodiacSelectValue(value?: string | null) {
  return getZodiac(value)?.id ?? "scorpio"
}

export function getMbtiTone(mbti?: string | null) {
  if (!mbti) return "bg-[#fff4f7] text-[#ff7894] ring-[#ffd9e2]"
  if (mbti.includes("NT")) return "bg-[#f3edff] text-[#7b61d1] ring-[#ded0ff]"
  if (mbti.includes("NF")) return "bg-[#fff2df] text-[#c47a1d] ring-[#ffdfb0]"
  if (mbti.includes("SJ")) return "bg-[#eafff7] text-[#2d8f78] ring-[#ccefe4]"
  return "bg-[#eef7ff] text-[#377fb8] ring-[#cce8ff]"
}

type EditProfileDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, token, updateUser } = useAuthStore()
  const [username, setUsername] = useState(user?.username || "")
  const [mbti, setMbti] = useState(user?.mbti || "INFP")
  const [zodiac, setZodiac] = useState(user?.zodiac || "scorpio")
  const [character, setCharacter] = useState<CompanionCharacter>(normalizeCompanionCharacter(user?.avatar_character))
  const [color, setColor] = useState<CompanionColor>((user?.character_color as CompanionColor) || "pink")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setUsername(user?.username || "")
    setMbti(user?.mbti || "INFP")
    setZodiac(getZodiacSelectValue(user?.zodiac))
    setCharacter(normalizeCompanionCharacter(user?.avatar_character))
    setColor((user?.character_color as CompanionColor) || "pink")
    setNotice("")
  }, [open, user])

  if (!open) return null

  async function handleSave() {
    const zodiacLabel = getZodiac(zodiac)?.label ?? zodiac
    const patch = {
      username: username.trim() || user?.username || "MoodWave 用户",
      mbti,
      zodiac: zodiacLabel,
      avatar_character: character === "planet" ? "star" : character,
    }
    const localPatch = { ...patch, avatar_character: character, character_color: color }
    setSaving(true)
    setNotice("")
    updateUser(localPatch)
    try {
      if (token) {
        const response = await authAPI.updateMe(token, patch)
        const payload = response.data?.data ?? response.data
        updateUser({ ...payload, character_color: color })
      }
      setNotice("资料已保存，灵音伙伴也同步换好造型了。")
      window.setTimeout(() => onOpenChange(false), 650)
    } catch {
      setNotice("已先保存在本地，后端个人资料接口上线后会自动同步。")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/18 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[36px] bg-white/96 p-5 shadow-[0_28px_90px_rgba(255,181,194,0.3)] ring-1 ring-white md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">编辑个人资料</h2>
            <p className="mt-1 text-sm text-slate-500">让 AI 陪伴更懂你的表达方式。</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-10 w-10 place-items-center rounded-full bg-[#fff4f7] text-slate-500 transition hover:text-slate-800"
            aria-label="关闭编辑资料"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[30px] bg-gradient-to-br from-[#fff7f9] to-[#effdfa] p-5 text-center">
            <CompanionAvatar character={character} color={color} size="lg" className="mx-auto" />
            <p className="mt-4 text-lg font-semibold text-slate-900">
              {companionCharacters.find((item) => item.id === character)?.name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {companionCharacters.find((item) => item.id === character)?.tagline}
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">昵称</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-[20px] border border-[#f0dbe2] bg-white px-4 text-sm outline-none transition focus:border-[#ff9fb4]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">MBTI</span>
                <select
                  value={mbti}
                  onChange={(event) => setMbti(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-[20px] border border-[#f0dbe2] bg-white px-4 text-sm outline-none transition focus:border-[#ff9fb4]"
                >
                  {mbtiOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">星座</span>
                <select
                  value={zodiac}
                  onChange={(event) => setZodiac(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-[20px] border border-[#f0dbe2] bg-white px-4 text-sm outline-none transition focus:border-[#ff9fb4]"
                >
                  {zodiacOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.symbol} {item.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">灵音伙伴</p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {companionCharacters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCharacter(item.id)}
                    className={cn(
                      "grid min-h-14 place-items-center rounded-[20px] bg-[#fffafb] text-lg ring-1 ring-[#f8e7eb] transition hover:-translate-y-0.5",
                      character === item.id && "bg-[#fff3f6] ring-2 ring-[#ffb5c2]",
                    )}
                    title={item.name}
                    aria-label={item.name}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">配色</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {companionColors.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColor(item.id)}
                    className={cn("flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-[#f8e7eb]", color === item.id && "ring-2 ring-[#ffb5c2]")}
                  >
                    <span className={cn("h-4 w-4 rounded-full", item.chip)} />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {notice ? <p className="mt-4 rounded-[20px] bg-[#effdfa] px-4 py-3 text-sm text-slate-600">{notice}</p> : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,181,194,0.28)] disabled:cursor-wait disabled:opacity-70"
          >
            <Check className="h-4 w-4" />
            {saving ? "保存中" : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}
