"use client"

import { useSyncExternalStore } from "react"

const THEME_STORAGE_KEY = "weight-tracker-theme"

function subscribeToThemeChanges(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

  return () => observer.disconnect()
}

function getThemeSnapshot(): boolean {
  return document.documentElement.classList.contains("dark")
}

function getServerThemeSnapshot(): boolean {
  return false
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    getServerThemeSnapshot,
  )

  function handleToggle() {
    const nextIsDark = !isDark

    document.documentElement.classList.toggle("dark", nextIsDark)
    localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? "dark" : "light")
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Usar el tema claro" : "Usar el tema oscuro"}
      aria-pressed={isDark}
      className="flex size-9 items-center justify-center rounded-control bg-surface text-ink shadow-[0_4px_12px_rgba(150,95,45,0.12)] transition-opacity hover:opacity-80"
    >
      {isDark ? (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  )
}
