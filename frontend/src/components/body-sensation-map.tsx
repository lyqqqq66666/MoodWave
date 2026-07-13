"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  bodyPartOptions,
  type BodyPartId,
  type BodySensationSelection,
} from "@/lib/body-sensation"

type BodySensationMapProps = {
  selections: BodySensationSelection[]
  activePart: BodyPartId
  clickCounts: Partial<Record<BodyPartId, number>>
  maxTotalLabels?: number
  maxLabelsPerPart?: number
  onActivePartChange: (part: BodyPartId) => void
  onToggleLabel: (part: BodyPartId, label: string) => void
  onRemoveLabel: (part: BodyPartId, label: string) => void
}

const bodyHotspots: Record<BodyPartId, string> = {
  head: "left-[41%] top-[6%] h-[19%] w-[18%]",
  neck: "left-[35%] top-[24%] h-[15%] w-[30%]",
  chest: "left-[34%] top-[37%] h-[20%] w-[32%]",
  belly: "left-[36%] top-[57%] h-[21%] w-[28%]",
  hands: "left-[17%] top-[45%] h-[26%] w-[66%]",
  whole: "left-[25%] top-[21%] h-[64%] w-[50%]",
}

function getSelection(selections: BodySensationSelection[], part: BodyPartId) {
  return selections.find((selection) => selection.part === part)?.labels ?? []
}

function selectedLabelCount(selections: BodySensationSelection[]) {
  return selections.reduce((count, selection) => count + selection.labels.length, 0)
}

export function BodySensationMap({
  selections,
  activePart,
  clickCounts,
  maxTotalLabels = 6,
  maxLabelsPerPart = 2,
  onActivePartChange,
  onToggleLabel,
  onRemoveLabel,
}: BodySensationMapProps) {
  const activeOption = bodyPartOptions.find((part) => part.id === activePart) ?? bodyPartOptions[0]
  const totalCount = selectedLabelCount(selections)
  const activeLabels = getSelection(selections, activePart)
  const selectedParts = new Set(selections.filter((selection) => selection.labels.length > 0).map((selection) => selection.part))

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.92fr)_minmax(300px,1.08fr)] lg:items-center">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[360px] rounded-[34px] bg-gradient-to-b from-[#fffafb] via-white to-[#effdfa] p-4 shadow-[0_20px_54px_rgba(255,181,194,0.18)] ring-1 ring-white/80">
        <div className="pointer-events-none absolute inset-4 rounded-[30px] bg-[radial-gradient(circle_at_50%_18%,rgba(143,182,255,0.16),transparent_20%),radial-gradient(circle_at_50%_45%,rgba(255,159,180,0.15),transparent_22%),radial-gradient(circle_at_50%_68%,rgba(141,225,213,0.16),transparent_24%)]" />
        <svg viewBox="0 0 220 300" className="relative z-0 h-full w-full" role="img" aria-label="极简身体体感轮廓">
          <defs>
            <linearGradient id="bodyLine" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#ffadc0" />
              <stop offset="1" stopColor="#8de1d5" />
            </linearGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M76 104 C64 114 53 132 50 158 C47 187 38 214 31 248" fill="none" stroke="url(#bodyLine)" strokeWidth="8" strokeLinecap="round" opacity="0.42" />
          <path d="M144 104 C156 114 167 132 170 158 C173 187 182 214 189 248" fill="none" stroke="url(#bodyLine)" strokeWidth="8" strokeLinecap="round" opacity="0.42" />
          <path d="M77 105 C84 91 94 85 110 85 C126 85 136 91 143 105 C154 128 154 169 144 207 C136 238 126 262 110 262 C94 262 84 238 76 207 C66 169 66 128 77 105 Z" fill="rgba(255,255,255,0.56)" stroke="url(#bodyLine)" strokeWidth="4" />
          <circle cx="110" cy="55" r="31" fill="rgba(255,255,255,0.72)" stroke="url(#bodyLine)" strokeWidth="4" />
          <path d="M86 101 C100 112 120 112 134 101" fill="none" stroke="#ffd6df" strokeWidth="4" strokeLinecap="round" />
          {bodyPartOptions.map((part) => {
            const labels = getSelection(selections, part.id)
            if (!labels.length) return null
            const pos: Record<BodyPartId, { cx: number; cy: number; rx: number; ry: number }> = {
              head: { cx: 110, cy: 55, rx: 31, ry: 31 },
              neck: { cx: 110, cy: 100, rx: 44, ry: 20 },
              chest: { cx: 110, cy: 137, rx: 48, ry: 34 },
              belly: { cx: 110, cy: 190, rx: 40, ry: 38 },
              hands: { cx: 110, cy: 171, rx: 86, ry: 24 },
              whole: { cx: 110, cy: 164, rx: 70, ry: 96 },
            }
            const p = pos[part.id]
            return (
              <ellipse
                key={part.id}
                cx={p.cx}
                cy={p.cy}
                rx={p.rx}
                ry={p.ry}
                fill={part.softColor}
                stroke={part.color}
                strokeWidth="3"
                opacity={activePart === part.id ? 0.82 : 0.56}
                filter="url(#softGlow)"
              />
            )
          })}
        </svg>
        {bodyPartOptions.map((part) => {
          const labels = getSelection(selections, part.id)
          const active = activePart === part.id
          const selected = selectedParts.has(part.id)
          return (
            <button
              key={part.id}
              type="button"
              onClick={() => onActivePartChange(part.id)}
              className={cn(
                "absolute z-10 rounded-[26px] border border-transparent transition focus:outline-none focus:ring-2 focus:ring-[#ff9fb4]",
                bodyHotspots[part.id],
                active && "bg-white/34 shadow-[0_0_32px_rgba(255,159,180,0.28)]",
                selected && "bg-white/18",
              )}
              aria-label={`选择${part.label}`}
            >
              <span
                className={cn(
                  "absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white/82 text-[10px] font-semibold shadow-[0_10px_20px_rgba(255,181,194,0.18)] transition",
                  active ? "scale-110 border-[#ff9fb4] text-[#ff7894]" : "border-white/80 text-slate-400",
                  selected && "text-slate-700",
                )}
                style={{ boxShadow: selected ? `0 0 0 8px ${part.softColor}` : undefined }}
              >
                <span className="grid h-full place-items-center">{labels.length || ""}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="rounded-[32px] bg-white/88 p-5 shadow-[0_18px_48px_rgba(255,213,223,0.16)] ring-1 ring-white/80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#ff7894]">正在标记</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">{activeOption.label}</h3>
            <p className="mt-1 text-sm text-slate-500">{activeOption.hint}</p>
          </div>
          <span className="rounded-full bg-[#fff3f6] px-3 py-1.5 text-xs font-semibold text-slate-500">
            {totalCount}/{maxTotalLabels}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
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
                  "min-h-11 rounded-full px-4 text-sm font-semibold transition",
                  active
                    ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_12px_24px_rgba(255,181,194,0.2)]"
                    : "bg-[#fffafb] text-slate-600 ring-1 ring-[#f3dfe5] hover:-translate-y-0.5",
                  (partFull || totalFull) && "cursor-not-allowed opacity-45 hover:translate-y-0",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="mt-5 rounded-[26px] bg-gradient-to-br from-[#fff7fa] to-[#effdfa] p-4">
          <p className="text-sm font-semibold text-slate-800">已选线索</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selections.some((selection) => selection.labels.length > 0) ? (
              selections.flatMap((selection) =>
                selection.labels.map((label) => {
                  const part = bodyPartOptions.find((item) => item.id === selection.part)
                  return (
                    <button
                      key={`${selection.part}-${label}`}
                      type="button"
                      onClick={() => onRemoveLabel(selection.part, label)}
                      className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-[#f1dfe5]"
                    >
                      {part?.label}-{label}
                      <X className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  )
                }),
              )
            ) : (
              <span className="text-sm leading-7 text-slate-400">先点击身体区域，再选择最贴近的体感。</span>
            )}
          </div>
        </div>

        {clickCounts[activePart] && clickCounts[activePart]! >= 3 ? (
          <p className="mt-4 rounded-[22px] bg-[#fff7d8] px-4 py-3 text-xs leading-6 text-[#a96d1a]">
            你刚刚多次点了{activeOption.label}，这里可能正需要被温柔看见。
          </p>
        ) : null}
      </div>
    </div>
  )
}
