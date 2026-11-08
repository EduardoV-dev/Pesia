"use client"

import { useCallback, useSyncExternalStore } from "react"

export type InstallAvailability = "standalone" | "promptable" | "guide" | "unavailable"

type BeforeInstallPromptEvent = Event & {
  readonly prompt: () => Promise<void>
  readonly userChoice: Promise<{ readonly outcome: "accepted" | "dismissed" }>
}

const AFTER_INSTALL_EVENT = "appinstalled"

/** The captured Chromium prompt, if the event arrived while the page was mounted. */
let capturedPromptEvent: BeforeInstallPromptEvent | null = null

/**
 * The browser decides the affordance: Chromium offers the prompt (captured
 * here so the app shows it in Spanish), iOS Safari only offers the
 * "Add to Home Screen" menu (guidance text), and everything else stays quiet.
 */
export function useInstallPrompt(): {
  readonly availability: InstallAvailability
  promptInstall: () => Promise<void>
} {
  const availability = useSyncExternalStore(subscribeToInstallEvents, detectAvailability, () => "unavailable" as const)

  const promptInstall = useCallback(async (): Promise<void> => {
    const promptEvent = capturedPromptEvent

    if (!promptEvent) {
      return
    }

    await promptEvent.prompt()
    capturedPromptEvent = null
  }, [])

  return { availability, promptInstall }
}

function subscribeToInstallEvents(onStoreChange: () => void): () => void {
  const captureEvent = (event: Event): void => {
    event.preventDefault()
    capturedPromptEvent = event as BeforeInstallPromptEvent
    onStoreChange()
  }

  const markInstalled = (): void => {
    capturedPromptEvent = null
    onStoreChange()
  }

  window.addEventListener("beforeinstallprompt", captureEvent)
  window.addEventListener(AFTER_INSTALL_EVENT, markInstalled)

  return () => {
    window.removeEventListener("beforeinstallprompt", captureEvent)
    window.removeEventListener(AFTER_INSTALL_EVENT, markInstalled)
  }
}

function detectAvailability(): InstallAvailability {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || "standalone" in window.navigator

  if (standalone) {
    return "standalone"
  }

  if (capturedPromptEvent) {
    return "promptable"
  }

  if (isIosSafariLike()) {
    return "guide"
  }

  return "unavailable"
}

function isIosSafariLike(): boolean {
  const userText = navigator.userAgent

  const appleMobile = /iphone|ipad|ipod/i.test(userText)
  const ipadMasked =
    /macintosh/i.test(userText) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1

  return appleMobile || ipadMasked
}
