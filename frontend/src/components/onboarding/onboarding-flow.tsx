"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { onboardingSteps } from "@/lib/onboarding"
import { useOnboardingStore } from "@/store/onboarding"
import { cn } from "@/lib/utils"
import { OnboardingStep1 } from "./onboarding-step-1"
import { OnboardingStep2 } from "./onboarding-step-2"
import { OnboardingStep3 } from "./onboarding-step-3"
import { OnboardingStep4 } from "./onboarding-step-4"
import { OnboardingStep5 } from "./onboarding-step-5"

export function OnboardingFlow() {
  const router = useRouter()
  const { currentStep, isCompleted, isLoadingAI, setStep, nextStep, prevStep, skipAll, complete, analyzeDemo } = useOnboardingStore()

  useEffect(() => {
    if (isCompleted) router.replace("/dashboard")
  }, [isCompleted, router])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skipAll()
      if (event.key === "ArrowLeft") prevStep()
      if (event.key === "ArrowRight") {
        if (currentStep === 3) void analyzeDemo()
        else nextStep()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [analyzeDemo, currentStep, nextStep, prevStep, skipAll])

  function handleComplete() {
    complete()
    router.push("/dashboard")
  }

  function primaryAction() {
    if (currentStep === 0) nextStep()
    else if (currentStep === 3) void analyzeDemo()
    else if (currentStep === 4) handleComplete()
    else nextStep()
  }

  const content = [
    <OnboardingStep1 key="step-1" onStart={nextStep} />,
    <OnboardingStep2 key="step-2" />,
    <OnboardingStep3 key="step-3" />,
    <OnboardingStep4 key="step-4" />,
    <OnboardingStep5 key="step-5" onComplete={handleComplete} />,
  ][currentStep]

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(255,210,221,0.78),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(180,242,232,0.74),_transparent_28%),radial-gradient(circle_at_bottom_center,_rgba(210,198,255,0.44),_transparent_30%),linear-gradient(180deg,#fffdfb_0%,#fff7f0_100%)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] text-slate-800">
      <div className="pointer-events-none absolute left-[-90px] top-24 h-72 w-72 rounded-full bg-[#ffdce6]/70 blur-3xl" />
      <div className="pointer-events-none absolute right-[-80px] top-10 h-80 w-80 rounded-full bg-[#c9fff3]/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#d7ccff]/45 blur-3xl" />

      <button
        type="button"
        onClick={skipAll}
        className="fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-30 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/72 px-4 text-sm font-semibold text-slate-500 shadow-[0_12px_28px_rgba(255,181,194,0.16)] backdrop-blur-xl transition hover:text-slate-800"
      >
        <X className="h-4 w-4" />
        跳过引导
      </button>

      <section className="relative z-10 mx-auto grid min-h-[100svh] w-full max-w-5xl grid-rows-[minmax(0,1fr)_auto] gap-5 py-14 md:py-16">
        <div className="flex min-h-0 items-center justify-center py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="w-full"
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
          <div className="flex items-center gap-2">
            {onboardingSteps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "h-4 rounded-full transition-all",
                  index === currentStep ? "w-9 bg-gradient-to-r from-[#ff97ad] to-[#8de1d5]" : "w-4 bg-white/82 shadow-sm",
                )}
                aria-label={step.label}
              />
            ))}
          </div>

          {currentStep > 0 && currentStep < 4 ? (
            <div className="grid w-full grid-cols-[52px_1fr] gap-3">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="grid min-h-[52px] place-items-center rounded-full bg-white/78 text-slate-500 shadow-sm transition hover:text-slate-800 disabled:opacity-40"
                aria-label="上一步"
                title="上一步"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={primaryAction}
                disabled={isLoadingAI}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff97ad] via-[#ffc2cf] to-[#8de1d5] px-6 font-semibold text-white shadow-[0_16px_34px_rgba(255,151,173,0.26)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
              >
                {currentStep === 3 ? "分析我的心情" : "继续"}
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
