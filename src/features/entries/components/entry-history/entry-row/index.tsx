"use client"

import { formatMeasuredAt, formatRecordedAt } from "@/features/entries/entry-format"
import type { EntryHistoryData } from "@/features/entries/sheet-data"
import type { EntryView } from "@/features/entries/entry-view"
import { displayWeightValue } from "@/lib/weight-units"

type EntryRowProps = Readonly<{
  entry: EntryView
  timezone: string
  unit: EntryHistoryData["subject"]["unit"]
}>

/** One history row: value, the two distinct timestamps, the recorder and, when present, the private note. */
export function EntryRow({ entry, timezone, unit }: EntryRowProps) {
  return (
    <div>
      <p className="font-display text-3xl font-extrabold tracking-tight">
        {entry.weightVisible && entry.weightKg !== null
          ? `${displayWeightValue(entry.weightKg, unit)} ${unit}`
          : null}
      </p>

      {!entry.weightVisible ? (
        <p className="text-xs text-ink-muted">Pesada sin el dato visible</p>
      ) : null}

      <p className="mt-1 text-xs text-ink-muted">
        Medido el <b className="font-semibold text-ink">{formatMeasuredAt(entry.measuredAt, timezone)}</b>
        {" · "}Registrado el{" "}
        <b className="font-semibold text-ink">{formatRecordedAt(entry.recordedAt, timezone)}</b>
      </p>

      <p className="text-xs text-ink-muted">
        Registrado por <b className="font-semibold text-ink">{entry.recordedByName}</b>
        {entry.recordedByIsLegacy ? " · sin cuenta activa" : ""}
      </p>

      {entry.editedAt && entry.editedByName ? (
        <p className="text-xs text-ink-muted">
          Corregido por <b className="font-semibold text-ink">{entry.editedByName}</b> el{" "}
          {formatRecordedAt(entry.editedAt, timezone)}
        </p>
      ) : null}

      {entry.note ? (
        <p className="mt-1 rounded-control bg-surface-muted px-3 py-2 text-xs text-ink">
          {entry.note}
        </p>
      ) : null}
    </div>
  )
}
