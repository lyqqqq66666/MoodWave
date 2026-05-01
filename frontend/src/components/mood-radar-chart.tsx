"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts"

export type MoodRadarPoint = {
  mood: string
  score: number
}

type MoodRadarChartProps = {
  data: MoodRadarPoint[]
}

export function MoodRadarChart({ data }: MoodRadarChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#f1dbe2" />
          <PolarAngleAxis dataKey="mood" tick={{ fill: "#64748b", fontSize: 12 }} />
          <Radar dataKey="score" stroke="#ff8fa3" fill="#ffb5c2" fillOpacity={0.38} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
