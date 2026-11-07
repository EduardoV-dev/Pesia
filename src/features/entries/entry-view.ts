import { type Entry } from "@/db/schema"

/**
 * What a viewer may see of one entry, assembled server-side by
 * `listEntriesForViewer`. The weight and the note are withheld at the source:
 * clients only ever receive the fields their visibility allows.
 */
export type EntryView = {
  readonly id: string
  readonly profileId: string
  readonly weightVisible: boolean
  readonly weightKg: number | null
  readonly measuredAt: Entry["measuredAt"]
  readonly recordedAt: Entry["recordedAt"]
  readonly editedAt: Entry["editedAt"]
  readonly editedByName: string | null
  readonly recordedByName: string
  readonly recordedByIsLegacy: boolean
  readonly note: string | null
  readonly canEdit: boolean
}

/** The per-verdict shape the sync endpoint answers with for one queued op. */
export type EntryOpVerdict = {
  readonly opId: string
  readonly entryId: string | null
  readonly status: "saved" | "failed"
  readonly reason?: string
}

/** Everything the client needs to apply one flush response. */
export type ApplyEntryOpsView = {
  readonly results: readonly EntryOpVerdict[]
}
