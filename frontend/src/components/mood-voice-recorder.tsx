"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Mic, Settings, Square, Trash2 } from "lucide-react"
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
  const [permissionState, setPermissionState] = useState<"ready" | "prompt" | "denied" | "unsupported">("prompt")
  const [showPermissionHelp, setShowPermissionHelp] = useState(false)
  const chunksRef = useRef<Blob[]>([])
  const recorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number | null>(null)
  const durationRef = useRef(0)

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  useEffect(() => {
    let active = true

    async function checkPermission() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionState("unsupported")
        setNotice("当前浏览器不支持语音录制，可以先用文字记录。")
        return
      }

      if (window.location.protocol === "http:" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        setPermissionState("denied")
        setNotice("语音录制需要安全连接（HTTPS），请使用 https:// 开头的地址访问。")
        return
      }

      if (!navigator.permissions?.query) return
      try {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName })
        if (!active) return
        setPermissionState(status.state === "granted" ? "ready" : status.state === "denied" ? "denied" : "prompt")
        status.onchange = () => {
          setPermissionState(status.state === "granted" ? "ready" : status.state === "denied" ? "denied" : "prompt")
        }
      } catch {
        if (active) setPermissionState("prompt")
      }
    }

    void checkPermission()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setVoiceName("")
    setDuration(0)
    durationRef.current = 0
  }, [resetKey])

  function getRecorderOptions() {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/mpeg"]
    const mimeType = candidates.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type))
    return mimeType ? { mimeType } : undefined
  }

  function getFileExtension(mimeType: string) {
    if (mimeType.includes("mp4")) return "mp4"
    if (mimeType.includes("mpeg")) return "mp3"
    if (mimeType.includes("ogg")) return "ogg"
    if (mimeType.includes("wav")) return "wav"
    return "webm"
  }

  function getRecordingErrorMessage(error: unknown) {
    const name = (error as DOMException | Error)?.name ?? ""
    setShowPermissionHelp(false)

    if (window.location.protocol === "http:" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      return "语音录制需要安全连接（HTTPS），请使用 https:// 开头的地址访问。"
    }
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setPermissionState("denied")
      setShowPermissionHelp(true)
      return "麦克风权限未开启，请在浏览器设置中允许麦克风访问。"
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "没有检测到可用麦克风，可以先用文字记录。"
    }
    if (name === "SecurityError") {
      return "浏览器阻止了麦克风访问，请确认当前页面使用 HTTPS 打开。"
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("unsupported")
      return "当前浏览器不支持语音录制，可以先用文字记录。"
    }
    return "暂时无法开启麦克风，可以先用文字记录。"
  }

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException("getUserMedia unsupported", "NotSupportedError")
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, getRecorderOptions())
      chunksRef.current = []
      recorderRef.current = recorder
      setNotice("")
      setShowPermissionHelp(false)
      setPermissionState("ready")
      setDuration(0)
      durationRef.current = 0

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        const extension = getFileExtension(blob.type)
        const file = new File([blob], `mood-voice-${Date.now()}.${extension}`, { type: blob.type })
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
    } catch (error) {
      setNotice(getRecordingErrorMessage(error))
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            permissionState === "ready" && "bg-[#effdfa] text-[#2d8f78]",
            permissionState === "prompt" && "bg-white text-slate-500",
            permissionState === "denied" && "bg-[#fff2f4] text-[#ef7b73]",
            permissionState === "unsupported" && "bg-[#f4f1f4] text-slate-500",
          )}
        >
          {permissionState === "ready" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {permissionState === "ready"
            ? "麦克风已就绪"
            : permissionState === "denied"
              ? "需要开启权限"
              : permissionState === "unsupported"
                ? "浏览器不支持"
                : "点击后授权"}
        </span>
      </div>
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
      {notice ? (
        <div className="mt-3 rounded-[18px] bg-white px-3 py-2 text-xs leading-5 text-[#ef7b73] ring-1 ring-[#f6e4e9]">
          <p>{notice}</p>
          {showPermissionHelp ? (
            <div className="mt-2 flex flex-col gap-2 text-slate-500">
              <p>{isIOS && isSafari ? "iPhone 可前往 设置 > Safari > 麦克风 > 允许，然后回到页面再试一次。" : "请打开浏览器站点设置，找到麦克风权限并选择允许。"}</p>
              <button
                type="button"
                onClick={() => setNotice("系统设置无法由网页直接打开，请手动进入浏览器或系统设置开启麦克风权限。")}
                className="inline-flex w-fit items-center gap-1 rounded-full bg-[#fff1f5] px-3 py-1.5 text-xs font-semibold text-[#ff7894]"
              >
                <Settings className="h-3.5 w-3.5" />
                去设置
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
