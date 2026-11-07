"use client"

import { useEffect } from "react"

/**
 * Registers the offline service worker once the page is interactive. The
 * worker itself never runs the queue: it serves cached app shells offline and
 * nudges pages to flush through messages.
 */
export function SwRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => undefined)
  }, [])

  return null
}
