'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useState } from 'react'

interface IntensitySliderProps {
  value: number
  onChange: (value: number) => void
  moodColor?: string
  className?: string
}

export function IntensitySlider({
  value,
  onChange,
  moodColor = '#8B5CF6',
  className,
}: IntensitySliderProps) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标签和数值 */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          情绪强度
        </label>
        <motion.span
          key={value}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-2xl font-bold"
          style={{ color: moodColor }}
        >
          {value}
        </motion.span>
      </div>

      {/* 滑块容器 */}
      <div className="relative">
        {/* 背景轨道 */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* 填充轨道 */}
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: moodColor }}
            initial={{ width: 0 }}
            animate={{ width: `${(value / 10) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* 滑块输入 */}
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* 滑块手柄 */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `calc(${((value - 1) / 9) * 100}% - 12px)`,
          }}
          animate={{
            scale: isDragging ? 1.2 : 1,
          }}
        >
          <div
            className="w-6 h-6 rounded-full border-4 border-white dark:border-gray-900 shadow-lg"
            style={{ backgroundColor: moodColor }}
          />
          {isDragging && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6, repeat: Infinity }}
              style={{ backgroundColor: moodColor }}
            />
          )}
        </motion.div>
      </div>

      {/* 刻度标签 */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}
