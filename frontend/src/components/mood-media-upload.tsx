"use client"

import Image from "next/image"
import { ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type MoodImageAttachment = {
  id: string
  file: File
  previewUrl: string
}

type MoodMediaUploadProps = {
  images: MoodImageAttachment[]
  onImagesChange: (images: MoodImageAttachment[]) => void
  className?: string
}

export function MoodMediaUpload({ images, onImagesChange, className }: MoodMediaUploadProps) {
  function handleFiles(files: FileList | null) {
    if (!files) return
    const remainingSlots = Math.max(0, 3 - images.length)
    const nextImages = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingSlots)
      .map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }))

    if (nextImages.length > 0) onImagesChange([...images, ...nextImages])
  }

  function removeImage(id: string) {
    const target = images.find((image) => image.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onImagesChange(images.filter((image) => image.id !== id))
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => (
          <div key={image.id} className="relative aspect-square overflow-hidden rounded-[22px] bg-[#fff4f7] ring-1 ring-[#f7dce4]">
            <Image src={image.previewUrl} alt="" fill sizes="140px" className="object-cover" />
            <button
              type="button"
              onClick={() => removeImage(image.id)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/88 text-slate-500 shadow-sm transition hover:text-[#ff6f88]"
              aria-label="删除图片"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {images.length < 3 ? (
          <label className="flex aspect-square min-h-[100px] min-w-[100px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-[#f4d7e0] bg-[#fffafb] text-center transition hover:-translate-y-0.5 hover:bg-white">
            <ImagePlus className="h-6 w-6 text-[#ff87a0]" />
            <span className="mt-2 text-xs font-medium text-slate-500">添加图片</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
          </label>
        ) : null}
      </div>
      <p className="text-xs text-slate-400">最多 3 张，图片会与文字一起用于情绪分析。</p>
    </div>
  )
}
