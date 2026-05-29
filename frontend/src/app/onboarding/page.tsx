"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { hasCompletedOnboarding } from "@/lib/onboarding"
import { useOnboardingStore } from "@/store/onboarding"

export default function OnboardingPage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const resetOnboarding = useOnboardingStore((state) => state.reset)

  useEffect(() => {
    const restart = new URLSearchParams(window.location.search).get("restart") === "1"
    if (restart) {
      resetOnboarding()
    }
    if (!restart && hasCompletedOnboarding()) {
      router.replace("/dashboard")
      return
    }
    setIsReady(true)
  }, [resetOnboarding, router])

  if (!isReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8f2]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ffd9e2] border-t-[#8de1d5]" />
      </main>
    )
  }

  return <OnboardingFlow />
}
