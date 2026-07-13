"use client"

import { cn } from "@/lib/utils"
import {
  bodyPartOptions,
  type BodyPartId,
  type BodySensationSelection,
  type FaceExpression,
} from "@/lib/body-sensation"

type BodySensationMapProps = {
  selections: BodySensationSelection[]
  activePart: BodyPartId
  clickCounts: Partial<Record<BodyPartId, number>>
  expression: FaceExpression
  maxTotalLabels?: number
  maxLabelsPerPart?: number
  onActivePartChange: (part: BodyPartId) => void
  onToggleLabel: (part: BodyPartId, label: string) => void
}

const bodyHotspots: Record<BodyPartId, string> = {
  head: "left-[39%] top-[7%] h-[18%] w-[22%]",
  neck: "left-[33%] top-[25%] h-[13%] w-[34%]",
  chest: "left-[31%] top-[38%] h-[18%] w-[38%]",
  belly: "left-[34%] top-[57%] h-[20%] w-[32%]",
  hands: "left-[10%] top-[61%] h-[23%] w-[80%]",
  whole: "left-[24%] top-[18%] h-[68%] w-[52%]",
}

const calloutPositions: Record<BodyPartId, { dot: string; label: string; line: string }> = {
  head: { dot: "left-[49%] top-[18%]", label: "left-[61%] top-[17%]", line: "left-[52%] top-[20%] w-[12%]" },
  neck: { dot: "left-[53%] top-[33%]", label: "left-[65%] top-[32%]", line: "left-[56%] top-[35%] w-[11%]" },
  chest: { dot: "left-[50%] top-[47%]", label: "left-[66%] top-[46%]", line: "left-[53%] top-[49%] w-[15%]" },
  belly: { dot: "left-[50%] top-[65%]", label: "left-[65%] top-[64%]", line: "left-[53%] top-[67%] w-[14%]" },
  hands: { dot: "left-[23%] top-[78%]", label: "left-[31%] top-[77%]", line: "left-[26%] top-[80%] w-[9%]" },
  whole: { dot: "left-[75%] top-[78%]", label: "left-[81%] top-[77%]", line: "left-[77%] top-[80%] w-[8%]" },
}

const glowGeometry: Record<BodyPartId, { cx: number; cy: number; rx: number; ry: number }> = {
  head: { cx: 160, cy: 82, rx: 50, ry: 54 },
  neck: { cx: 160, cy: 142, rx: 64, ry: 28 },
  chest: { cx: 160, cy: 202, rx: 72, ry: 54 },
  belly: { cx: 160, cy: 282, rx: 58, ry: 58 },
  hands: { cx: 160, cy: 336, rx: 132, ry: 34 },
  whole: { cx: 160, cy: 235, rx: 98, ry: 178 },
}

function getSelection(selections: BodySensationSelection[], part: BodyPartId) {
  return selections.find((selection) => selection.part === part)?.labels ?? []
}

function selectedLabelCount(selections: BodySensationSelection[]) {
  return selections.reduce((count, selection) => count + selection.labels.length, 0)
}

function getMouthPath(expression: FaceExpression["mouth"]) {
  if (expression === "up") return "M143 93 Q160 105 177 93"
  if (expression === "down") return "M143 103 Q160 91 177 103"
  if (expression === "pressed") return "M144 98 Q160 99 176 98"
  return "M145 98 L175 98"
}

function getBrowPaths(expression: FaceExpression["brows"]) {
  if (expression === "furrowed") return { left: "M130 70 L147 75", right: "M173 75 L190 70" }
  if (expression === "low") return { left: "M128 76 Q139 73 150 76", right: "M170 76 Q181 73 192 76" }
  return { left: "M128 68 Q139 64 150 68", right: "M170 68 Q181 64 192 68" }
}

function renderEyes(expression: FaceExpression["eyes"]) {
  if (expression === "tired") {
    return (
      <>
        <path d="M132 84 Q140 88 148 84" fill="none" stroke="#9fb0c6" strokeWidth="3" strokeLinecap="round" />
        <path d="M172 84 Q180 88 188 84" fill="none" stroke="#9fb0c6" strokeWidth="3" strokeLinecap="round" />
      </>
    )
  }
  if (expression === "tense") {
    return (
      <>
        <ellipse cx="140" cy="84" rx="4" ry="6" fill="#8496ad" />
        <ellipse cx="180" cy="84" rx="4" ry="6" fill="#8496ad" />
      </>
    )
  }
  if (expression === "teary") {
    return (
      <>
        <path d="M132 84 Q140 88 148 84" fill="none" stroke="#8496ad" strokeWidth="3" strokeLinecap="round" />
        <path d="M172 84 Q180 88 188 84" fill="none" stroke="#8496ad" strokeWidth="3" strokeLinecap="round" />
        <circle cx="148" cy="91" r="3" fill="#8ed8ff" opacity="0.72" />
      </>
    )
  }
  return (
    <>
      <path d="M132 84 Q140 80 148 84" fill="none" stroke="#8fa0b6" strokeWidth="3" strokeLinecap="round" />
      <path d="M172 84 Q180 80 188 84" fill="none" stroke="#8fa0b6" strokeWidth="3" strokeLinecap="round" />
    </>
  )
}

function partMotionClass(part: BodyPartId) {
  if (part === "head") return "animate-ping"
  if (part === "chest" || part === "whole") return "animate-pulse"
  return ""
}

export function BodySensationMap({
  selections,
  activePart,
  clickCounts,
  expression,
  maxTotalLabels = 6,
  maxLabelsPerPart = 2,
  onActivePartChange,
  onToggleLabel,
}: BodySensationMapProps) {
  const activeOption = bodyPartOptions.find((part) => part.id === activePart) ?? bodyPartOptions[0]
  const totalCount = selectedLabelCount(selections)
  const activeLabels = getSelection(selections, activePart)
  const selectedParts = new Set(selections.filter((selection) => selection.labels.length > 0).map((selection) => selection.part))
  const brows = getBrowPaths(expression.brows)

  return (
    <div className="relative mx-auto min-h-[640px] w-full max-w-[760px] overflow-hidden rounded-[36px] bg-gradient-to-b from-white via-[#fffafb] to-[#f0fffb] p-5 shadow-[0_24px_70px_rgba(255,181,194,0.2)] ring-1 ring-white/80 md:min-h-[680px] md:p-8">
      <div className="pointer-events-none absolute inset-5 rounded-[32px] bg-[radial-gradient(circle_at_50%_22%,rgba(143,182,255,0.16),transparent_20%),radial-gradient(circle_at_50%_48%,rgba(255,159,180,0.16),transparent_24%),radial-gradient(circle_at_50%_70%,rgba(199,184,255,0.14),transparent_26%)]" />

      <svg viewBox="0 0 320 520" className="relative z-0 mx-auto h-[540px] w-full max-w-[430px] md:h-[600px]" role="img" aria-label="卡通半身身体体感地图">
        <defs>
          <linearGradient id="humanLine" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#efb3c2" />
            <stop offset="0.52" stopColor="#b8c3cf" />
            <stop offset="1" stopColor="#8de1d5" />
          </linearGradient>
          <radialGradient id="skinBlush" cx="50%" cy="28%" r="72%">
            <stop stopColor="#ffffff" />
            <stop offset="0.62" stopColor="#fff9f7" />
            <stop offset="1" stopColor="#effdfa" />
          </radialGradient>
          <filter id="bodySoftGlow">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="160" cy="472" rx="96" ry="16" fill="#dcefeb" opacity="0.42" />
        <path d="M98 172 C72 201 61 248 56 305 C52 359 39 397 28 451" fill="none" stroke="url(#humanLine)" strokeWidth="13" strokeLinecap="round" opacity="0.28" />
        <path d="M222 172 C248 201 259 248 264 305 C268 359 281 397 292 451" fill="none" stroke="url(#humanLine)" strokeWidth="13" strokeLinecap="round" opacity="0.28" />
        <path d="M102 174 C116 148 134 137 160 137 C186 137 204 148 218 174 C237 213 235 298 219 375 C206 439 184 489 160 489 C136 489 114 439 101 375 C85 298 83 213 102 174 Z" fill="url(#skinBlush)" stroke="url(#humanLine)" strokeWidth="4" opacity="0.92" />
        <path d="M107 170 C124 188 196 188 213 170" fill="none" stroke="#ffd4df" strokeWidth="7" strokeLinecap="round" opacity="0.78" />
        <path d="M132 135 C138 153 182 153 188 135 L188 174 C181 185 139 185 132 174 Z" fill="#fffafa" stroke="url(#humanLine)" strokeWidth="3" opacity="0.9" />
        <ellipse cx="160" cy="78" rx="58" ry="64" fill="url(#skinBlush)" stroke="url(#humanLine)" strokeWidth="4" />
        <path d="M119 55 C135 33 183 32 202 57" fill="none" stroke="#d7e4ec" strokeWidth="7" strokeLinecap="round" opacity="0.8" />
        <path d={brows.left} fill="none" stroke="#9baec4" strokeWidth="3.5" strokeLinecap="round" />
        <path d={brows.right} fill="none" stroke="#9baec4" strokeWidth="3.5" strokeLinecap="round" />
        {renderEyes(expression.eyes)}
        <path d={getMouthPath(expression.mouth)} fill="none" stroke="#ef9aae" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="126" cy="96" r="8" fill="#ffdce4" opacity="0.45" />
        <circle cx="194" cy="96" r="8" fill="#ffdce4" opacity="0.45" />

        {bodyPartOptions.map((part) => {
          const labels = getSelection(selections, part.id)
          const active = activePart === part.id
          if (!labels.length && !active) return null
          const geometry = glowGeometry[part.id]
          return (
            <ellipse
              key={part.id}
              cx={geometry.cx}
              cy={geometry.cy}
              rx={geometry.rx}
              ry={geometry.ry}
              fill={part.softColor}
              stroke={part.color}
              strokeWidth={active ? 4 : 2.5}
              opacity={active ? 0.86 : 0.54}
              filter="url(#bodySoftGlow)"
              className={active || labels.length ? partMotionClass(part.id) : ""}
            />
          )
        })}

        {[88, 202, 282].map((cy, index) => (
          <circle key={cy} cx="160" cy={cy} r={index === 0 ? 11 : 13} fill="#ffffff" opacity="0.52" stroke="#f2dce5" strokeWidth="1.5" />
        ))}
      </svg>

      {bodyPartOptions.map((part) => {
        const labels = getSelection(selections, part.id)
        const active = activePart === part.id
        const selected = selectedParts.has(part.id)
        const callout = calloutPositions[part.id]
        return (
          <div key={part.id}>
            <button
              type="button"
              onClick={() => onActivePartChange(part.id)}
              className={cn(
                "absolute z-20 rounded-[28px] border border-transparent transition focus:outline-none focus:ring-2 focus:ring-[#ff9fb4]",
                bodyHotspots[part.id],
                active && "bg-white/26 shadow-[0_0_32px_rgba(255,159,180,0.24)]",
              )}
              aria-label={`选择${part.label}`}
            >
              <span className="sr-only">{part.label}</span>
            </button>
            {(active || selected) ? (
              <div className="pointer-events-none absolute z-30">
                <span
                  className={cn(
                    "absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_8px_rgba(255,255,255,0.58)]",
                    callout.dot,
                  )}
                  style={{ backgroundColor: part.color }}
                />
                <span className={cn("absolute h-px origin-left border-t border-dashed", callout.line)} style={{ borderColor: part.color }} />
                <span
                  className={cn(
                    "absolute -translate-y-1/2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-[0_10px_22px_rgba(255,181,194,0.18)] ring-1 ring-white/90",
                    callout.label,
                  )}
                  style={{ color: selected ? part.color : undefined }}
                >
                  {part.label}{labels.length ? ` ${labels.length}` : ""}
                </span>
              </div>
            ) : null}
          </div>
        )
      })}

      <div className="absolute bottom-5 left-4 right-4 z-40 rounded-[28px] bg-white/92 p-4 shadow-[0_18px_44px_rgba(255,181,194,0.18)] ring-1 ring-white/80 backdrop-blur-xl md:bottom-auto md:left-auto md:right-6 md:top-24 md:w-[286px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#ff7894]">正在标记</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">{activeOption.label}</h3>
            <p className="mt-1 text-xs text-slate-500">{activeOption.hint}</p>
          </div>
          <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-slate-500">
            {totalCount}/{maxTotalLabels}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {activeOption.labels.map((label) => {
            const active = activeLabels.includes(label)
            const partFull = !active && activeLabels.length >= maxLabelsPerPart
            const totalFull = !active && totalCount >= maxTotalLabels
            return (
              <button
                key={label}
                type="button"
                onClick={() => onToggleLabel(activeOption.id, label)}
                disabled={partFull || totalFull}
                className={cn(
                  "min-h-9 rounded-full px-3 text-xs font-semibold transition",
                  active
                    ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_10px_18px_rgba(255,181,194,0.18)]"
                    : "bg-[#fffafb] text-slate-600 ring-1 ring-[#f3dfe5] hover:-translate-y-0.5",
                  (partFull || totalFull) && "cursor-not-allowed opacity-45 hover:translate-y-0",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {clickCounts[activePart] && clickCounts[activePart]! >= 3 ? (
        <p className="absolute bottom-5 left-5 right-5 z-30 rounded-[22px] bg-[#fff7d8]/92 px-4 py-3 text-xs leading-6 text-[#a96d1a] shadow-sm ring-1 ring-[#ffe9a9] backdrop-blur md:left-6 md:right-auto md:w-[320px]">
          这里好像很需要被照顾，我们先把呼吸放慢一点。
        </p>
      ) : null}
    </div>
  )
}
