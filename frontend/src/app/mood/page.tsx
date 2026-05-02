"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Play, Plus, Sparkles, Trash2 } from "lucide-react"
import { aiAPI, moodAPI, uploadAPI } from "@/lib/api"
import { getMoodOption, moodOptions, moodTagOptions } from "@/lib/moodwave"
import { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { MoodAnalysisReport, type MoodAnalysisReportData } from "@/components/mood-analysis-report"
import { MoodMediaUpload, type MoodImageAttachment } from "@/components/mood-media-upload"
import { MoodVoiceRecorder } from "@/components/mood-voice-recorder"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth"

const steps = ["情绪", "强度", "内容", "标签", "完成"]

const fallbackRadar = [
  { mood: "开心", score: 58 },
  { mood: "平静", score: 72 },
  { mood: "焦虑", score: 28 },
  { mood: "愤怒", score: 12 },
  { mood: "悲伤", score: 18 },
  { mood: "平淡", score: 42 },
]

export default function MoodPage() {
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
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
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "uploading" | "ready" | "failed">("idle")
  const [showVoiceText, setShowVoiceText] = useState(false)
  const [voiceResetKey, setVoiceResetKey] = useState(0)
  const [customTag, setCustomTag] = useState("")
  const [showCustomTag, setShowCustomTag] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [analysisReport, setAnalysisReport] = useState<MoodAnalysisReportData | null>(null)
  const [submitNotice, setSubmitNotice] = useState("")
  const voiceUploadTokenRef = useRef(0)

  const selectedMoodMeta = getMoodOption(selectedMood)
  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(selectedMood)
    if (step === 2) return intensity >= 1
    if (step === 3) return true
    if (step === 4) return true
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
    setShowVoiceText(false)
    setVoiceResetKey((value) => value + 1)
  }

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
    setShowVoiceText(false)

    try {
      const voiceResponse = await uploadAPI.voice(file)
      if (voiceUploadTokenRef.current !== uploadToken) return
      const payload = voiceResponse.data?.data ?? voiceResponse.data
      setVoiceUploadUrl(payload?.url || payload?.voice_url || "")
      setVoiceText(payload?.voice_text || payload?.text || "")
      if (payload?.duration) setVoiceDuration(Math.max(1, Math.round(Number(payload.duration))))
      setVoiceStatus("ready")
    } catch {
      if (voiceUploadTokenRef.current !== uploadToken) return
      setVoiceStatus("failed")
      setSubmitNotice((current) => current || "语音转写暂时不可用，已保留本地录音。")
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setSubmitNotice("")

    try {
      let imageUrls = images.map((image) => image.previewUrl)
      if (images.length > 0) {
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
        try {
          const voiceResponse = await uploadAPI.voice(voiceFile)
          const payload = voiceResponse.data?.data ?? voiceResponse.data
          submittedVoiceUrl = payload?.url || payload?.voice_url || ""
          submittedVoiceText = payload?.voice_text || payload?.text || ""
          setVoiceUploadUrl(submittedVoiceUrl)
          setVoiceText(submittedVoiceText)
          setVoiceStatus("ready")
        } catch {
          setSubmitNotice((current) => current || "语音转写接口暂时不可用，本次先保留文字和图片内容。")
        }
      }

      const imageAnalysis =
        imageUrls.length > 0
          ? `用户上传了 ${imageUrls.length} 张与本次心情相关的图片，图片地址：${imageUrls.join("，")}`
          : ""

      const report = await aiAPI
        .analyzeMood({
          mood_type: selectedMood,
          intensity,
          note,
          tags: selectedTags,
          image_analysis: imageAnalysis,
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
            setSubmitNotice((current) => current || "AI 暂时使用本地分析模板，记录已正常保存。")
          }
          const payload = envelope?.data ?? response.data
          if (!payload) throw new Error("AI analysis empty")
          return payload as MoodAnalysisReportData
        })
        .catch(() => buildFallbackReport())

      setAnalysisReport(report)
      await moodAPI.create({
        date: new Date().toISOString().slice(0, 10),
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
      // 网络波动时仍允许用户看到本次记录的分析反馈。
      setAnalysisReport(buildFallbackReport())
    } finally {
      setIsSubmitting(false)
      setSubmitted(true)
      setStep(5)
    }
  }

  return (
    <MoodWaveShell title="情绪录入">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[34px] bg-white/82 p-5 shadow-[0_20px_60px_rgba(255,208,219,0.2)] ring-1 ring-white/75 md:p-8">
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="flex items-center justify-between gap-2">
              {steps.map((label, index) => {
                const current = index + 1
                const active = step === current
                const completed = step > current
                return (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shadow-sm md:h-9 md:w-9",
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

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              {step === 1 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                  <h2 className="text-xl font-semibold">选择情绪</h2>
                  <p className="mt-2 text-sm text-slate-500">今天最接近你状态的是哪一种？</p>
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                    {moodOptions.map((mood) => (
                      <button
                        key={mood.value}
                        type="button"
                        onClick={() => setSelectedMood(mood.value)}
                        className={cn(
                          "rounded-[28px] border bg-white px-4 py-5 text-center shadow-[0_10px_30px_rgba(255,220,228,0.1)] transition hover:-translate-y-1",
                          selectedMood === mood.value
                            ? "border-transparent ring-2 ring-[#ffb6c4]"
                            : "border-[#f6e4e9]",
                        )}
                      >
                        <div
                          className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] text-3xl"
                          style={{ backgroundColor: mood.softAccent }}
                        >
                          {mood.emoji}
                        </div>
                        <p className="mt-3 font-medium text-slate-800">{mood.label}</p>
                        <div
                          className="mx-auto mt-3 h-1.5 w-12 rounded-full"
                          style={{ backgroundColor: mood.accent }}
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                  <h2 className="text-xl font-semibold">情绪强度</h2>
                  <p className="mt-2 text-sm text-slate-500">拖一拖滑块，看看此刻情绪有多明显。</p>
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
              )}

              {step === 3 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                  <h2 className="text-xl font-semibold">记录心情</h2>
                  <p className="mt-2 text-sm text-slate-500">一个输入框就够了：文字、图片和语音可以一起留下。</p>

                  <div className="mt-5 rounded-[28px] border border-[#f6e4e9] bg-white p-4 shadow-[0_10px_28px_rgba(255,216,225,0.12)]">
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value.slice(0, 700))}
                      placeholder="此刻发生了什么？身体有什么感觉？也可以只写一句话。"
                      rows={8}
                      className="w-full resize-none bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    <div className="mt-3 flex items-center justify-between border-t border-[#f7e6eb] pt-4">
                      <p className="text-xs text-slate-400">附件区</p>
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
                                ? "AI 正在识别中..."
                                : voiceStatus === "ready"
                                  ? voiceText
                                    ? "已识别，可展开查看"
                                    : "已保存录音，暂未识别出文字"
                                  : voiceStatus === "failed"
                                    ? "转写失败，录音已保留"
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
                              {showVoiceText ? "收起转写" : "查看转写"}
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
                              {voiceStatus === "uploading" ? "AI 正在识别中，请稍候..." : "这段录音暂时还没有可展示的转写文字。"}
                            </p>
                          )
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(280px,1.05fr)]">
                      <MoodMediaUpload images={images} onImagesChange={setImages} />
                      <MoodVoiceRecorder
                        onRecordingChange={handleVoiceRecording}
                        resetKey={voiceResetKey}
                      />
                    </div>
                  </div>
                </section>
              )}

              {step === 4 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                  <h2 className="text-xl font-semibold">选择标签</h2>
                  <p className="mt-2 text-sm text-slate-500">标签是可选的，也可以用自己的词描述来源。</p>
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
              )}

              {step === 5 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-6 text-center md:p-8">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_18px_34px_rgba(255,181,194,0.28)]">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold">正在分析你的情绪波纹</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {submitted
                      ? "情绪分析完成，下面是为你整理出的温柔反馈。"
                      : "正在分析你的情绪波纹，马上给你一段轻轻的回应。"}
                  </p>
                  {submitNotice ? (
                    <p className="mx-auto mt-4 max-w-xl rounded-full bg-[#fff7d8] px-4 py-2 text-xs text-[#b67820]">{submitNotice}</p>
                  ) : null}
                  <div className="mx-auto mt-6 max-w-3xl">
                    <MoodAnalysisReport report={analysisReport ?? buildFallbackReport()} />
                  </div>
                  <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                      href="/dashboard"
                      className="rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white"
                    >
                      返回首页
                    </Link>
                    <Link
                      href={`/music?mood=${selectedMood}&intensity=${intensity}`}
                      className="rounded-full border border-[#f1dbe2] bg-white px-6 py-3 text-sm font-semibold text-slate-700"
                    >
                      进入治愈音乐
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
                {step < 4 && (
                  <button
                    type="button"
                    onClick={() => setStep((value) => Math.min(5, value + 1))}
                    disabled={!canContinue}
                    className="rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    下一步
                  </button>
                )}
                {step === 4 && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "提交中..." : "开始分析"}
                  </button>
                )}
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[30px] bg-gradient-to-br from-[#fff7fa] to-[#eefdfa] p-6 shadow-[0_16px_40px_rgba(255,213,223,0.18)]">
                <p className="text-sm text-slate-500">当前情绪预览</p>
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
                      强度 {intensity}/10，标签 {selectedTags.length} 个
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] bg-white/85 p-6 shadow-[0_16px_40px_rgba(255,213,223,0.18)] ring-1 ring-white/70">
                <h3 className="text-lg font-semibold">今日小提示</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  情绪不需要一次说完整。先写下一句话、一个标签，或选一种最接近的心情，就已经是在照顾自己。
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
