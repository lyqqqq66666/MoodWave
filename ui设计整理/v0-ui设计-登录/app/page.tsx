import { MeshBackground } from "@/components/mesh-background"
import { LoginCard } from "@/components/login-card"

export default function Page() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden">
      {/* Flowing aurora mesh gradient background */}
      <MeshBackground />

      {/* Login Card */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4">
        <LoginCard />

        {/* Footer text */}
        <p className="mt-8 text-center text-xs text-muted-foreground/40">
          MoodWave &copy; 2026 &middot; 让每一份情绪都值得被温柔以待
        </p>
      </div>
    </main>
  )
}
