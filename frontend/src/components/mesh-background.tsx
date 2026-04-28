export function MeshBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* 基础画布 */}
      <div className="absolute inset-0 bg-[#F8FAFC]" />

      {/* 网格渐变色块 */}
      <div
        className="animate-mesh-1 absolute -left-1/4 -top-1/4 h-[70vh] w-[70vh] rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(183,148,224,0.5) 0%, rgba(183,148,224,0) 70%)',
        }}
      />
      <div
        className="animate-mesh-2 absolute -right-1/4 top-1/4 h-[60vh] w-[60vh] rounded-full opacity-35"
        style={{
          background:
            'radial-gradient(circle, rgba(125,200,240,0.5) 0%, rgba(125,200,240,0) 70%)',
        }}
      />
      <div
        className="animate-mesh-3 absolute -bottom-1/4 left-1/3 h-[55vh] w-[55vh] rounded-full opacity-35"
        style={{
          background:
            'radial-gradient(circle, rgba(245,180,160,0.5) 0%, rgba(245,180,160,0) 70%)',
        }}
      />

      {/* 用于增强层次感的细微辅助色块 */}
      <div
        className="animate-mesh-2 absolute right-1/4 top-1/2 h-[40vh] w-[40vh] rounded-full opacity-20"
        style={{
          background:
            'radial-gradient(circle, rgba(183,148,224,0.4) 0%, rgba(245,180,160,0.2) 50%, transparent 70%)',
        }}
      />
      <div
        className="animate-mesh-1 absolute bottom-1/4 left-1/4 h-[35vh] w-[35vh] rounded-full opacity-25"
        style={{
          background:
            'radial-gradient(circle, rgba(125,200,240,0.4) 0%, rgba(183,148,224,0.2) 50%, transparent 70%)',
        }}
      />
    </div>
  )
}
