"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Pause, Play } from "lucide-react"
import { getMoodOption } from "@/lib/moodwave"
import type { MoodType } from "@/lib/types"

type MiniMusicVisualizerProps = {
  mood: MoodType
}

const previewNotes: Record<MoodType, string[]> = {
  happy: ["C4", "E4", "G4", "C5"],
  calm: ["D4", "F#4", "A4", "E5"],
  anxious: ["A3", "C4", "E4", "B4"],
  angry: ["E3", "G3", "B3", "D4"],
  sad: ["F3", "A3", "C4", "E4"],
  neutral: ["G3", "B3", "D4", "A4"],
}

type ToneModule = typeof import("tone/build/esm/index")

export function MiniMusicVisualizer({ mood }: MiniMusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const toneRef = useRef<ToneModule | null>(null)
  const synthRef = useRef<InstanceType<ToneModule["PolySynth"]> | null>(null)
  const loopRef = useRef<{ dispose: () => void } | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const meta = getMoodOption(mood)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const energy = isPlaying ? 1.15 : 0.48
      const t = time / 1000

      ctx.clearRect(0, 0, width, height)
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, "rgba(255,255,255,0.86)")
      bg.addColorStop(0.52, `${meta.accent}28`)
      bg.addColorStop(1, "rgba(141,225,213,0.28)")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      for (let ring = 0; ring < 4; ring += 1) {
        ctx.beginPath()
        ctx.arc(width / 2, height / 2, 28 + ring * 26 + Math.sin(t * 1.8 + ring) * 6 * energy, 0, Math.PI * 2)
        ctx.strokeStyle = ring % 2 === 0 ? `${meta.accent}55` : "rgba(141,225,213,0.45)"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      for (let i = 0; i < 44; i += 1) {
        const angle = (Math.PI * 2 * i) / 44 + t * 0.24
        const radius = 42 + Math.sin(t * 2.2 + i) * 18 * energy + (i % 5) * 8
        const x = width / 2 + Math.cos(angle) * radius
        const y = height / 2 + Math.sin(angle) * radius
        ctx.beginPath()
        ctx.arc(x, y, 2 + ((i + Math.floor(t * 8)) % 4), 0, Math.PI * 2)
        ctx.fillStyle = i % 3 === 0 ? `${meta.accent}aa` : "rgba(141,225,213,0.72)"
        ctx.fill()
      }

      animationRef.current = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    animationRef.current = window.requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", resize)
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, meta.accent])

  useEffect(() => {
    return () => stop()
  }, [])

  function stop() {
    const Tone = toneRef.current
    Tone?.Transport.stop()
    Tone?.Transport.cancel()
    loopRef.current?.dispose()
    synthRef.current?.dispose()
    loopRef.current = null
    synthRef.current = null
    setIsPlaying(false)
  }

  async function toggle() {
    if (isPlaying) {
      stop()
      return
    }
    const Tone = toneRef.current ?? (await import("tone/build/esm/index"))
    toneRef.current = Tone
    await Tone.start()
    stop()
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: mood === "happy" ? "triangle" : "sine" },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.32, release: 1.1 },
      volume: -18,
    }).toDestination()
    let index = 0
    loopRef.current = new Tone.Loop((time) => {
      const notes = previewNotes[mood]
      synthRef.current?.triggerAttackRelease(notes[index % notes.length], "8n", time, 0.42)
      index += 1
    }, mood === "happy" ? "8n" : "4n").start(0)
    Tone.Transport.start()
    setIsPlaying(true)
    window.setTimeout(stop, 10000)
  }

  return (
    <div className="relative aspect-[16/11] overflow-hidden rounded-[30px] border border-white/75 bg-white/80 shadow-[0_20px_60px_rgba(255,181,194,0.18)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-5 top-5 flex items-center justify-between">
        <div className="rounded-full bg-white/72 px-4 py-2 text-sm font-semibold text-slate-700 backdrop-blur-md">
          {meta.emoji} {meta.label}模式
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={toggle}
          className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-r from-[#ff97ad] to-[#8de1d5] text-white shadow-[0_14px_30px_rgba(255,151,173,0.28)]"
          aria-label={isPlaying ? "暂停试听" : "试听"}
          title={isPlaying ? "暂停" : "试听"}
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
        </motion.button>
      </div>
      <div className="absolute inset-x-5 bottom-5 rounded-[24px] bg-white/66 px-4 py-3 text-sm text-slate-600 backdrop-blur-md">
        粒子、波纹和节奏会跟着心情一起流动。
      </div>
    </div>
  )
}
