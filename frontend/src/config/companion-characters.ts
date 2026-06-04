export type CompanionCharacter = "sakura" | "planet" | "sunny" | "astronaut" | "moon" | "cat" | "fox"
export type CompanionColor = "pink" | "mint" | "blue" | "amber" | "purple"

export type CompanionCharacterConfig = {
  id: CompanionCharacter
  name: string
  tagline: string
  personality: string
  accent: string
  gradient: [string, string, string]
  symbol: string
  icon: string
  face: {
    eye: string
    blush: string
    mouth: string
  }
  halo: string
}

export const companionCharacters: CompanionCharacterConfig[] = [
  {
    id: "sakura",
    name: "樱樱",
    tagline: "花影陪伴型",
    personality: "语气轻柔，适合想慢慢说、想先被安静接住的时候。",
    accent: "#ff8fac",
    gradient: ["#ffd7e2", "#fff4c8", "#f8c7dd"],
    symbol: "✿",
    icon: "✿",
    face: { eye: "spark", blush: "#ffcad4", mouth: "soft" },
    halo: "rgba(255, 181, 194, 0.45)",
  },
  {
    id: "planet",
    name: "星诺",
    tagline: "轨道整理型",
    personality: "像一颗安静的小星体，适合帮你把心绪慢慢排成轨道。",
    accent: "#7d8cff",
    gradient: ["#d8deff", "#f4eaff", "#b8f0e9"],
    symbol: "◌",
    icon: "◐",
    face: { eye: "calm", blush: "#d8d4ff", mouth: "calm" },
    halo: "rgba(175, 191, 255, 0.4)",
  },
  {
    id: "sunny",
    name: "晴晴",
    tagline: "清爽鼓励型",
    personality: "轻盈但不吵，适合需要一点元气和行动感的时候。",
    accent: "#ffb84c",
    gradient: ["#ffe6a8", "#ffd4a3", "#fff2d9"],
    symbol: "☀",
    icon: "☀",
    face: { eye: "smile", blush: "#ffd2a8", mouth: "open" },
    halo: "rgba(255, 215, 143, 0.42)",
  },
  {
    id: "astronaut",
    name: "航航",
    tagline: "问题拆解型",
    personality: "适合学习、压力、deadline 场景，帮你把混乱拆成一小步一小步。",
    accent: "#8db9ff",
    gradient: ["#d9e8ff", "#eef4ff", "#d8deff"],
    symbol: "✦",
    icon: "✦",
    face: { eye: "focus", blush: "#d7e7ff", mouth: "steady" },
    halo: "rgba(159, 191, 255, 0.38)",
  },
  {
    id: "moon",
    name: "月遥",
    tagline: "深夜守候型",
    personality: "声音更轻，适合低落、疲惫、想在夜里慢慢说的时候。",
    accent: "#9d8fd8",
    gradient: ["#d9d4ff", "#f0ebff", "#c8eff2"],
    symbol: "☾",
    icon: "☾",
    face: { eye: "calm", blush: "#ddd6ff", mouth: "soft" },
    halo: "rgba(204, 195, 227, 0.45)",
  },
  {
    id: "cat",
    name: "喵呜",
    tagline: "贴贴安抚型",
    personality: "软乎乎地接住委屈和疲惫，适合想被陪一下的时刻。",
    accent: "#ff9db2",
    gradient: ["#ffdce4", "#fff4dc", "#ffc7d4"],
    symbol: "ฅ",
    icon: "ฅ",
    face: { eye: "smile", blush: "#ffc3d2", mouth: "soft" },
    halo: "rgba(255, 193, 210, 0.44)",
  },
  {
    id: "fox",
    name: "绒绒",
    tagline: "灵动拆线型",
    personality: "机灵但不催促，适合焦虑和混乱场景，帮你找一个能开始的点。",
    accent: "#f39a6b",
    gradient: ["#ffd4bf", "#fff0de", "#ffc99d"],
    symbol: "✧",
    icon: "✧",
    face: { eye: "focus", blush: "#ffd6bf", mouth: "open" },
    halo: "rgba(255, 190, 145, 0.42)",
  },
]

export const companionColors: {
  id: CompanionColor
  name: string
  from: string
  to: string
  chip: string
}[] = [
  { id: "pink", name: "樱粉", from: "#FFB5C2", to: "#FFE8A8", chip: "bg-[#ffb5c2]" },
  { id: "mint", name: "薄荷", from: "#A8E6CF", to: "#90E0EF", chip: "bg-[#a8e6cf]" },
  { id: "blue", name: "晴空", from: "#90E0EF", to: "#CBC3E3", chip: "bg-[#90e0ef]" },
  { id: "amber", name: "暖阳", from: "#FFD166", to: "#EF8D7B", chip: "bg-[#ffd166]" },
  { id: "purple", name: "薰衣草", from: "#CBC3E3", to: "#FFB5C2", chip: "bg-[#cbc3e3]" },
]

export function getCompanionCharacter(value?: string | null) {
  const normalized = value === "star" ? "planet" : value
  return companionCharacters.find((item) => item.id === normalized) ?? companionCharacters[1]
}

export function normalizeCompanionCharacter(value?: string | null): CompanionCharacter {
  return getCompanionCharacter(value).id
}

export function getCompanionColor(value?: string | null) {
  return companionColors.find((item) => item.id === value) ?? companionColors[0]
}
