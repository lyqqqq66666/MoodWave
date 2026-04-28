'use client'

import { cn, getMoodColor, getMoodEmoji, getMoodLabel } from '@/lib/utils'
import { motion } from 'framer-motion'
import { MoodType } from '@/lib/types'

interface MoodSelectorProps {
  value?: MoodType
  onChange: (mood: MoodType) => void
  className?: string
}

const moods: MoodType[] = ['happy', 'sad', 'angry', 'anxious', 'calm', 'neutral']

export function MoodSelector({ value, onChange, className }: MoodSelectorProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-4', className)}>
      {moods.map((mood, index) => {
        const isSelected = value === mood
        const color = getMoodColor(mood)
        const emoji = getMoodEmoji(mood)
        const label = getMoodLabel(mood)

        return (
          <motion.button
            key={mood}
            type="button"
            onClick={() => onChange(mood)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'relative flex flex-col items-center justify-center p-6 rounded-2xl',
              'border-2 transition-all duration-300',
              'hover:shadow-lg',
              isSelected
                ? 'border-current shadow-mood'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            )}
            style={{
              color: isSelected ? color : undefined,
              backgroundColor: isSelected ? `${color}15` : undefined,
            }}
          >
            {/* 发光效果 */}
            {isSelected && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  boxShadow: `0 0 30px ${color}40`,
                }}
              />
            )}

            {/* 表情符号 */}
            <span className="text-4xl mb-2">{emoji}</span>

            {/* 标签 */}
            <span
              className={cn(
                'text-sm font-medium',
                isSelected
                  ? 'text-current'
                  : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {label}
            </span>

            {/* 选中指示器 */}
            {isSelected && (
              <motion.div
                layoutId="mood-indicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                style={{ backgroundColor: color }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
