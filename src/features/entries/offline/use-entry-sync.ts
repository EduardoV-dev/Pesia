"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"

import type { ApplyEntryOpsView, EntryOpVerdict } from "@/features/entries/entry-view"
import type { EntryOpInput } from "@/features/entries/sync-batch"
import type { ApiResponse } from "@/lib/api-response"

import { buildFlushBatches, foldFlushIntoQueue } from "./entry-ops"
import type { QueuedEntryOp } from "./entry-ops"
import { deleteOpRecords, loadOpRecords, putOpRecord } from "./offline-db"

export type EntrySyncEntryStatus = {
  readonly state: "queued" | "saved" | "failed"
  readonly reason: string | null
}

export type UseEntrySyncReturn = {
  readonly isOnline: boolean
  readonly pendingCount: number
  readonly statuses: Readonly<Record<string, EntrySyncEntryStatus>>
  readonly enqueueOp: (op: EntryOpInput) => Promise<void>
}

export const BACKGROUND_SYNC_TAG = "entry-flush"

/** The browser's own online signal is an external store; SSR renders as online. */
const subscribeToConnectivity = (onChanged: () => void): (() => void) => {
  window.addEventListener("online", onChanged)
  window.addEventListener("offline", onChanged)

  return () => {
    window.removeEventListener("online", onChanged)
    window.removeEventListener("offline", onChanged)
  }
}

const readConnectivity = (): boolean => window.navigator.onLine

const FLUSH_WATCHDOG_MS = 15000
const MAX_AUTO_RETRIES = 3
const RETRY_DELAY_MS = 3000

/**
 * The page-side entry queue: it owns the IndexedDB records, flushes them on
 * app mount, on reconnect and on the service worker's Background Sync nudge,
 * and reports per-entry queued/saved/failed states for the badges.
 */
export function useEntrySync(): UseEntrySyncReturn {
  const router = useRouter()
  const isMountedRef = useRef(false)
  const flushInFlightRef = useRef(false)
  const flushRef = useRef<() => Promise<void>>(async () => undefined)
  const isOnline = useSyncExternalStore(subscribeToConnectivity, readConnectivity, () => true)
  const [pendingCount, setPendingCount] = useState(0)
  const [statuses, setStatuses] = useState<Readonly<Record<string, EntrySyncEntryStatus>>>({})

  const hydrateFromRecords = useCallback((records: readonly QueuedEntryOp[]) => {
    const hydrated: Record<string, EntrySyncEntryStatus> = {}

    for (const record of records) {
      hydrated[record.entryId] =
        record.status === "failed"
          ? { state: "failed", reason: record.errorMessage }
          : { state: "queued", reason: null }
    }

    setStatuses(hydrated)
    setPendingCount(records.filter((record) => record.status === "pending").length)
  }, [])

  const flushRefImpl = useCallback(async () => {
    if (!isMountedRef.current) {
      return
    }

    if (flushInFlightRef.current) {
      return
    }

    flushInFlightRef.current = true

    let savedAny = false

    try {
      const records = await loadOpRecords()

      // The badge states come from the queue itself: failed reasons must show
      // even when nothing can flush.
      hydrateFromRecords(records)

      if (!window.navigator.onLine) {
        return
      }

      for (const batch of buildFlushBatches(records)) {
        const flushedIds = batch.map((record) => record.opId)

        const verdicts = await fetchOpVerdicts(batch).catch(() => undefined)
        const outcome = foldFlushIntoQueue(records, flushedIds, verdicts)

        for (const savedOpId of outcome.savedOpIds) {
          const savedEntry = records.find((record) => record.opId === savedOpId)?.entryId

          if (savedEntry) {
            savedAny = true
            setStatuses((previousStatuses) => ({
              ...previousStatuses,
              [savedEntry]: { state: "saved", reason: null },
            }))
          }
        }

        for (const failure of outcome.failed) {
          setStatuses((previousStatuses) => ({
            ...previousStatuses,
            [failure.entryId]: { state: "failed", reason: failure.reason },
          }))
        }

        await persistAfterFlush(records, flushedIds, outcome)
      }

      hydrateFromRecords(await loadOpRecords())

      // A switch of the network state can strand a request in flight; the
      // bounded retry covers it instead of waiting forever for a new trigger.
      const retryable = (await loadOpRecords()).filter(
        (record) => record.status === "pending" && record.attempts < MAX_AUTO_RETRIES,
      )

      if (retryable.length > 0) {
        setTimeout(() => void flushRef.current(), RETRY_DELAY_MS)
      }
    } finally {
      flushInFlightRef.current = false
    }

    // The server render now includes what the queue synced; badges come from it.
    if (savedAny) {
      router.refresh()
    }
  }, [hydrateFromRecords, router])

  useEffect(() => {
    flushRef.current = flushRefImpl
  }, [flushRefImpl])

  // The online event can land while this component hydrates; connection
  // transitions retrigger the flush through this effect instead.
  useEffect(() => {
    if (isOnline) {
      void flushRef.current()
    }
  }, [isOnline])

  const enqueueOp = useCallback(
    async (op: EntryOpInput) => {
      // A correction replaces any op still queued or failed for the same entry.
      const records = await loadOpRecords()
      const replaced = records
        .filter((existing) => existing.entryId === op.entryId)
        .map((existing) => existing.opId)

      await deleteOpRecords(replaced)
      await putOpRecord({
        opId: op.opId,
        entryId: op.entryId,
        payload: op,
        status: "pending",
        attempts: 0,
        errorMessage: null,
        createdAt: Date.now(),
      })

      setStatuses((previousStatuses) => ({
        ...previousStatuses,
        [op.entryId]: { state: "queued", reason: null },
      }))
      setPendingCount((previousCount) => previousCount + 1 - replaced.length)

      if (window.navigator.onLine) {
        void registerBackgroundSync()
        await flushRef.current()
      }
    },
    [],
  )

  useEffect(() => {
    isMountedRef.current = true

    const handleOnline = () => {
      void flushRef.current()
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === BACKGROUND_SYNC_TAG) {
        void flushRef.current()
      }
    }

    void flushRef.current()

    window.addEventListener("online", handleOnline)
    navigator.serviceWorker?.addEventListener("message", handleMessage)

    return () => {
      isMountedRef.current = false
      window.removeEventListener("online", handleOnline)
      navigator.serviceWorker?.removeEventListener("message", handleMessage)
    }
  }, [])

  return { isOnline, pendingCount, statuses, enqueueOp }
}

async function fetchOpVerdicts(
  batch: readonly QueuedEntryOp[],
): Promise<readonly { readonly opId: string; readonly status: "saved" | "failed"; readonly reason?: string }[]> {
  const response = await fetch("/api/entries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ops: batch.map((record) => record.payload) }),
    // A stalled connection must not hold the queue hostage; the fold keeps
    // the op pending and the bounded retry picks it up.
    signal: AbortSignal.timeout(FLUSH_WATCHDOG_MS),
  })

  if (!response.ok) {
    throw new Error(`El servidor rechazó el envío (${response.status}).`)
  }

  const body = (await response.json()) as ApiResponse<ApplyEntryOpsView>

  if (!body.ok) {
    throw new Error(body.message)
  }

  return body.data.results.map((verdict: EntryOpVerdict) => verdict)
}

/** Persists the fold: saved ops leave the store, retried/failed keep their state. */
async function persistAfterFlush(
  records: readonly QueuedEntryOp[],
  flushedIds: readonly string[],
  outcome: ReturnType<typeof foldFlushIntoQueue>,
): Promise<void> {
  const remainingById = new Map(outcome.remaining.map((record) => [record.opId, record]))

  for (const record of records) {
    if (!flushedIds.includes(record.opId)) {
      continue
    }

    const nextRecord = remainingById.get(record.opId)

    if (nextRecord) {
      await putOpRecord(nextRecord)
    } else {
      await deleteOpRecords([record.opId])
    }
  }
}

async function registerBackgroundSync(): Promise<void> {
  const registration = await navigator.serviceWorker?.ready

  if (!registration || !("sync" in registration)) {
    return
  }

  // Background Sync is Chromium-only; iOS Safari flushes on reconnect and app
  // open anyway, so registration failures are irrelevant to correctness.
  const syncManager = (registration as unknown as SyncManagerShape).sync

  await syncManager.register(BACKGROUND_SYNC_TAG).catch(() => undefined)
}

/** The SyncManager shape lands in lib types later; this surface is stable. */
type SyncManagerShape = {
  readonly sync: {
    readonly register: (tag: string) => Promise<void>
  }
}
