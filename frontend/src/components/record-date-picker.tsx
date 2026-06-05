"use client"

import { CalendarDays } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return "选择日期"
  return `${year}年${Number(month)}月${Number(day)}日`
}

type RecordDatePickerProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function RecordDatePicker({
  value,
  onChange,
  className,
}: RecordDatePickerProps) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined
  const today = new Date()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border border-[#f0dbe2] bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(255,214,224,0.12)] transition hover:-translate-y-0.5",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 text-[#ff7894]" />
          {formatDateLabel(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="z-[70] w-auto rounded-[28px] border border-white/80 bg-white/96 p-3 shadow-[0_24px_60px_rgba(255,210,220,0.24)]"
      >
        <div className="mb-2 px-2">
          <p className="text-sm font-semibold text-slate-800">选择要记录的那一天</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">默认是今天，也可以补记过去的心情。</p>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return
            const next = new Date(date)
            const year = next.getFullYear()
            const month = String(next.getMonth() + 1).padStart(2, "0")
            const day = String(next.getDate()).padStart(2, "0")
            onChange(`${year}-${month}-${day}`)
          }}
          disabled={(date) => date > today}
          className="rounded-[24px] bg-[#fffafb]"
          classNames={{
            cell: "h-9 w-9 p-0 text-center text-sm relative focus-within:relative focus-within:z-20",
            day: "h-9 w-9 rounded-full p-0 font-normal text-slate-700 hover:bg-[#fff1f5] hover:text-[#ff708b]",
            day_selected:
              "rounded-full bg-[#ff97ad] text-white hover:bg-[#ff97ad] hover:text-white focus:bg-[#ff97ad] focus:text-white",
            day_today: "rounded-full border border-[#ffd9e2] bg-white text-[#ff708b]",
            head_cell: "text-slate-400 rounded-md w-9 font-medium text-[0.8rem]",
            caption_label: "text-sm font-semibold text-slate-700",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
