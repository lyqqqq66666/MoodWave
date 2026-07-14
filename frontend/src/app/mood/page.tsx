import { Suspense } from "react"
import MoodPageClient from "./mood-page-client"

export default function MoodPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ff9fb4] border-t-transparent" />
      </div>
    }>
      <MoodPageClient />
    </Suspense>
  )
}
