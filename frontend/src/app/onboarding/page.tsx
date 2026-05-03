"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { hasCompletedOnboarding } from "@/lib/onboarding"

export default function OnboardingPage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (hasCompletedOnboarding()) {
      router.replace("/dashboard")
      return
    }
    setIsReady(true)
  }, [router])

  if (!isReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8f2]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ffd9e2] border-t-[#8de1d5]" />
      </main>
    )
  }

  return <OnboardingFlow />
}
