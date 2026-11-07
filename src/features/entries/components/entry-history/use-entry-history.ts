"use client"

import { useCallback, useMemo, useState } from "react"

import {
  instantWithNowTimeOfDay,
  groupDayKey,
  todayKeyInTimeZone,
} from "@/features/entries/entry-format"
import {
  FUTURE_MEASURED_MESSAGE,
  parseNoteInput,
  parseWeightInput,
} from "@/features/entries/validation"
import type { EntryHistoryData } from "@/features/entries/sheet-data"

import { useEntrySync, type UseEntrySyncReturn } from "../../offline/use-entry-sync"
import type { EditEntryOp } from "../../sync-batch"
import { displayWeightValue } from "@/lib/weight-units"

const MEASURED_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type EntryHistoryDraft = {
  readonly weightText: string
  readonly measuredOn: string
  readonly noteText: string
}

export type UseEntryHistoryReturn = {
  readonly editingEntryId: string | null
  readonly draft: EntryHistoryDraft | null
  readonly deleteTargetId: string | null
  readonly errorMessage: string | null
  readonly syncState: UseEntrySyncReturn
  readonly startEdit: (entryId: string) => void
  readonly cancelEdit: () => void
  readonly updateDraft: (draft: Partial<EntryHistoryDraft>) => void
  readonly saveEdit: () => Promise<void>
  readonly requestDelete: (entryId: string) => void
  readonly confirmDelete: () => Promise<void>
  readonly cancelDelete: () => void
  readonly clearError: () => void
}

const NOTHING_TO_CHANGE_MESSAGE = "No hay nada para corregir en esa pesada."

/**
 * The history's client workflow: inline editing for the day and the value,
 * deletion behind an explicit confirmation, both queued through the local queue.
 */
export function useEntryHistory(data: EntryHistoryData): UseEntryHistoryReturn {
  const syncState = useEntrySync()
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EntryHistoryDraft | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const entryById = useMemo(
    () => new Map(data.entries.map((entry) => [entry.id, entry])),
    [data.entries],
  )

  const startEdit = useCallback(
    (entryId: string): void => {
      const entry = entryById.get(entryId)

      if (!entry) {
        return
      }

      setEditingEntryId(entryId)

      setDraft({
        weightText: entry.weightVisible && entry.weightKg !== null
          ? String(displayWeightValue(entry.weightKg, data.subject.unit))
          : "",
        measuredOn: groupDayKey(entry.measuredAt, data.timezone),
        noteText: entry.note ?? "",
      })
      setErrorMessage(null)
    },
    [data.subject.unit, data.timezone, entryById],
  )

  const cancelEdit = useCallback((): void => {
    setEditingEntryId(null)
    setDraft(null)
    setErrorMessage(null)
  }, [])

  const updateDraft = useCallback((updates: Partial<EntryHistoryDraft>): void => {
    setDraft((previousDraft) =>
      previousDraft ? { ...previousDraft, ...updates } : (previousDraft as null),
    )
  }, [])

  const saveEdit = useCallback(async (): Promise<void> => {
    const entry = editingEntryId ? entryById.get(editingEntryId) : null

    if (!entry || !draft) {
      setErrorMessage(NOTHING_TO_CHANGE_MESSAGE)
      return
    }

    let weightKg: number | undefined

    if (draft.weightText.trim() !== "") {
      const parsedWeight = parseWeightInput(draft.weightText, data.subject.unit)

      if (!parsedWeight.ok) {
        setErrorMessage(parsedWeight.message)
        return
      }

      weightKg = parsedWeight.weightKg
    }

    if (!MEASURED_DAY_PATTERN.test(draft.measuredOn) || draft.measuredOn > todayKeyInTimeZone(data.timezone)) {
      setErrorMessage(FUTURE_MEASURED_MESSAGE)
      return
    }

    let note: string | null | undefined

    if (entry.note !== null) {
      const parsedNote = parseNoteInput(draft.noteText)

      if (!parsedNote.ok) {
        setErrorMessage(parsedNote.message)
        return
      }

      note = parsedNote.note
    }

    const dayChanged = draft.measuredOn !== groupDayKey(entry.measuredAt, data.timezone)

    if (weightKg === undefined && !dayChanged && note === undefined) {
      setErrorMessage(NOTHING_TO_CHANGE_MESSAGE)
      return
    }

    const opId = crypto.randomUUID()

    const op: EditEntryOp = {
      type: "edit",
      opId,
      entryId: entry.id,
      ...(weightKg !== undefined ? { weightKg } : {}),
      ...(dayChanged ? { measuredAt: instantWithNowTimeOfDay(draft.measuredOn, data.timezone) } : {}),
      ...(note !== undefined ? { note: note ?? "" } : {}),
    }

    setEditingEntryId(null)
    setDraft(null)
    setErrorMessage(null)
    await syncState.enqueueOp(op)
  }, [data.subject.unit, data.timezone, draft, editingEntryId, entryById, syncState])

  const requestDelete = useCallback((entryId: string): void => {
    setDeleteTargetId(entryId)
  }, [])

  const confirmDelete = useCallback(async (): Promise<void> => {
    const targetId = deleteTargetId

    setDeleteTargetId(null)

    if (!targetId) {
      return
    }

    await syncState.enqueueOp({
      type: "delete",
      opId: crypto.randomUUID(),
      entryId: targetId,
    })
  }, [deleteTargetId, syncState])

  const cancelDelete = useCallback((): void => {
    setDeleteTargetId(null)
  }, [])

  const clearError = useCallback((): void => {
    setErrorMessage(null)
  }, [])

  return {
    editingEntryId,
    draft,
    deleteTargetId,
    errorMessage,
    syncState,
    startEdit,
    cancelEdit,
    updateDraft,
    saveEdit,
    requestDelete,
    confirmDelete,
    cancelDelete,
    clearError,
  }
}
