export function GlassOrbs() {
  return (
    <>
      {/* Large orb - top right of card */}
      <div
        className="animate-float-orb animate-gentle-pulse pointer-events-none absolute -right-12 -top-10 z-10 h-24 w-24 md:-right-16 md:-top-14 md:h-32 md:w-32"
        aria-hidden="true"
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(183,148,224,0.15) 40%, rgba(125,200,240,0.1) 60%, rgba(245,180,160,0.08) 80%, transparent)',
            boxShadow:
              'inset 0 -4px 12px rgba(183,148,224,0.15), inset 0 4px 8px rgba(255,255,255,0.6), 0 8px 32px rgba(183,148,224,0.1)',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
        />
      </div>

      {/* Small orb - bottom left of card */}
      <div
        className="animate-float-orb-reverse animate-gentle-pulse pointer-events-none absolute -bottom-6 -left-8 z-10 h-14 w-14 md:-bottom-8 md:-left-12 md:h-20 md:w-20"
        aria-hidden="true"
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(125,200,240,0.2) 40%, rgba(245,180,160,0.1) 70%, transparent)',
            boxShadow:
              'inset 0 -3px 8px rgba(125,200,240,0.15), inset 0 3px 6px rgba(255,255,255,0.5), 0 6px 24px rgba(125,200,240,0.1)',
            border: '1px solid rgba(255,255,255,0.45)',
          }}
        />
      </div>

      {/* Tiny teardrop orb - right side */}
      <div
        className="animate-float-orb pointer-events-none absolute -right-4 bottom-1/3 z-10 h-8 w-8 md:-right-6 md:h-12 md:w-12"
        style={{ animationDelay: '2s' }}
        aria-hidden="true"
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85), rgba(245,180,160,0.2) 50%, transparent)',
            boxShadow:
              'inset 0 -2px 6px rgba(245,180,160,0.1), inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 16px rgba(245,180,160,0.08)',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        />
      </div>
    </>
  )
}
