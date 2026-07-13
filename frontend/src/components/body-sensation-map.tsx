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

type PercentPoint = {
  left: string
  top: string
}

const bodyHotspots: Record<BodyPartId, { left: string; top: string; width: string; height: string }> = {
  head: { left: "39%", top: "7%", width: "22%", height: "19%" },
  neck: { left: "35%", top: "27%", width: "30%", height: "13%" },
  chest: { left: "33%", top: "39%", width: "34%", height: "17%" },
  belly: { left: "36%", top: "57%", width: "28%", height: "18%" },
  hands: { left: "9%", top: "67%", width: "82%", height: "22%" },
  whole: { left: "27%", top: "18%", width: "46%", height: "68%" },
}

const calloutPositions: Record<BodyPartId, { dot: PercentPoint; label: PercentPoint; align?: "left" | "right" }> = {
  head: { dot: { left: "50%", top: "18%" }, label: { left: "63%", top: "18%" }, align: "left" },
  neck: { dot: { left: "55%", top: "34%" }, label: { left: "68%", top: "34%" }, align: "left" },
  chest: { dot: { left: "50%", top: "48%" }, label: { left: "67%", top: "48%" }, align: "left" },
  belly: { dot: { left: "50%", top: "65%" }, label: { left: "67%", top: "65%" }, align: "left" },
  hands: { dot: { left: "24%", top: "78%" }, label: { left: "17%", top: "77%" }, align: "right" },
  whole: { dot: { left: "50%", top: "82%" }, label: { left: "64%", top: "82%" }, align: "left" },
}

const glowGeometry: Record<BodyPartId, { cx: number; cy: number; rx: number; ry: number }> = {
  head: { cx: 200, cy: 128, rx: 58, ry: 60 },
  neck: { cx: 200, cy: 247, rx: 72, ry: 32 },
  chest: { cx: 200, cy: 346, rx: 78, ry: 72 },
  belly: { cx: 200, cy: 468, rx: 65, ry: 62 },
  hands: { cx: 200, cy: 578, rx: 150, ry: 46 },
  whole: { cx: 200, cy: 390, rx: 110, ry: 230 },
}

const popoverPositions: Record<BodyPartId, { left: string; top: string }> = {
  head: { left: "49%", top: "11%" },
  neck: { left: "48%", top: "26%" },
  chest: { left: "46%", top: "39%" },
  belly: { left: "46%", top: "55%" },
  hands: { left: "32%", top: "68%" },
  whole: { left: "46%", top: "64%" },
}

function getSelection(selections: BodySensationSelection[], part: BodyPartId) {
  return selections.find((selection) => selection.part === part)?.labels ?? []
}

function selectedLabelCount(selections: BodySensationSelection[]) {
  return selections.reduce((count, selection) => count + selection.labels.length, 0)
}

function getMouthPath(expression: FaceExpression["mouth"]) {
  if (expression === "up") return "M177 152 Q200 168 223 152"
  if (expression === "down") return "M177 166 Q200 150 223 166"
  if (expression === "pressed") return "M178 159 Q200 160 222 159"
  return "M180 158 L220 158"
}

function getBrowPaths(expression: FaceExpression["brows"]) {
  if (expression === "furrowed") return { left: "M158 112 L183 120", right: "M217 120 L242 112" }
  if (expression === "low") return { left: "M157 121 Q172 117 187 121", right: "M213 121 Q228 117 243 121" }
  return { left: "M157 108 Q172 101 187 108", right: "M213 108 Q228 101 243 108" }
}

function renderEyes(expression: FaceExpression["eyes"]) {
  if (expression === "tense") {
    return (
      <>
        <ellipse cx="174" cy="132" rx="5" ry="8" fill="#8798ad" />
        <ellipse cx="226" cy="132" rx="5" ry="8" fill="#8798ad" />
      </>
    )
  }
  if (expression === "teary") {
    return (
      <>
        <path d="M160 132 Q174 139 188 132" fill="none" stroke="#8798ad" strokeWidth="4" strokeLinecap="round" />
        <path d="M212 132 Q226 139 240 132" fill="none" stroke="#8798ad" strokeWidth="4" strokeLinecap="round" />
        <circle cx="240" cy="145" r="4" fill="#8ed8ff" opacity="0.76" />
      </>
    )
  }
  const curve = expression === "tired" ? "M160 132 Q174 139 188 132" : "M160 132 Q174 126 188 132"
  const rightCurve = expression === "tired" ? "M212 132 Q226 139 240 132" : "M212 132 Q226 126 240 132"
  return (
    <>
      <path d={curve} fill="none" stroke="#8fa0b6" strokeWidth="4" strokeLinecap="round" />
      <path d={rightCurve} fill="none" stroke="#8fa0b6" strokeWidth="4" strokeLinecap="round" />
    </>
  )
}

function partMotionClass(part: BodyPartId) {
  if (part === "head") return "animate-ping"
  if (part === "chest" || part === "whole") return "animate-pulse"
  return ""
}

function getLeaderLineStyle(part: BodyPartId, color: string) {
  const dot = calloutPositions[part].dot
  const label = calloutPositions[part].label
  const x1 = Number.parseFloat(dot.left)
  const y1 = Number.parseFloat(dot.top)
  const x2 = Number.parseFloat(label.left)
  const y2 = Number.parseFloat(label.top)
  const length = Math.hypot(x2 - x1, y2 - y1)
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
  return {
    left: dot.left,
    top: dot.top,
    width: `${length}%`,
    borderColor: color,
    transform: `rotate(${angle}deg)`,
  }
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
  const activePopover = popoverPositions[activePart]

  return (
    <div className="relative mx-auto min-h-[660px] w-full overflow-hidden rounded-[38px] bg-gradient-to-b from-white via-[#fffafd] to-[#f2fffb] p-4 shadow-[0_28px_80px_rgba(255,181,194,0.2)] ring-1 ring-white/80 md:min-h-[720px] md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(143,182,255,0.18),transparent_20%),radial-gradient(circle_at_50%_46%,rgba(255,159,180,0.18),transparent_24%),radial-gradient(circle_at_50%_70%,rgba(255,209,102,0.12),transparent_22%),radial-gradient(circle_at_50%_88%,rgba(199,184,255,0.16),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-6 rounded-[34px] border border-white/70" />

      <svg viewBox="0 18 400 702" className="relative z-0 mx-auto h-[610px] w-full max-w-[500px] md:h-[670px]" role="img" aria-label="卡通半身身体体感地图">
        <defs>
          <linearGradient id="humanLineV22" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f3bbc8" />
            <stop offset="0.46" stopColor="#b8c6d3" />
            <stop offset="1" stopColor="#93ded4" />
          </linearGradient>
          <radialGradient id="skinWashV22" cx="50%" cy="28%" r="76%">
            <stop stopColor="#ffffff" />
            <stop offset="0.58" stopColor="#fff8f7" />
            <stop offset="1" stopColor="#eefdf9" />
          </radialGradient>
          <filter id="bodySoftGlowV22">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="200" cy="680" rx="116" ry="18" fill="#dcefeb" opacity="0.44" />
        <path d="M118 256 C86 288 72 350 66 426 C61 497 46 553 32 626" fill="none" stroke="url(#humanLineV22)" strokeWidth="13" strokeLinecap="round" opacity="0.24" />
        <path d="M282 256 C314 288 328 350 334 426 C339 497 354 553 368 626" fill="none" stroke="url(#humanLineV22)" strokeWidth="13" strokeLinecap="round" opacity="0.24" />
        <path d="M118 255 C137 225 158 210 200 210 C242 210 263 225 282 255 C304 302 304 428 280 543 C260 642 228 690 200 690 C172 690 140 642 120 543 C96 428 96 302 118 255 Z" fill="url(#skinWashV22)" stroke="url(#humanLineV22)" strokeWidth="4" opacity="0.9" />
        <path d="M119 256 C143 282 257 282 281 256" fill="none" stroke="#ffd6e1" strokeWidth="8" strokeLinecap="round" opacity="0.58" />
        <path d="M165 200 C172 229 228 229 235 200 L234 256 C226 270 174 270 166 256 Z" fill="#fffafa" stroke="url(#humanLineV22)" strokeWidth="3" opacity="0.88" />

        <ellipse cx="200" cy="120" rx="67" ry="76" fill="url(#skinWashV22)" stroke="url(#humanLineV22)" strokeWidth="4" opacity="0.96" />
        <path d="M132 105 C135 50 174 25 213 35 C250 43 271 74 268 117" fill="none" stroke="#dce7ee" strokeWidth="8" strokeLinecap="round" opacity="0.78" />
        <path d="M142 82 C162 52 223 50 250 86" fill="none" stroke="#edf2f5" strokeWidth="18" strokeLinecap="round" opacity="0.6" />
        <path d={brows.left} fill="none" stroke="#9baec4" strokeWidth="4" strokeLinecap="round" />
        <path d={brows.right} fill="none" stroke="#9baec4" strokeWidth="4" strokeLinecap="round" />
        {renderEyes(expression.eyes)}
        <path d={getMouthPath(expression.mouth)} fill="none" stroke="#ef9aae" strokeWidth="4" strokeLinecap="round" />
        <circle cx="156" cy="155" r="10" fill="#ffdce4" opacity="0.45" />
        <circle cx="244" cy="155" r="10" fill="#ffdce4" opacity="0.45" />

        <path d="M92 405 C71 464 61 541 48 619" fill="none" stroke="#f1cfd9" strokeWidth="4" strokeLinecap="round" opacity="0.34" />
        <path d="M308 405 C329 464 339 541 352 619" fill="none" stroke="#f1cfd9" strokeWidth="4" strokeLinecap="round" opacity="0.34" />
        <path d="M49 620 C66 648 91 649 104 623" fill="none" stroke="#d7e4ec" strokeWidth="4" strokeLinecap="round" opacity="0.48" />
        <path d="M351 620 C334 648 309 649 296 623" fill="none" stroke="#d7e4ec" strokeWidth="4" strokeLinecap="round" opacity="0.48" />

        {bodyPartOptions.map((part) => {
          const labels = getSelection(selections, part.id)
          const active = activePart === part.id
          if (!labels.length && !active) return null
          const geometry = glowGeometry[part.id]
          return (
            <g key={part.id}>
              <ellipse
                cx={geometry.cx}
                cy={geometry.cy}
                rx={geometry.rx}
                ry={geometry.ry}
                fill={part.softColor}
                stroke={part.color}
                strokeWidth={active ? 4 : 2.5}
                opacity={active ? 0.78 : 0.5}
                filter="url(#bodySoftGlowV22)"
                className={active || labels.length ? partMotionClass(part.id) : ""}
              />
              <circle cx={geometry.cx} cy={geometry.cy} r="8" fill="#fff" stroke={part.color} strokeWidth="3" opacity="0.92" />
            </g>
          )
        })}

        {[128, 346, 468, 586].map((cy, index) => (
          <circle key={cy} cx="200" cy={cy} r={index === 0 ? 10 : 12} fill="#ffffff" opacity="0.42" stroke="#f2dce5" strokeWidth="1.5" />
        ))}
      </svg>

      {bodyPartOptions.map((part) => {
        const labels = getSelection(selections, part.id)
        const active = activePart === part.id
        const selected = selectedParts.has(part.id)
        const callout = calloutPositions[part.id]
        const leaderStyle = getLeaderLineStyle(part.id, part.color)
        return (
          <div key={part.id}>
            <button
              type="button"
              onClick={() => onActivePartChange(part.id)}
              className={cn(
                "absolute z-20 rounded-[30px] border border-transparent transition focus:outline-none focus:ring-2 focus:ring-[#ff9fb4]",
                active && "bg-white/24 shadow-[0_0_34px_rgba(255,159,180,0.22)]",
              )}
              style={bodyHotspots[part.id]}
              aria-label={`选择${part.label}`}
            >
              <span className="sr-only">{part.label}</span>
            </button>
            {(active || selected) ? (
              <div className="pointer-events-none absolute inset-0 z-30">
                <span
                  className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_10px_rgba(255,255,255,0.56)]"
                  style={{ left: callout.dot.left, top: callout.dot.top, backgroundColor: part.color }}
                />
                <span className="absolute h-px origin-left border-t border-dashed" style={leaderStyle} />
                <span
                  className={cn(
                    "absolute -translate-y-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-[0_10px_22px_rgba(255,181,194,0.18)] ring-1 ring-white/90",
                    callout.align === "right" ? "-translate-x-full" : "",
                  )}
                  style={{ left: callout.label.left, top: callout.label.top, color: selected ? part.color : undefined }}
                >
                  {part.label}{labels.length ? ` ${labels.length}` : ""}
                </span>
              </div>
            ) : null}
          </div>
        )
      })}

      <div
        className="absolute bottom-4 left-4 right-4 z-40 hidden rounded-[28px] bg-white/94 p-4 shadow-[0_18px_44px_rgba(255,181,194,0.2)] ring-1 ring-white/85 backdrop-blur-xl md:bottom-auto md:left-auto md:right-auto md:block md:w-[270px]"
        style={{ top: activePopover.top, left: activePopover.left }}
      >
        <div className="hidden md:block absolute -left-3 top-16 h-6 w-6 rotate-45 bg-white/94 ring-1 ring-white/85" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#ff7894]">{activeOption.label}现在更像？</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{activeOption.hint}</h3>
            </div>
            <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-slate-500">
              {totalCount}/{maxTotalLabels}
            </span>
          </div>

          <div className="mt-4 space-y-2">
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
                    "flex min-h-10 w-full items-center justify-between rounded-full px-4 text-sm font-semibold transition",
                    active
                      ? "bg-[#fff2f5] text-[#ff7894] ring-1 ring-[#ffb6c7]"
                      : "bg-[#fffafb] text-slate-600 ring-1 ring-[#f3dfe5] hover:-translate-y-0.5",
                    (partFull || totalFull) && "cursor-not-allowed opacity-45 hover:translate-y-0",
                  )}
                >
                  <span>{label}</span>
                  {active ? <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ff8fab] text-xs text-white">✓</span> : null}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">每个部位最多选择 2 个</p>
        </div>
      </div>

      <div className="fixed bottom-[86px] left-4 right-4 z-50 rounded-[26px] bg-white/95 p-4 shadow-[0_18px_44px_rgba(255,181,194,0.24)] ring-1 ring-white/90 backdrop-blur-xl md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#ff7894]">{activeOption.label}现在更像？</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">{activeOption.hint}</h3>
          </div>
          <span className="rounded-full bg-[#fff3f6] px-3 py-1 text-xs font-semibold text-slate-500">
            {totalCount}/{maxTotalLabels}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
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
                    ? "bg-[#fff2f5] text-[#ff7894] ring-1 ring-[#ffb6c7]"
                    : "bg-[#fffafb] text-slate-600 ring-1 ring-[#f3dfe5]",
                  (partFull || totalFull) && "cursor-not-allowed opacity-45",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {clickCounts[activePart] && clickCounts[activePart]! >= 3 ? (
        <p className="absolute bottom-[156px] left-5 z-30 max-w-[260px] rounded-[22px] bg-[#fff7d8]/94 px-4 py-3 text-xs leading-6 text-[#a96d1a] shadow-sm ring-1 ring-[#ffe9a9] backdrop-blur md:bottom-6">
          这里被点了好几次，可能真的很需要被照顾。
        </p>
      ) : null}
    </div>
  )
}
