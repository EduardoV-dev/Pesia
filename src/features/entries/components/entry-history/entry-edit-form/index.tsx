"use client"

import { todayKeyInTimeZone } from "@/features/entries/entry-format"
import type { EntryHistoryData } from "@/features/entries/sheet-data"
import type { EntryHistoryDraft } from "../use-entry-history"

type EntryEditFormProps = {
  readonly draft: EntryHistoryDraft
  readonly unit: EntryHistoryData["subject"]["unit"]
  readonly timezone: string
  readonly canEditNote: boolean
  readonly onChange: (updates: Partial<EntryHistoryDraft>) => void
  readonly onSave: () => void
  readonly onCancel: () => void
}

/** The inline correction form: value (prefilled when the viewer may read it), day, and the author's note. */
export function EntryEditForm({
  draft,
  unit,
  timezone,
  canEditNote,
  onChange,
  onSave,
  onCancel,
}: EntryEditFormProps) {
  return (
    <div className="rounded-card bg-surface-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-ink-muted">Peso en {unit}</span>
          <input
            value={draft.weightText}
            inputMode="decimal"
            onChange={(event) => onChange({ weightText: event.target.value })}
            aria-label="Peso para corregir"
            placeholder="Recién si querés cambiar el número"
            className="rounded-control bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-ink-muted">Día de la pesada</span>
          <input
            type="date"
            value={draft.measuredOn}
            max={todayKeyInTimeZone(timezone)}
            onChange={(event) => onChange({ measuredOn: event.target.value })}
            aria-label="Día de la pesada para corregir"
            className="rounded-control bg-surface px-3 py-2 text-sm"
          />
        </label>

        {canEditNote ? (
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-muted">Nota privada</span>
            <input
              value={draft.noteText}
              onChange={(event) => onChange({ noteText: event.target.value })}
              aria-label="Nota privada (sólo la ves vos)"
              maxLength={400}
              className="rounded-control bg-surface px-3 py-2 text-sm"
            />
          </label>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="font-display rounded-control bg-accent px-4 py-2 text-sm font-extrabold text-accent-ink hover:opacity-90"
        >
          Guardar cambio
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-control bg-surface-sunken px-4 py-2 text-sm font-bold text-ink hover:opacity-80"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
