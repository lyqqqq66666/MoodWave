'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, useCallback, useRef } from 'react'

export function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const rafRef = useRef<number>()

  // 使用 requestAnimationFrame 节流鼠标移动事件
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [handleMouseMove])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* 渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20" />

      {/* 动态光斑 1 - 优化版 */}
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
        animate={{
          x: mousePosition.x * 80 - 40,
          y: mousePosition.y * 80 - 40,
          scale: [1, 1.1, 1],
        }}
        transition={{
          x: { type: 'tween', duration: 0.5, ease: 'easeOut' },
          y: { type: 'tween', duration: 0.5, ease: 'easeOut' },
          scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* 动态光斑 2 - 优化版 */}
      <motion.div
        className="absolute right-0 bottom-0 w-96 h-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
        animate={{
          x: -mousePosition.x * 60 + 30,
          y: -mousePosition.y * 60 + 30,
          scale: [1, 1.15, 1],
        }}
        transition={{
          x: { type: 'tween', duration: 0.6, ease: 'easeOut' },
          y: { type: 'tween', duration: 0.6, ease: 'easeOut' },
          scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* 静态网格背景 - 移除了第三个光斑以提升性能 */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  )
}
