"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, Square, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

type MoodVoiceRecorderProps = {
  onRecordingChange?: (file: File | null, duration: number) => void
  resetKey?: number
}

export function MoodVoiceRecorder({ onRecordingChange, resetKey = 0 }: MoodVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [voiceName, setVoiceName] = useState("")
  const [notice, setNotice] = useState("")
  const chunksRef = useRef<Blob[]>([])
  const recorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number | null>(null)
  const durationRef = useRef(0)

  useEffect(() => {
    setVoiceName("")
    setDuration(0)
    durationRef.current = 0
  }, [resetKey])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorderRef.current = recorder
      setNotice("")
      setDuration(0)
      durationRef.current = 0

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        const file = new File([blob], `mood-voice-${Date.now()}.webm`, { type: blob.type })
        const recordedDuration = Math.max(1, durationRef.current)
        setVoiceName(file.name)
        setDuration(recordedDuration)
        onRecordingChange?.(file, recordedDuration)
      }

      recorder.start()
      setIsRecording(true)
      timerRef.current = window.setInterval(() => {
        durationRef.current += 1
        setDuration(durationRef.current)
      }, 1000)
    } catch {
      setNotice("浏览器没有开启麦克风权限，可以先用文字记录。")
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    setIsRecording(false)
    if (timerRef.current) window.clearInterval(timerRef.current)
  }

  function clearRecording() {
    setVoiceName("")
    setDuration(0)
    durationRef.current = 0
    onRecordingChange?.(null, 0)
  }

  return (
    <div className="rounded-[24px] border border-[#f6e4e9] bg-[#fffafb] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(255,181,194,0.2)] transition hover:-translate-y-0.5",
            isRecording ? "bg-[#ef8d7b]" : "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5]",
          )}
        >
          {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {isRecording ? "停止录音" : "录一段声音"}
        </button>
        <div className="flex min-w-[160px] flex-1 items-center gap-1">
          {Array.from({ length: 18 }, (_, index) => (
            <span
              key={index}
              className={cn("w-1 rounded-full bg-[#8de1d5] transition-all", isRecording && "animate-pulse")}
              style={{ height: `${10 + ((index * 7 + duration * 3) % 22)}px`, opacity: isRecording || voiceName ? 0.85 : 0.24 }}
            />
          ))}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500">{duration}s</span>
      </div>
      {voiceName ? (
        <div className="mt-3 flex items-center justify-between rounded-[18px] bg-white px-3 py-2 text-xs text-slate-500">
          <span className="truncate">{voiceName}</span>
          <button type="button" onClick={clearRecording} className="text-slate-400 transition hover:text-[#ff6f88]" aria-label="删除语音">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {notice ? <p className="mt-3 text-xs text-[#ef7b73]">{notice}</p> : null}
    </div>
  )
}
