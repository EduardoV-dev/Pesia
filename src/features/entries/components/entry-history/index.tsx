"use client"

import { useEffect } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatMeasuredAt } from "@/features/entries/entry-format"
import {
  OFFLINE_STALENESS_MESSAGE,
  type EntryHistoryData,
} from "@/features/entries/sheet-data"
import { writeCurrentKey, writeSnapshot } from "@/features/entries/offline/offline-db"

import { useEntryHistory } from "./use-entry-history"
import { EntryEditForm } from "./entry-edit-form"
import { EntryRow } from "./entry-row"
import { EntryStatusBadge } from "../entry-status-badge"

type EntryHistoryProps = Readonly<{
  data: EntryHistoryData
}>

/**
 * The subject's own history, newest first, with the two timestamps of every
 * entry shown distinctly. Corrections and deletions queue locally, so they
 * behave the same with no signal.
 */
export function EntryHistory({ data }: EntryHistoryProps) {
  const history = useEntryHistory(data)

  useEffect(() => {
    void writeSnapshot(`history:${data.subject.profileId}`, data)
    void writeCurrentKey({ historySubjectId: data.subject.profileId })
  }, [data])

  return (
    <section
      aria-label={`Historial de pesadas de ${data.subject.displayName}`}
      className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
            Historial
          </p>
          <h2 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
            Pesadas de {data.subject.displayName}
          </h2>
        </div>
        <span aria-hidden="true" className="text-2xl">
          {data.subject.avatarEmoji ?? "⚖️"}
        </span>
      </div>

      {!history.syncState.isOnline ? (
        <p className="mt-3 rounded-control bg-accent-soft px-4 py-2 text-xs font-semibold text-accent-strong">
          {OFFLINE_STALENESS_MESSAGE}
        </p>
      ) : null}

      {history.errorMessage ? (
        <p role="alert" className="mt-3 rounded-control bg-surface-sunken px-4 py-2 text-sm text-ink">
          {history.errorMessage}
        </p>
      ) : null}

      {data.entries.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Todavía no hay pesadas. Se registran desde la hoja de pesada del inicio.
        </p>
      ) : (
        <ul className="mt-4">
          {data.entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0"
            >
              <EntryRow entry={entry} timezone={data.timezone} unit={data.subject.unit} />

              <div className="flex flex-wrap items-center gap-2">
                {entry.canEdit ? (
                  <>
                    <button
                      type="button"
                      onClick={() => history.startEdit(entry.id)}
                      className="rounded-control bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink hover:opacity-80"
                    >
                      Corregir
                    </button>
                    <button
                      type="button"
                      onClick={() => history.requestDelete(entry.id)}
                      className="rounded-control bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink hover:opacity-80"
                    >
                      Eliminar
                    </button>
                  </>
                ) : null}

                <EntryStatusBadge
                  state={history.syncState.statuses[entry.id]?.state ?? null}
                  reason={history.syncState.statuses[entry.id]?.reason ?? null}
                />
              </div>

              {history.editingEntryId === entry.id && history.draft ? (
                <EntryEditForm
                  draft={history.draft}
                  unit={data.subject.unit}
                  timezone={data.timezone}
                  canEditNote={entry.note !== null}
                  onChange={history.updateDraft}
                  onSave={() => void history.saveEdit()}
                  onCancel={history.cancelEdit}
                />
              ) : null}

              <AlertDialog
                open={history.deleteTargetId === entry.id}
                onOpenChange={(open) => {
                  if (!open && history.deleteTargetId === entry.id) {
                    history.cancelDelete()
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta pesada?</AlertDialogTitle>
                    <AlertDialogDescription>
                      La pesada del{" "}
                      {formatMeasuredAt(entry.measuredAt, data.timezone)} desaparece del
                      historial y no deja rastro.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={history.cancelDelete}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => void history.confirmDelete()}>
                      Eliminar pesada
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
