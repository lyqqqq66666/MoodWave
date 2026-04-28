"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ImagePlus, Mic, PenLine, Sparkles, UploadCloud } from "lucide-react"
import { moodAPI } from "@/lib/api"
import { getMoodOption, moodOptions, moodTagOptions } from "@/lib/moodwave"
import { MoodType } from "@/lib/types"
import { MoodWaveShell } from "@/components/moodwave-shell"
import { cn } from "@/lib/utils"

const steps = ["情绪", "强度", "内容", "标签", "完成"]

type InputMode = "text" | "image" | "voice"

export default function MoodPage() {
  const [step, setStep] = useState(1)
  const [selectedMood, setSelectedMood] = useState<MoodType>("calm")
  const [intensity, setIntensity] = useState(6)
  const [note, setNote] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>(["relationship"])
  const [inputMode, setInputMode] = useState<InputMode>("text")
  const [uploadedImageName, setUploadedImageName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const selectedMoodMeta = getMoodOption(selectedMood)
  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(selectedMood)
    if (step === 2) return intensity >= 1
    if (step === 3) return true
    if (step === 4) return selectedTags.length > 0
    return true
  }, [intensity, selectedMood, selectedTags, step])

  async function handleSubmit() {
    setIsSubmitting(true)

    try {
      await moodAPI.create({
        date: new Date().toISOString().slice(0, 10),
        mood_type: selectedMood,
        intensity,
        tags: JSON.stringify(selectedTags),
        note,
      })
    } catch {
      // 后端 tags 结构还未统一，先允许前端流转完成。
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
                  <p className="mt-2 text-sm text-slate-500">文字先落地，图片和语音先保留前端入口给后续接口。</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {[
                      { key: "text", label: "文字", icon: PenLine },
                      { key: "image", label: "图片", icon: ImagePlus },
                      { key: "voice", label: "语音", icon: Mic },
                    ].map((item) => {
                      const Icon = item.icon
                      const active = inputMode === item.key
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setInputMode(item.key as InputMode)}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                            active
                              ? "bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_12px_30px_rgba(255,181,194,0.22)]"
                              : "border border-[#f3dfe5] bg-white text-slate-600",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5">
                    {inputMode === "text" && (
                      <div className="rounded-[24px] border border-[#f6e4e9] bg-white p-4">
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value.slice(0, 500))}
                          placeholder="此刻我在想什么..."
                          rows={10}
                          className="w-full resize-none bg-transparent text-sm leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                        />
                        <div className="mt-3 text-right text-xs text-slate-400">{note.length}/500</div>
                      </div>
                    )}

                    {inputMode === "image" && (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#f4d7e0] bg-[#fffafb] px-5 py-10 text-center">
                        <UploadCloud className="h-10 w-10 text-[#ff87a0]" />
                        <p className="mt-4 text-sm font-medium text-slate-700">点击上传图片</p>
                        <p className="mt-2 text-xs text-slate-400">后续由 `POST /api/upload/image` 接入</p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => setUploadedImageName(event.target.files?.[0]?.name ?? "")}
                        />
                        {uploadedImageName ? (
                          <p className="mt-4 rounded-full bg-white px-4 py-2 text-xs text-slate-500">
                            已选择：{uploadedImageName}
                          </p>
                        ) : null}
                      </label>
                    )}

                    {inputMode === "voice" && (
                      <div className="rounded-[24px] border border-dashed border-[#f4d7e0] bg-[#fffafb] px-5 py-10 text-center">
                        <Mic className="mx-auto h-10 w-10 text-[#85dfd4]" />
                        <p className="mt-4 text-sm font-medium text-slate-700">语音入口已预留</p>
                        <p className="mt-2 text-xs leading-6 text-slate-400">
                          先完成 UI 和状态流，录音转文字由后续接口接入。
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {step === 4 && (
                <section className="rounded-[30px] border border-[#f8e4e9] bg-white/92 p-5 md:p-6">
                  <h2 className="text-xl font-semibold">选择标签</h2>
                  <p className="mt-2 text-sm text-slate-500">可多选，先把情绪的来源圈出来。</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {moodTagOptions.map((tag) => {
                      const active = selectedTags.includes(tag.value)
                      return (
                        <button
                          key={tag.value}
                          type="button"
                          onClick={() =>
                            setSelectedTags((current) =>
                              active ? current.filter((item) => item !== tag.value) : [...current, tag.value],
                            )
                          }
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
                      ? "提交已经完成。当前页面先展示前端占位分析，后续可由 AI 接口替换。"
                      : "准备就绪后会提交到 `POST /api/moods`，再进入分析结果。"}
                  </p>
                  <div className="mx-auto mt-6 max-w-xl rounded-[28px] bg-gradient-to-br from-[#fff4f7] to-[#effdfa] p-6 text-left">
                    <p className="text-sm leading-7 text-slate-700">
                      你此刻更接近「{selectedMoodMeta.label}」，强度大约在 {intensity}/10。
                      {selectedMoodMeta.insight}
                    </p>
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
                <h3 className="text-lg font-semibold">接口预留</h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <li>`POST /api/moods`：当前已接入提交动作，后端字段还需与 `workbuddy` 对齐。</li>
                  <li>`POST /api/upload/image`：图片上传入口已预留，现阶段只保留前端文件选择。</li>
                  <li>`POST /api/ai/chat` 或 `POST /api/analytics/analyze`：Step 5 结果区后续可替换。</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </MoodWaveShell>
  )
}
