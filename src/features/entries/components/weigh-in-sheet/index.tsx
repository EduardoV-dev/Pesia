"use client"

import { useEffect } from "react"

import { useWeighInSheet } from "@/features/entries/offline/use-weigh-in-sheet"
import { displayWeightValue } from "@/lib/weight-units"
import {
  OFFLINE_STALENESS_MESSAGE,
  type WeighInSheetData,
} from "@/features/entries/sheet-data"
import { writeCurrentKey, writeSnapshot } from "@/features/entries/offline/offline-db"

import { EntryStatusBadge } from "../entry-status-badge"

type WeighInSheetProps = Readonly<{
  data: WeighInSheetData
}>

/**
 * The weigh-in sheet: one card records the selected person, the day's sheet
 * rows show who is done and who is next, and saving queues the op locally so
 * it works with no connection at all.
 */
export function WeighInSheet({ data }: WeighInSheetProps) {
  const sheet = useWeighInSheet(data)
  const { syncState } = sheet

  useEffect(() => {
    void writeSnapshot(`sheet:${data.viewerProfileId}`, data)
    void writeCurrentKey({ sheetProfileId: data.viewerProfileId })
  }, [data])

  const isStale = !syncState.isOnline
  const selectedMember = sheet.selectedMember
  const nextMemberPreview = sheet.nextMember

  if (!selectedMember) {
    return null
  }

  return (
    <section
      aria-label="Hoja de pesada de hoy"
      className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
            Hoja de pesada
          </p>
          <h2 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
            {selectedMember.displayName}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {sheet.todayEntryByProfileId.has(selectedMember.profileId)
              ? "Ya está pesada hoy. Podés corregir en su historial."
              : "Pesás en la unidad de cada persona."}
          </p>
        </div>
        <span aria-hidden="true" className="text-2xl">
          {selectedMember.avatarEmoji ?? "⚖️"}
        </span>
      </div>

      {isStale ? (
        <p className="mt-3 rounded-control bg-accent-soft px-4 py-2 text-xs font-semibold text-accent-strong">
          {OFFLINE_STALENESS_MESSAGE}
        </p>
      ) : null}

      <ul className="mt-5 flex flex-wrap gap-2">
        {data.members.map((member) => {
          const isSelected = member.profileId === selectedMember.profileId

          return (
            <li key={member.profileId}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => sheet.selectMember(member.profileId)}
                className={
                  isSelected
                    ? "rounded-control bg-accent px-4 py-2 text-sm font-bold text-accent-ink hover:opacity-90"
                    : "rounded-control bg-surface-muted px-4 py-2 text-sm font-bold text-ink hover:opacity-80"
                }
              >
                {member.displayName}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 rounded-card bg-surface-muted p-4">
        <input
          value={sheet.weightText}
          onChange={(event) => sheet.setWeightText(event.target.value)}
          inputMode="decimal"
          aria-label={`Peso de ${selectedMember.displayName} en ${selectedMember.unit}`}
          placeholder="0,0"
          className="font-display w-full bg-transparent text-5xl font-extrabold tracking-tight text-ink outline-none placeholder:text-ink-muted"
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-muted">Día de la pesada</span>
            <input
              type="date"
              value={sheet.measuredOn}
              max={sheet.measuredOn}
              onChange={(event) => sheet.setMeasuredOn(event.target.value)}
              className="rounded-control bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-muted">Nota privada</span>
            <input
              value={sheet.noteText}
              onChange={(event) => sheet.setNoteText(event.target.value)}
              aria-label="Nota privada (sólo la ves vos)"
              maxLength={400}
              placeholder="Sólo la ves vos"
              className="rounded-control bg-surface px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      {sheet.errorMessage ? (
        <p role="alert" className="mt-3 rounded-control bg-surface-sunken px-4 py-2 text-sm text-ink">
          {sheet.errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void sheet.saveWeight()}
        className="font-display mt-5 w-full rounded-control bg-accent px-5 py-4 text-base font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:opacity-90"
      >
        Guardar peso
      </button>

      {sheet.lastSavedMember ? (
        <div className="mt-4 rounded-card bg-accent-soft p-4">
          <p className="text-sm font-semibold text-ink">
            Pesada de {sheet.lastSavedMember.displayName} lista.
          </p>
          {nextMemberPreview ? (
            <button
              type="button"
              onClick={() => sheet.selectMember(nextMemberPreview.profileId)}
              className="font-display mt-2 rounded-control bg-accent px-4 py-2 text-sm font-extrabold text-accent-ink hover:opacity-90"
            >
              Pasar a {nextMemberPreview.displayName}
            </button>
          ) : null}        </div>
      ) : null}

      <ul className="mt-5">
        {data.members.map((member) => {
          const entry = sheet.todayEntryByProfileId.get(member.profileId) ?? null
          const isCurrent = member.profileId === selectedMember.profileId
          const dotClass = entry
            ? "bg-accent"
            : isCurrent
              ? "bg-accent shadow-[0_0_0_3px_rgba(249,115,22,0.22)]"
              : "bg-line"

          return (
            <li
              key={member.profileId}
              className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                <i aria-hidden="true" className={`block size-1.5 rounded-full ${dotClass}`} />
                <span className="truncate text-sm font-semibold">{member.displayName}</span>
              </span>
              {entry ? (
                <span className="flex flex-col items-end gap-1">
                  <EntryStatusBadge
                    state={syncState.statuses[entry.id]?.state ?? null}
                    reason={syncState.statuses[entry.id]?.reason ?? null}
                  />
                  <span className="text-sm">
                    {entry.weightVisible
                      ? `${displayWeightValue(entry.weightKg ?? 0, member.unit)} ${member.unit}`
                      : "Pesada sin el dato visible"}
                  </span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-ink-muted">pendiente</span>
              )}
            </li>
          )
        })}
      </ul>

      {syncState.pendingCount > 0 ? (
        <p className="mt-3 text-xs text-ink-muted">
          <b className="font-semibold text-ink">{syncState.pendingCount}</b>{" "}
          {syncState.pendingCount === 1 ? "pesada sin sincronizar" : "pesadas sin sincronizar"}{" "}
          — se envían cuando vuelva internet.
        </p>
      ) : null}
    </section>
  )
}
