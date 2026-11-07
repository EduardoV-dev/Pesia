"use client"

import { useEffect, useState } from "react"

import { WeighInSheet } from "@/features/entries/components/weigh-in-sheet"
import { EntryHistory } from "@/features/entries/components/entry-history"
import { OFFLINE_STALENESS_MESSAGE, type EntryHistoryData, type WeighInSheetData } from "@/features/entries/sheet-data"
import { readCurrentKey, readSnapshot } from "@/features/entries/offline/offline-db"

/**
 * The shell the service worker serves when a navigation fails: queued writes
 * stay available and the last server payload renders from device snapshots,
 * clearly marked as stored on the device.
 */
export function OfflineShell() {
  const [sheetData, setSheetData] = useState<WeighInSheetData | null>(null)
  const [historyData, setHistoryData] = useState<EntryHistoryData | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let isCurrent = true

    void (async () => {
      const current = await readCurrentKey()

      if (current.sheetProfileId) {
        const snapshot = (await readSnapshot(`sheet:${current.sheetProfileId}`)) as
          | WeighInSheetData
          | undefined

        if (isCurrent && snapshot) {
          setSheetData(snapshot)
        }
      }

      if (current.historySubjectId) {
        const snapshot = (await readSnapshot(`history:${current.historySubjectId}`)) as
          | EntryHistoryData
          | undefined

        if (isCurrent && snapshot) {
          setHistoryData(snapshot)
        }
      }

      if (isCurrent) {
        setIsLoaded(true)
      }
    })()

    return () => {
      isCurrent = false
    }
  }, [])

  if (!isLoaded) {
    return null
  }

  if (!sheetData && !historyData) {
    return (
      <main className="flex-1 px-5 pb-8 pt-6">
        <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
          <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight">
            Estás sin conexión
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Todavía no hay pesadas guardadas en este dispositivo. Reconectá el teléfono y
            abrí Weight Tracker: todo lo que pesés queda guardado también acá.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-display mt-4 rounded-control bg-accent px-5 py-3 text-sm font-extrabold text-accent-ink hover:opacity-90"
          >
            Intentar de nuevo
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 px-5 pb-8 pt-6">
      <p className="mb-4 rounded-control bg-accent-soft px-4 py-3 text-xs font-semibold text-accent-strong">
        {OFFLINE_STALENESS_MESSAGE}
      </p>

      {sheetData ? <WeighInSheet data={sheetData} /> : null}

      {historyData ? (
        <div className="mt-5">
          <EntryHistory data={historyData} />
        </div>
      ) : null}
    </main>
  )
}
