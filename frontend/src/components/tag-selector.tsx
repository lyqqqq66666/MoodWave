'use client'

import { cn, getTagLabel } from '@/lib/utils'
import { motion } from 'framer-motion'
import { MoodTag } from '@/lib/types'

interface TagSelectorProps {
  value: MoodTag[]
  onChange: (tags: MoodTag[]) => void
  className?: string
}

const tags: MoodTag[] = ['work', 'love', 'health', 'study', 'family', 'social']

const tagIcons: Record<MoodTag, string> = {
  work: '💼',
  love: '❤️',
  health: '🏃',
  study: '📚',
  family: '👨‍👩‍👧‍👦',
  social: '🎉',
}

export function TagSelector({ value, onChange, className }: TagSelectorProps) {
  const toggleTag = (tag: MoodTag) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else {
      onChange([...value, tag])
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        选择标签（可多选）
      </label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => {
          const isSelected = value.includes(tag)
          const label = getTagLabel(tag)
          const icon = tagIcons[tag]

          return (
            <motion.button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                'border-2 transition-all duration-300',
                'text-sm font-medium',
                isSelected
                  ? 'border-brand-primary bg-brand-primary text-white shadow-md'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-brand-primary/50'
              )}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
