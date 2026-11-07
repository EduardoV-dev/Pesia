"use client"

import { useMemo, useState } from "react"

import {
  instantWithNowTimeOfDay,
  todayKeyInTimeZone,
} from "@/features/entries/entry-format"
import {
  FUTURE_MEASURED_MESSAGE,
  parseNoteInput,
  parseWeightInput,
} from "@/features/entries/validation"
import type {
  WeighInSheetData,
  WeighInSheetMember,
} from "@/features/entries/sheet-data"

import { useEntrySync, type UseEntrySyncReturn } from "./use-entry-sync"
import type { CreateEntryOp } from "../sync-batch"
import type { EntryView } from "../entry-view"

const MEASURED_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const NO_ELECTION_MESSAGE = "Elegí a quién pesar."

export type SheetSessionItem = {
  readonly entryId: string
  readonly profileId: string
  readonly weightKg: number
  readonly note: string | null
}

export type UseWeighInSheetReturn = {
  readonly selectedMember: WeighInSheetMember | null
  readonly selectedMemberId: string | null
  readonly selectMember: (profileId: string) => void
  readonly weightText: string
  readonly setWeightText: (text: string) => void
  readonly measuredOn: string
  readonly setMeasuredOn: (dayKey: string) => void
  readonly noteText: string
  readonly setNoteText: (text: string) => void
  readonly errorMessage: string | null
  readonly clearError: () => void
  readonly lastSavedMember: WeighInSheetMember | null
  readonly nextMember: WeighInSheetMember | null
  readonly todayEntryByProfileId: Map<string, EntryView>
  readonly sessionItems: readonly SheetSessionItem[]
  readonly syncState: UseEntrySyncReturn
  readonly saveWeight: () => Promise<void>
}

/**
 * The sheet's client workflow: it validates exactly what the server will
 * validate, queues the op locally, and hands statuses to the UI for badges.
 * Every save is one explicit action; the sheet never advances on its own.
 */
export function useWeighInSheet(data: WeighInSheetData): UseWeighInSheetReturn {
  const syncState = useEntrySync()
  const viewerMember = useMemo(
    () => data.members.find((member) => member.isViewerProfile) ?? data.members[0] ?? null,
    [data.members],
  )

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    viewerMember?.profileId ?? null,
  )
  const [weightText, setWeightText] = useState("")
  const [measuredOn, setMeasuredOn] = useState(() => todayKeyInTimeZone(data.timezone))
  const [noteText, setNoteText] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastSavedProfileId, setLastSavedProfileId] = useState<string | null>(null)
  const [sessionItems, setSessionItems] = useState<readonly SheetSessionItem[]>([])

  const memberByProfileId = useMemo(
    () => new Map(data.members.map((member) => [member.profileId, member])),
    [data.members],
  )

  const selectedMember = selectedMemberId
    ? (memberByProfileId.get(selectedMemberId) ?? viewerMember)
    : viewerMember

  const todayEntryByProfileId = useMemo(() => {
    const byProfileId = new Map<string, EntryView>()

    for (const entry of data.today) {
      if (!byProfileId.has(entry.profileId)) {
        byProfileId.set(entry.profileId, entry)
      }
    }

    for (const item of sessionItems) {
      if (!byProfileId.has(item.profileId)) {
        byProfileId.set(item.profileId, {
          id: item.entryId,
          profileId: item.profileId,
          weightVisible: true,
          weightKg: item.weightKg,
          measuredAt: new Date(),
          recordedAt: new Date(),
          editedAt: null,
          editedByName: null,
          recordedByName: viewerMember?.displayName ?? "",
          recordedByIsLegacy: false,
          note: item.note,
          canEdit: true,
        })
      }
    }

    return byProfileId
  }, [data.today, sessionItems, viewerMember?.displayName])

  const nextMember = useMemo(() => {
    if (!selectedMember) {
      return null
    }

    for (const member of data.members) {
      if (member.profileId !== selectedMember.profileId && !todayEntryByProfileId.has(member.profileId)) {
        return member
      }
    }

    return null
  }, [data.members, selectedMember, todayEntryByProfileId])

  const saveWeight = async (): Promise<void> => {
    if (!selectedMember) {
      setErrorMessage(NO_ELECTION_MESSAGE)
      return
    }

    const parsedWeight = parseWeightInput(weightText, selectedMember.unit)

    if (!parsedWeight.ok) {
      setErrorMessage(parsedWeight.message)
      return
    }

    const parsedNote = parseNoteInput(noteText)

    if (!parsedNote.ok) {
      setErrorMessage(parsedNote.message)
      return
    }

    if (!MEASURED_DAY_PATTERN.test(measuredOn) || measuredOn > todayKeyInTimeZone(data.timezone)) {
      setErrorMessage(FUTURE_MEASURED_MESSAGE)
      return
    }

    const entryId = crypto.randomUUID()

    const op: CreateEntryOp = {
      type: "create",
      opId: entryId,
      entryId,
      groupId: data.groupId,
      profileId: selectedMember.profileId,
      weightKg: parsedWeight.weightKg,
      measuredAt: instantWithNowTimeOfDay(measuredOn, data.timezone),
      recordedAt: new Date(),
      ...(parsedNote.note ? { note: parsedNote.note } : {}),
    }

    setSessionItems((previousItems) => [
      ...previousItems,
      {
        entryId,
        profileId: selectedMember.profileId,
        weightKg: parsedWeight.weightKg,
        note: parsedNote.note,
      },
    ])
    setLastSavedProfileId(selectedMember.profileId)
    setErrorMessage(null)
    setWeightText("")
    setNoteText("")
    await syncState.enqueueOp(op)
  }

  const selectMember = (profileId: string): void => {
    setSelectedMemberId(profileId)
    setErrorMessage(null)
    setWeightText("")
    setNoteText("")
  }

  const clearError = (): void => {
    setErrorMessage(null)
  }

  return {
    selectedMember,
    selectedMemberId: selectedMember?.profileId ?? null,
    selectMember,
    weightText,
    setWeightText,
    measuredOn,
    setMeasuredOn,
    noteText,
    setNoteText,
    errorMessage,
    clearError,
    lastSavedMember: lastSavedProfileId
      ? (memberByProfileId.get(lastSavedProfileId) ?? null)
      : null,
    nextMember,
    todayEntryByProfileId,
    sessionItems,
    syncState,
    saveWeight,
  }
}
