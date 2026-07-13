import type { MoodType } from "./types"

export type BodyPartId = "head" | "neck" | "chest" | "belly" | "hands" | "whole"
export type BreathState = "rapid" | "shallow" | "steady" | "open"
export type MusicGoal = "calm_down" | "sleep" | "energize" | "release" | "accompany"
export type FaceExpression = {
  mouth: "up" | "flat" | "down" | "pressed"
  eyes: "soft" | "tired" | "tense" | "teary"
  brows: "relaxed" | "furrowed" | "low"
}

export type BodySensationSelection = {
  part: BodyPartId
  labels: string[]
}

export type BodyPartOption = {
  id: BodyPartId
  label: string
  hint: string
  labels: string[]
  color: string
  softColor: string
  icon: string
}

export type BodyPreset = {
  id: string
  label: string
  helper: string
  breathState: BreathState
  musicGoal: MusicGoal
  expression?: FaceExpression
  selections: BodySensationSelection[]
}

export const bodyPartOptions: BodyPartOption[] = [
  {
    id: "head",
    label: "头部",
    hint: "思绪、发沉、紧绷",
    labels: ["发沉", "紧绷", "脑子停不下来", "思绪杂乱", "空空的"],
    color: "#8fb6ff",
    softColor: "rgba(143,182,255,0.18)",
    icon: "🧠",
  },
  {
    id: "neck",
    label: "肩颈",
    hint: "僵硬、负重、缓释",
    labels: ["僵硬", "紧绷", "沉重", "放松发软"],
    color: "#8de1d5",
    softColor: "rgba(141,225,213,0.2)",
    icon: "♨",
  },
  {
    id: "chest",
    label: "胸口",
    hint: "呼吸、发闷、舒展",
    labels: ["堵得慌", "发闷", "发慌", "轻轻的", "舒展"],
    color: "#ff9fb4",
    softColor: "rgba(255,159,180,0.2)",
    icon: "♥",
  },
  {
    id: "belly",
    label: "腹部",
    hint: "发紧、发空、安稳",
    labels: ["发紧", "发空", "烦躁灼烧感", "安稳松弛"],
    color: "#ffd166",
    softColor: "rgba(255,209,102,0.2)",
    icon: "◌",
  },
  {
    id: "hands",
    label: "手部",
    hint: "抓紧、冰凉、放松",
    labels: ["冰凉", "发麻", "握得很紧", "想抓住什么", "放松"],
    color: "#c7b8ff",
    softColor: "rgba(199,184,255,0.2)",
    icon: "✦",
  },
  {
    id: "whole",
    label: "整体",
    hint: "疲惫、浮躁、无力",
    labels: ["疲惫", "浮躁", "麻木", "慌乱", "无力", "松弛"],
    color: "#9ed9a8",
    softColor: "rgba(158,217,168,0.22)",
    icon: "☁",
  },
]

export const breathOptions: Array<{ value: BreathState; label: string; helper: string }> = [
  { value: "rapid", label: "急促", helper: "像赶不上节奏" },
  { value: "shallow", label: "浅浅的", helper: "胸口有点放不开" },
  { value: "steady", label: "平稳", helper: "还能慢慢呼吸" },
  { value: "open", label: "舒展", helper: "呼吸比较打开" },
]

export const musicGoalOptions: Array<{ value: MusicGoal; label: string; helper: string }> = [
  { value: "calm_down", label: "慢慢平复", helper: "先把紧绷降下来" },
  { value: "sleep", label: "放松助眠", helper: "适合夜里或睡前" },
  { value: "energize", label: "给一点力气", helper: "轻轻把状态托起来" },
  { value: "release", label: "安全释放", helper: "让情绪有出口" },
  { value: "accompany", label: "只是陪着我", helper: "不用改变也可以" },
]

export const faceExpressionOptions = {
  mouth: [
    { value: "up", label: "上扬" },
    { value: "flat", label: "平直" },
    { value: "down", label: "下垂" },
    { value: "pressed", label: "抿住" },
  ],
  eyes: [
    { value: "soft", label: "放松" },
    { value: "tired", label: "疲惫" },
    { value: "tense", label: "紧张" },
    { value: "teary", label: "想哭" },
  ],
  brows: [
    { value: "relaxed", label: "舒展" },
    { value: "furrowed", label: "皱起" },
    { value: "low", label: "低垂" },
  ],
} satisfies {
  mouth: Array<{ value: FaceExpression["mouth"]; label: string }>
  eyes: Array<{ value: FaceExpression["eyes"]; label: string }>
  brows: Array<{ value: FaceExpression["brows"]; label: string }>
}

export const defaultFaceExpression: FaceExpression = {
  mouth: "flat",
  eyes: "soft",
  brows: "relaxed",
}

export const bodyPresets: BodyPreset[] = [
  {
    id: "busy-head",
    label: "脑子停不下来",
    helper: "适合思绪很多、难以停下来的时刻",
    breathState: "shallow",
    musicGoal: "calm_down",
    expression: { mouth: "pressed", eyes: "tense", brows: "furrowed" },
    selections: [
      { part: "head", labels: ["脑子停不下来", "思绪杂乱"] },
      { part: "chest", labels: ["发闷"] },
    ],
  },
  {
    id: "heavy-chest",
    label: "胸口闷闷的",
    helper: "适合压着一口气、不太舒展的时候",
    breathState: "shallow",
    musicGoal: "calm_down",
    expression: { mouth: "down", eyes: "tense", brows: "low" },
    selections: [
      { part: "chest", labels: ["发闷", "堵得慌"] },
      { part: "neck", labels: ["紧绷"] },
    ],
  },
  {
    id: "battery-low",
    label: "全身没电",
    helper: "适合疲惫、无力、只想被安静陪着",
    breathState: "steady",
    musicGoal: "accompany",
    expression: { mouth: "flat", eyes: "tired", brows: "low" },
    selections: [
      { part: "whole", labels: ["疲惫", "无力"] },
      { part: "head", labels: ["发沉"] },
    ],
  },
  {
    id: "not-sure",
    label: "说不上来",
    helper: "先标记一点模糊状态，也算有效记录",
    breathState: "steady",
    musicGoal: "accompany",
    expression: { mouth: "flat", eyes: "soft", brows: "relaxed" },
    selections: [{ part: "whole", labels: ["麻木", "浮躁"] }],
  },
]

export const companionBodyFeedback: Record<BodyPartId, { message: string; musicHint: string; look: "up" | "right" | "down" | "left" | "center" }> = {
  head: {
    message: "我看到头部有点忙，我们先让思绪慢慢降噪。",
    musicHint: "推荐低频柔和、旋律重复的平复音乐。",
    look: "up",
  },
  neck: {
    message: "肩颈像在替你扛东西，先让它松一点点。",
    musicHint: "推荐带自然声和轻打击的舒缓音乐。",
    look: "right",
  },
  chest: {
    message: "胸口这里我陪你一起慢呼吸，不急着解释。",
    musicHint: "推荐慢 BPM、长混响、少鼓点的安抚音乐。",
    look: "right",
  },
  belly: {
    message: "腹部的紧绷可以先放到音乐里，被慢慢托住。",
    musicHint: "推荐暖色钢琴、木吉他或水声铺底。",
    look: "down",
  },
  hands: {
    message: "手也在表达紧张，我们先试着慢慢松开。",
    musicHint: "推荐颗粒感轻、节奏稳定的陪伴音乐。",
    look: "down",
  },
  whole: {
    message: "整体状态已经被看见了，今天可以先被陪着。",
    musicHint: "推荐柔和环境音和低刺激治愈歌单。",
    look: "center",
  },
}

export function getCompanionBodyFeedback(
  activePart: BodyPartId,
  selections: BodySensationSelection[],
  breathState: BreathState,
) {
  const labels = flattenBodyLabels(selections)
  if (breathState === "rapid" || breathState === "shallow" || labels.some((label) => ["发闷", "堵得慌", "发慌"].includes(label))) {
    return {
      ...companionBodyFeedback.chest,
      message: "我陪你把呼吸放慢一点，先不用急着说清楚。",
      musicHint: "先听慢速、低密度、像呼吸一样起伏的音乐。",
    }
  }
  if (labels.some((label) => ["疲惫", "无力", "发沉", "麻木"].includes(label))) {
    return {
      ...companionBodyFeedback.whole,
      message: "今天的电量可能不多，我们先把要求调低一点。",
      musicHint: "推荐温柔陪伴型音乐，不催你振作。",
    }
  }
  return selections.length > 0 ? companionBodyFeedback[activePart] : {
    ...companionBodyFeedback[activePart],
    message: "点一点身体上最明显的位置，我会陪你慢慢翻译它。",
    musicHint: "选好线索后，我会给你推荐更贴合的治愈音乐。",
  }
}

const anxiousLabels = ["脑子停不下来", "思绪杂乱", "发慌", "堵得慌", "紧绷", "慌乱", "握得很紧"]
const sadLabels = ["空空的", "发空", "疲惫", "无力", "麻木", "发沉"]
const angryLabels = ["烦躁灼烧感", "浮躁", "握得很紧"]
const calmLabels = ["舒展", "放松发软", "安稳松弛", "放松", "松弛"]

function scoreLabels(labels: string[], candidates: string[]) {
  return labels.reduce((score, label) => score + (candidates.includes(label) ? 1 : 0), 0)
}

export function flattenBodyLabels(selections: BodySensationSelection[]) {
  return selections.flatMap((selection) => selection.labels)
}

export function summarizeBodySensations(
  selections: BodySensationSelection[],
  breathState: BreathState,
  musicGoal: MusicGoal,
  expression: FaceExpression = defaultFaceExpression,
) {
  const breathLabel = breathOptions.find((item) => item.value === breathState)?.label ?? "平稳"
  const goalLabel = musicGoalOptions.find((item) => item.value === musicGoal)?.label ?? "只是陪着我"
  const mouthLabel = faceExpressionOptions.mouth.find((item) => item.value === expression.mouth)?.label ?? "平直"
  const eyesLabel = faceExpressionOptions.eyes.find((item) => item.value === expression.eyes)?.label ?? "放松"
  const browsLabel = faceExpressionOptions.brows.find((item) => item.value === expression.brows)?.label ?? "舒展"
  const sensationText = selections
    .filter((selection) => selection.labels.length > 0)
    .map((selection) => {
      const part = bodyPartOptions.find((item) => item.id === selection.part)?.label ?? selection.part
      return `${part}：${selection.labels.join("、")}`
    })
    .join("；")

  return `${sensationText || "整体：说不上来"}；呼吸：${breathLabel}；表情：嘴巴${mouthLabel}、眼睛${eyesLabel}、眉毛${browsLabel}；想要：${goalLabel}`
}

export function mapBodyEntryToLegacyMood(
  selections: BodySensationSelection[],
  breathState: BreathState,
  musicGoal: MusicGoal,
  expression: FaceExpression = defaultFaceExpression,
) {
  const labels = flattenBodyLabels(selections)
  const mouthLabel = faceExpressionOptions.mouth.find((item) => item.value === expression.mouth)?.label ?? "平直"
  const eyesLabel = faceExpressionOptions.eyes.find((item) => item.value === expression.eyes)?.label ?? "放松"
  const browsLabel = faceExpressionOptions.brows.find((item) => item.value === expression.brows)?.label ?? "舒展"
  if (labels.length === 0) {
    const summary = summarizeBodySensations(selections, breathState, musicGoal, expression)
    return {
      mood_type: "calm" as MoodType,
      intensity: 4,
      tags: [
        "身体体感",
        `呼吸-${breathOptions.find((item) => item.value === breathState)?.label ?? "平稳"}`,
        `表情-嘴巴${mouthLabel}`,
        `表情-眼睛${eyesLabel}`,
        `表情-眉毛${browsLabel}`,
        `目标-${musicGoalOptions.find((item) => item.value === musicGoal)?.label ?? "陪伴"}`,
      ],
      note: summary,
    }
  }
  const anxiety = scoreLabels(labels, anxiousLabels) + (breathState === "rapid" ? 2 : breathState === "shallow" ? 1 : 0)
  const sadness = scoreLabels(labels, sadLabels) + (musicGoal === "accompany" || musicGoal === "sleep" ? 1 : 0) + (expression.eyes === "teary" || expression.mouth === "down" ? 1 : 0)
  const anger = scoreLabels(labels, angryLabels) + (musicGoal === "release" ? 1 : 0)
  const calm = scoreLabels(labels, calmLabels) + (breathState === "open" ? 2 : 0) + (expression.eyes === "soft" && expression.brows === "relaxed" ? 1 : 0)

  const scores: Array<[MoodType, number]> = [
    ["anxious", anxiety],
    ["sad", sadness],
    ["angry", anger],
    ["calm", calm],
  ]
  const [moodType, score] = scores.sort((a, b) => b[1] - a[1])[0]
  const selectedCount = Math.max(1, labels.length)
  const breathBoost = breathState === "rapid" ? 2 : breathState === "shallow" ? 1 : 0
  const releaseBoost = musicGoal === "release" ? 1 : 0
  const intensity = Math.max(4, Math.min(8, 4 + Math.ceil(selectedCount / 2) + breathBoost + releaseBoost))
  const fallbackMood: MoodType = musicGoal === "energize" && score <= 1 ? "neutral" : moodType
  const summary = summarizeBodySensations(selections, breathState, musicGoal, expression)

  return {
    mood_type: fallbackMood,
    intensity,
    tags: [
      "身体体感",
      ...selections.flatMap((selection) => {
        const part = bodyPartOptions.find((item) => item.id === selection.part)?.label ?? selection.part
        return selection.labels.map((label) => `${part}-${label}`)
      }),
      `呼吸-${breathOptions.find((item) => item.value === breathState)?.label ?? "平稳"}`,
      `表情-嘴巴${mouthLabel}`,
      `表情-眼睛${eyesLabel}`,
      `表情-眉毛${browsLabel}`,
      `目标-${musicGoalOptions.find((item) => item.value === musicGoal)?.label ?? "陪伴"}`,
    ],
    note: summary,
  }
}
