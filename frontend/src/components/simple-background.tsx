'use client'

// 极简版背景 - 无动画，性能最佳
export function SimpleBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* 静态渐变背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20" />

      {/* 静态装饰光斑 */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  )
}
