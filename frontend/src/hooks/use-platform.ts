"use client"

import { useState, useEffect } from "react"
import {
  isApp as checkIsApp,
  isIOSApp as checkIsIOSApp,
  isAndroid as checkIsAndroid,
  isWeb as checkIsWeb,
} from "@/lib/platform"
import { useIsMobile } from "@/hooks/use-mobile"

export function useIsAppPlatform() {
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    setMounted(true)
  }, [])

  const iosAppMode = mounted ? checkIsIOSApp() : false
  const mobileLike = mounted ? isMobile : false

  return {
    isApp: mounted ? checkIsApp() : false,
    isIOSApp: iosAppMode,
    isAndroid: mounted ? checkIsAndroid() : false,
    isWeb: mounted ? checkIsWeb() : true,
    iosApp: iosAppMode || mobileLike,
    mounted,
  }
}
