"use client"

import { Music2, Sparkles } from "lucide-react"
import { MoodRadarChart, type MoodRadarPoint } from "@/components/mood-radar-chart"

export type MoodAnalysisReportData = {
  summary: string
  insight: string
  suggestion: string
  music_recommendation: {
    mood: string
    bpm: number
    title: string
    texture: string
  }
  radar_data: MoodRadarPoint[]
}

type MoodAnalysisReportProps = {
  report: MoodAnalysisReportData
}

export function MoodAnalysisReport({ report }: MoodAnalysisReportProps) {
  return (
    <div className="space-y-4 text-left">
      <div className="rounded-[28px] bg-gradient-to-br from-[#fff4f7] to-[#effdfa] p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#ff718b]">
          <Sparkles className="h-4 w-4" />
          AI 情绪报告
        </div>
        <p className="text-sm leading-7 text-slate-700">{report.summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e2e8]">
          <p className="text-sm font-semibold text-slate-900">深层洞察</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{report.insight}</p>
        </div>
        <div className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e2e8]">
          <p className="text-sm font-semibold text-slate-900">调节建议</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{report.suggestion}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e2e8]">
          <p className="text-sm font-semibold text-slate-900">情绪雷达</p>
          <MoodRadarChart data={report.radar_data} />
        </div>
        <div className="rounded-[26px] bg-gradient-to-br from-[#fff7d8] to-[#effdfa] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Music2 className="h-4 w-4 text-[#62cbbb]" />
            今日音乐推荐
          </div>
          <p className="mt-4 text-xl font-semibold text-slate-900">{report.music_recommendation.title}</p>
          <p className="mt-2 text-sm text-slate-500">{report.music_recommendation.bpm} BPM · {report.music_recommendation.texture}</p>
        </div>
      </div>
    </div>
  )
}
