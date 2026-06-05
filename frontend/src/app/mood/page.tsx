"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Play, Plus, Sparkles, Trash2 } from "lucide-react"
import { aiAPI, moodAPI, uploadAPI } from "@/lib/api"
import { getMoodOption, moodOptions, moodTagOptions } from "@/lib/moodwave"
import { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { MoodAnalysisReport, type MoodAnalysisReportData } from "@/components/mood-analysis-report"
import { MoodMediaUpload, type MoodImageAttachment } from "@/components/mood-media-upload"
import { MoodVoiceRecorder } from "@/components/mood-voice-recorder"
import { RecordDatePicker } from "@/components/record-date-picker"
import { useAuthGuard } from "@/hooks/useAuthGuard"
import { cn, convertBlobToWav } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"
import { useGuestStore } from "@/store/guest"

const steps = ["心情", "记录", "分析"]

const fallbackRadar = [
  { mood: "开心", score: 58 },
  { mood: "平静", score: 72 },
  { mood: "焦虑", score: 28 },
  { mood: "愤怒", score: 12 },
  { mood: "悲伤", score: 18 },
  { mood: "平淡", score: 42 },
]

function formatDateHeadline(value: string) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return "今天"
  return `${Number(month)}月${Number(day)}日`
}

export default function MoodPage() {
  const { user, token } = useAuthStore()
  const { isGuest } = useAuthGuard({ silent: true })
  const addGuestRecord = useGuestStore((state) => state.addRecord)
  const [step, setStep] = useState(1)
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedMood, setSelectedMood] = useState<MoodType>("calm")
  const [intensity, setIntensity] = useState(6)
  const [note, setNote] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [images, setImages] = useState<MoodImageAttachment[]>([])
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("")
  const [voiceUploadUrl, setVoiceUploadUrl] = useState("")
  const [voiceText, setVoiceText] = useState("")
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "uploading" | "ready" | "empty" | "failed">("idle")
  const [voiceError, setVoiceError] = useState("")
  const [showVoiceText, setShowVoiceText] = useState(false)
  const [voiceResetKey, setVoiceResetKey] = useState(0)
  const [customTag, setCustomTag] = useState("")
  const [showCustomTag, setShowCustomTag] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<MoodAnalysisReportData | null>(null)
  const [submitNotice, setSubmitNotice] = useState("")
  const [analysisStage, setAnalysisStage] = useState("")
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const voiceUploadTokenRef = useRef(0)
  const analysisStartedAtRef = useRef(0)

  const selectedMoodMeta = getMoodOption(selectedMood)
  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(selectedMood)
    if (step === 2) return intensity >= 1
    return true
  }, [intensity, selectedMood, step])

  function buildFallbackReport(): MoodAnalysisReportData {
    return {
      summary: `你此刻更接近「${selectedMoodMeta.label}」，强度大约在 ${intensity}/10。`,
      insight: selectedMoodMeta.insight,
      suggestion: "先把今天最具体的一件小事写下来，再给自己留十分钟缓冲。情绪已经被看见，就会轻一点。",
      music_recommendation: {
        mood: selectedMood,
        bpm: selectedMood === "happy" ? 104 : selectedMood === "sad" ? 62 : 76,
        title: selectedMood === "happy" ? "晴朗的午后" : selectedMood === "sad" ? "给低落一条毯子" : "宁静的午后",
        texture: "柔和和弦 + 慢速波纹",
      },
      radar_data: fallbackRadar.map((point) => ({
        ...point,
        score: point.mood === selectedMoodMeta.label ? Math.min(96, intensity * 10) : point.score,
      })),
    }
  }

  function addCustomTag() {
    const tag = customTag.trim()
    if (!tag) return
    setSelectedTags((current) => (current.includes(tag) ? current : [...current, tag]))
    setCustomTag("")
    setShowCustomTag(false)
  }

  function clearVoiceRecording() {
    voiceUploadTokenRef.current += 1
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl)
    setVoiceFile(null)
    setVoiceDuration(0)
    setVoicePreviewUrl("")
    setVoiceUploadUrl("")
    setVoiceText("")
    setVoiceStatus("idle")
    setVoiceError("")
    setShowVoiceText(false)
    setVoiceResetKey((value) => value + 1)
  }

  useEffect(() => {
    if (!isSubmitting || submitted) return

    const timer = window.setInterval(() => {
      setAnalysisProgress((current) => {
        if (current >= 92) return current
        const increment = current < 32 ? 5 : current < 68 ? 3 : 1
        return Math.min(92, current + increment)
      })
    }, 280)

    return () => window.clearInterval(timer)
  }, [isSubmitting, submitted])

  async function handleVoiceRecording(file: File | null, duration: number) {
    if (!file) {
      clearVoiceRecording()
      return
    }

    const uploadToken = voiceUploadTokenRef.current + 1
    voiceUploadTokenRef.current = uploadToken
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl)

    setVoiceFile(file)
    setVoiceDuration(duration)
    setVoicePreviewUrl(URL.createObjectURL(file))
    setVoiceUploadUrl("")
    setVoiceText("")
    setVoiceStatus("uploading")
    setVoiceError("")
    setShowVoiceText(true)

    if (!token) {
      setVoiceStatus("ready")
      setVoiceError("")
      setSubmitNotice((current) => current || "游客模式下语音会先保存在本地，本次不上传云端转写。")
      return
    }

    try {
      const wavFile = file.type.includes("wav") ? file : new File([await convertBlobToWav(file)], file.name.replace(/\.[^.]+$/, ".wav"), { type: "audio/wav" })
      const voiceResponse = await uploadAPI.voice(wavFile)
      if (voiceUploadTokenRef.current !== uploadToken) return
      const payload = voiceResponse.data?.data ?? voiceResponse.data
      setVoiceUploadUrl(payload?.url || payload?.voice_url || "")
      setVoiceText(payload?.voice_text || payload?.text || "")
      if (payload?.duration) setVoiceDuration(Math.max(1, Math.round(Number(payload.duration))))
      const nextStatus = payload?.voice_status
      const nextError = payload?.voice_error || ""
      setVoiceError(nextError)
      if (nextStatus === "error") {
        setVoiceStatus("failed")
        setSubmitNotice((current) => current || nextError || "语音转写暂时不可用，录音已经保留。")
      } else if (nextStatus === "empty" || !payload?.voice_text) {
        setVoiceStatus("empty")
      } else {
        setVoiceStatus("ready")
      }
      setShowVoiceText(true)
    } catch {
      if (voiceUploadTokenRef.current !== uploadToken) return
      setVoiceStatus("failed")
      setVoiceError("语音转写暂时不可用")
      setSubmitNotice((current) => current || "语音转写暂时不可用，已保留本地录音。")
      setShowVoiceText(true)
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setSubmitNotice("")
    setAnalysisStage("正在整理你刚刚留下的心情线索…")
    setAnalysisProgress(10)
    setStep(3)
    setSubmitted(false)
    analysisStartedAtRef.current = Date.now()

    try {
      if (isGuest) {
        const imageUrls = images.map((image) => image.previewUrl)
        const report = buildFallbackReport()
        addGuestRecord({
          date: recordDate,
          mood_type: selectedMood,
          intensity,
          tags: selectedTags,
          note: note || voiceText,
          images: imageUrls,
        })
        setAnalysisStage("已先保存在本地，正在给你一段轻一点的反馈…")
        setAnalysisProgress(100)
        setAnalysisReport(report)
        setSubmitNotice("已保存到本地游客记录。登录后可把记录同步到云端。")
        return
      }

      let imageUrls = images.map((image) => image.previewUrl)
      if (images.length > 0) {
        setAnalysisStage("正在整理图片和文字，一起放进这次分析里…")
        setAnalysisProgress(28)
        try {
          const uploadResponse = await uploadAPI.images(images.map((image) => image.file))
          const payload = uploadResponse.data?.data ?? uploadResponse.data
          imageUrls = Array.isArray(payload?.urls) ? payload.urls : Array.isArray(payload) ? payload : imageUrls
        } catch {
          setSubmitNotice("图片接口暂时不可用，已先使用本地预览完成本次分析。")
        }
      }

      let submittedVoiceText = voiceText
      let submittedVoiceUrl = voiceUploadUrl
      if (voiceFile && !submittedVoiceUrl) {
        setAnalysisStage("正在把语音转成文字，再一起理解你的感受…")
        setAnalysisProgress(46)
        try {
          const wavFile = voiceFile.type.includes("wav")
            ? voiceFile
            : new File([await convertBlobToWav(voiceFile)], voiceFile.name.replace(/\.[^.]+$/, ".wav"), { type: "audio/wav" })
          const voiceResponse = await uploadAPI.voice(wavFile)
          const payload = voiceResponse.data?.data ?? voiceResponse.data
          submittedVoiceUrl = payload?.url || payload?.voice_url || ""
          submittedVoiceText = payload?.voice_text || payload?.text || ""
          setVoiceUploadUrl(submittedVoiceUrl)
          setVoiceText(submittedVoiceText)
          const nextStatus = payload?.voice_status
          const nextError = payload?.voice_error || ""
          setVoiceError(nextError)
          if (nextStatus === "error") {
            setVoiceStatus("failed")
            setSubmitNotice((current) => current || nextError || "语音转写失败，本次会先用文字和图片完成分析。")
          } else if (nextStatus === "empty" || !submittedVoiceText) {
            setVoiceStatus("empty")
          } else {
            setVoiceStatus("ready")
          }
          setShowVoiceText(true)
        } catch {
          setVoiceStatus("failed")
          setVoiceError("语音转写接口暂时不可用")
          setSubmitNotice((current) => current || "语音转写接口暂时不可用，本次先保留文字和图片内容。")
        }
      }

      const imageAnalysis =
        imageUrls.length > 0
          ? `用户上传了 ${imageUrls.length} 张与本次心情相关的图片，图片地址：${imageUrls.join("，")}`
          : ""

      setAnalysisStage("AI 正在结合情绪、标签、文字和语音，为你生成更真实的分析…")
      setAnalysisProgress(72)
      const report = await aiAPI
        .analyzeMood({
          mood_type: selectedMood,
          intensity,
          note,
          tags: selectedTags,
          image_analysis: imageAnalysis,
          image_urls: imageUrls,
          voice_text: submittedVoiceText,
          mbti: user?.mbti || "",
          zodiac: user?.zodiac || "",
        })
        .then((response) => {
          const envelope = response.data as { code?: number; msg?: string; fallback?: boolean; data?: MoodAnalysisReportData | null }
          if (envelope?.code && envelope.code !== 0) {
            throw new Error(envelope.msg || "AI analysis failed")
          }
          if (envelope?.fallback) {
            setSubmitNotice((current) => current || "AI 暂时使用备用分析模板，记录已正常保存。")
          }
          const payload = envelope?.data ?? response.data
          if (!payload) throw new Error("AI analysis empty")
          return payload as MoodAnalysisReportData
        })
        .catch(() => buildFallbackReport())

      setAnalysisStage("分析完成，正在把这次心情慢慢整理给你…")
      setAnalysisProgress(92)
      setAnalysisReport(report)
      await moodAPI.create({
        date: recordDate,
        mood_type: selectedMood,
        intensity,
        tags: selectedTags,
        note,
        images: imageUrls,
        image_analysis: imageAnalysis,
        voice_url: submittedVoiceUrl,
        voice_text: submittedVoiceText,
      })
    } catch {
      setAnalysisStage("网络有点不稳，我先把这次心情接住，再给你一版本地反馈。")
      setAnalysisProgress(100)
      setAnalysisReport(buildFallbackReport())
    } finally {
      const elapsed = Date.now() - analysisStartedAtRef.current
      const minVisibleDuration = 2400
      if (elapsed < minVisibleDuration) {
        await new Promise((resolve) => window.setTimeout(resolve, minVisibleDuration - elapsed))
      }
      setAnalysisProgress(100)
      setIsSubmitting(false)
      setSubmitted(true)
    }
  }

  return (
    <MoodWaveShell title="情绪录入">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,208,219,0.2)] ring-1 ring-white/75 md:p-8">
          <div className="mb-6 rounded-[30px] bg-gradient-to-br from-[#fff7fa] to-[#eefdfa] p-4 ring-1 ring-white/80 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">今天准备记下哪一天的心情？</p>
                <p className="mt-2 text-2xl font-semibold text-[#1f2635]">
                  当前记录：{formatDateHeadline(recordDate)}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  默认记录今天，也可以补记过去的某一天。提交后会明确归档到这一天。
                </p>
              </div>
              <RecordDatePicker value={recordDate} onChange={setRecordDate} className="self-start lg:self-center" />
            </div>
          </div>

          <div className="mx-auto mb-8 max-w-3xl">
            <div className="flex items-center justify-between gap-2">
              {steps.map((label, index) => {
                const current = index + 1
                const active = step === current
                const completed = step > current || (step === 3 && submitted)
                return (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold shadow-sm",
                          active && "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white",
                          completed && "bg-[#8de1d5] text-white",
                          !active && !completed && "bg-[#ece8ee] text-slate-500",
                        )}
                      >
                        {current}
                      </div>
                      <span className={cn("text-xs md:text-sm", active ? "text-[#ff708b]" : "text-slate-500")}>
                        {label}
                      </span>
                    </div>
                    {index < steps.length - 1 ? (
                      <div className={cn("mb-6 h-[2px] flex-1 rounded-full", completed ? "bg-[#8de1d5]" : "bg-[#ece8ee]")} />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              {step === 1 && (
                <section className="space-y-6">
                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">今天的心情更像哪一种？</h2>
                    <p className="mt-2 text-sm text-slate-500">先选一个最接近的状态，不需要一次就选得很准。</p>
                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood.value}
                          type="button"
                          onClick={() => setSelectedMood(mood.value)}
                          className={cn(
                            "rounded-[28px] border bg-white px-4 py-5 text-center shadow-[0_10px_30px_rgba(255,220,228,0.1)] transition hover:-translate-y-1",
                            selectedMood === mood.value ? "border-transparent ring-2 ring-[#ffb6c4]" : "border-[#f6e4e9]",
                          )}
                        >
                          <div
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] text-3xl"
                            style={{ backgroundColor: mood.softAccent }}
                          >
                            {mood.emoji}
                          </div>
                          <p className="mt-3 font-medium text-slate-800">{mood.label}</p>
                          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full" style={{ backgroundColor: mood.accent }} />
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">这些标签和今天更像吗？</h2>
                    <p className="mt-2 text-sm text-slate-500">标签是帮助你快速定位情绪来源的，不必每次都选很多。</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {moodTagOptions.map((tag) => {
                        const active = selectedTags.includes(tag.value)
                        return (
                          <button
                            key={tag.value}
                            type="button"
                            onClick={() => {
                              if (tag.value === "other") {
                                setShowCustomTag(true)
                                return
                              }
                              setSelectedTags((current) =>
                                active ? current.filter((item) => item !== tag.value) : [...current, tag.value],
                              )
                            }}
                            className={cn(
                              "min-h-10 rounded-full px-4 py-2 text-sm transition",
                              active
                                ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_12px_24px_rgba(255,181,194,0.2)]"
                                : "border border-[#f3dfe5] bg-white text-slate-600",
                            )}
                          >
                            {tag.label}
                          </button>
                        )
                      })}
                    </div>
                    {showCustomTag ? (
                      <div className="mt-5 flex flex-col gap-3 rounded-[24px] bg-[#fffafb] p-4 ring-1 ring-[#f6dfe6] sm:flex-row">
                        <input
                          value={customTag}
                          onChange={(event) => setCustomTag(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") addCustomTag()
                          }}
                          placeholder="输入自定义标签，比如：比赛 / 宿舍 / 创作"
                          className="min-h-11 flex-1 rounded-full border border-[#f0dbe2] bg-white px-4 text-sm outline-none focus:border-[#ff9fb4]"
                        />
                        <button
                          type="button"
                          onClick={addCustomTag}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-5 text-sm font-semibold text-white"
                        >
                          <Plus className="h-4 w-4" />
                          添加
                        </button>
                      </div>
                    ) : null}
                    {selectedTags.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {selectedTags.map((tag) => {
                          const label = moodTagOptions.find((item) => item.value === tag)?.label ?? tag
                          return (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => setSelectedTags((current) => current.filter((item) => item !== tag))}
                              className="rounded-full bg-[#fff3f6] px-3 py-1.5 text-xs text-[#ff7894] ring-1 ring-[#ffd9e2]"
                            >
                              {label} ×
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </section>
                </section>
              )}

              {step === 2 && (
                <section className="space-y-6">
                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">这份心情有多明显？</h2>
                    <p className="mt-2 text-sm text-slate-500">拖一拖滑块，让灵音更接近你此刻的强度。</p>
                    <div className="mt-8">
                      <div className="relative h-4 rounded-full bg-gradient-to-r from-[#84dcd0] via-[#ffe49d] to-[#ff9aa8]">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={intensity}
                          onChange={(event) => setIntensity(Number(event.target.value))}
                          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
                        />
                      </div>
                      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                        <span>轻微</span>
                        <span className="rounded-full bg-[#fff2f6] px-4 py-2 font-semibold text-[#ff708b]">
                          {intensity} / 10
                        </span>
                        <span>强烈</span>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                    <h2 className="text-xl font-semibold">把这份心情留一下</h2>
                    <p className="mt-2 text-sm text-slate-500">文字、图片和语音都可以，只写一句也没关系。</p>

                    <div className="mt-5 rounded-[28px] border border-[#f6e4e9] bg-white p-4 shadow-[0_10px_28px_rgba(255,216,225,0.12)]">
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value.slice(0, 700))}
                        placeholder="今天发生了什么？或者你最想先留下哪一句感受？"
                        rows={8}
                        className="w-full resize-none bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                      />
                      <div className="mt-3 flex items-center justify-between border-t border-[#f7e6eb] pt-4">
                        <p className="text-xs text-slate-400">图片和语音会一起进入本次分析</p>
                        <p className="text-xs text-slate-400">{note.length}/700</p>
                      </div>
                      {voiceFile ? (
                        <div className="mt-4 rounded-[24px] border border-[#f0dde4] bg-gradient-to-br from-white to-[#fff7fa] p-4 shadow-[0_12px_28px_rgba(255,181,194,0.12)]">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#eefdfa] text-xl">
                              🎤
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-700">语音记录 ({voiceDuration || 1}秒)</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {voiceStatus === "uploading"
                                  ? "AI 正在把录音转成文字…"
                                  : voiceStatus === "ready"
                                    ? voiceText
                                      ? "已识别完成，下面就是这段语音的转写"
                                      : "已保存录音，但这段语音暂时没有识别出文字"
                                    : voiceStatus === "empty"
                                      ? "录音已收到，但这段语音暂时没有识别出可展示的文字"
                                    : voiceStatus === "failed"
                                      ? voiceError || "转写失败，录音已保留"
                                      : "已录制"}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowVoiceText((value) => !value)}
                                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#fff1f5] px-3 text-xs font-semibold text-[#ff7894] transition hover:-translate-y-0.5"
                              >
                                {showVoiceText ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                {showVoiceText ? "收起转写" : "展开转写"}
                              </button>
                              <button
                                type="button"
                                onClick={clearVoiceRecording}
                                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-slate-400 transition hover:text-[#ef8d7b]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                删除
                              </button>
                            </div>
                          </div>
                          {voicePreviewUrl ? (
                            <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-white/82 px-3 py-2 ring-1 ring-[#f6e4e9]">
                              <Play className="h-4 w-4 shrink-0 text-[#8de1d5]" />
                              <audio src={voicePreviewUrl} controls className="h-9 w-full min-w-0" />
                            </div>
                          ) : null}
                          {showVoiceText ? (
                            voiceText ? (
                              <p className="mt-3 rounded-[18px] bg-[#f9f6f8] p-3 text-sm leading-6 text-slate-600">
                                {voiceText}
                              </p>
                            ) : (
                              <p className="mt-3 rounded-[18px] bg-[#f9f6f8] p-3 text-xs leading-6 text-slate-400">
                                {voiceStatus === "uploading"
                                  ? "AI 正在识别中，请稍候…"
                                  : voiceStatus === "failed"
                                    ? voiceError || "语音转写失败，但录音已经为你保留下来了。"
                                    : "这段录音暂时还没有可展示的转写文字。"}
                              </p>
                            )
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(280px,1.05fr)]">
                        <MoodMediaUpload images={images} onImagesChange={setImages} />
                        <MoodVoiceRecorder onRecordingChange={handleVoiceRecording} resetKey={voiceResetKey} />
                      </div>
                    </div>
                  </section>
                </section>
              )}

              {step === 3 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-6 text-center md:p-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_18px_34px_rgba(255,181,194,0.28)]">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold">
                    {submitted ? "这次心情已经整理好了" : "灵音正在认真理解你刚刚留下的内容"}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {analysisStage || "正在分析你的情绪波纹，马上给你一段轻轻的回应。"}
                  </p>
                  <div className="mx-auto mt-6 max-w-2xl">
                    <div className="h-3 overflow-hidden rounded-full bg-[#f6e9ee]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffc3d0] to-[#8de1d5] transition-[width] duration-500 ease-out"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>正在整合文字、语音和图片线索</span>
                      <span>{analysisProgress}%</span>
                    </div>
                  </div>
                  {submitNotice ? (
                    <p className="mx-auto mt-4 max-w-xl rounded-full bg-[#fff7d8] px-4 py-2 text-xs text-[#b67820]">{submitNotice}</p>
                  ) : null}
                  <div className="mx-auto mt-6 max-w-3xl">
                    {submitted ? (
                      <MoodAnalysisReport report={analysisReport ?? buildFallbackReport()} />
                    ) : (
                      <div className="space-y-4 text-left">
                        <div className="rounded-[28px] bg-gradient-to-br from-[#fff4f7] to-[#effdfa] p-5">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#ff718b]">
                            <Sparkles className="h-4 w-4" />
                            AI 正在生成情绪报告
                          </div>
                          <p className="text-sm leading-7 text-slate-600">
                            灵音会把你刚刚留下的情绪、标签、语音转写和图片一起理解，再整理成更贴近你的反馈。
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {[
                            "整理你的主要情绪和强度",
                            "对照语音与文字里的细节",
                            "提取图片里和情绪有关的线索",
                            "生成更真实的洞察与建议",
                          ].map((item, index) => (
                            <div key={item} className="rounded-[26px] bg-white/88 p-4 ring-1 ring-[#f8e2e8]">
                              <p className="text-sm font-semibold text-slate-900">步骤 {index + 1}</p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1)
                        setSubmitted(false)
                        setAnalysisReport(null)
                        setSubmitNotice("")
                        setAnalysisStage("")
                      }}
                      className="rounded-full border border-[#f1dbe2] bg-white px-6 py-3 text-sm font-semibold text-slate-700"
                    >
                      重新记录
                    </button>
                    <Link
                      href={`/music?mood=${selectedMood}&intensity=${intensity}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white"
                    >
                      <Play className="h-4 w-4" />
                      播放治愈音乐
                    </Link>
                  </div>
                </section>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.max(1, value - 1))}
                  disabled={step === 1 || isSubmitting}
                  className="rounded-full border border-[#f1dbe2] bg-white px-5 py-3 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一步
                </button>
                {step < 2 && (
                  <button
                    type="button"
                    onClick={() => setStep((value) => Math.min(3, value + 1))}
                    disabled={!canContinue}
                    className="rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    继续记录
                  </button>
                )}
                {step === 2 && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "正在分析…" : "开始分析"}
                  </button>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[30px] bg-gradient-to-br from-[#fff7fa] to-[#eefdfa] p-6 shadow-[0_16px_40px_rgba(255,213,223,0.18)]">
                <p className="text-sm text-slate-500">当前记录预览</p>
                <div className="mt-5 flex items-center gap-4">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-[28px] text-4xl"
                    style={{ backgroundColor: selectedMoodMeta.softAccent }}
                  >
                    {selectedMoodMeta.emoji}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{selectedMoodMeta.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      记录 {formatDateHeadline(recordDate)} · 强度 {intensity}/10
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-white/85 p-6 shadow-[0_16px_40px_rgba(255,213,223,0.18)] ring-1 ring-white/70">
                <h3 className="text-lg font-semibold">灵音会先看这些线索</h3>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <p>情绪：{selectedMoodMeta.label}</p>
                  <p>标签：{selectedTags.length > 0 ? selectedTags.join("、") : "还没有额外标签"}</p>
                  <p>内容：{note ? "已经写下一些感受了" : voiceText ? "主要会参考语音转写内容" : "你也可以只选情绪和强度开始"}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
