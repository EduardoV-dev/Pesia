"use client"

import {
  FAILED_BADGE_LABEL,
  QUEUED_BADGE_LABEL,
  SAVED_BADGE_LABEL,
} from "@/features/entries/sheet-data"

type EntryStatusBadgeProps = Readonly<{
  state: "queued" | "saved" | "failed" | null
  reason?: string | null
}>

const BADGE_LABELS = {
  queued: QUEUED_BADGE_LABEL,
  saved: SAVED_BADGE_LABEL,
  failed: FAILED_BADGE_LABEL,
} as const

/** The honest queued/saved/failed pill the sheet and the history share. */
export function EntryStatusBadge({ state, reason }: EntryStatusBadgeProps) {
  if (state === null) {
    return null
  }

  const isAccentState = state === "queued" || state === "failed"

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={
          isAccentState
            ? "inline-flex items-center gap-2 rounded-pill bg-accent-soft px-3 py-1 text-[11.5px] font-semibold text-accent-strong"
            : "inline-flex items-center gap-2 rounded-pill bg-surface-sunken px-3 py-1 text-[11.5px] font-semibold text-ink-muted"
        }
      >
        <i
          aria-hidden="true"
          className={
            isAccentState
              ? "block size-1.5 rounded-full bg-accent"
              : "block size-1.5 rounded-full bg-line"
          }
        />
        {BADGE_LABELS[state]}
      </span>

      {state === "failed" && reason ? (
        <p role="status" className="max-w-prose text-[11.5px] leading-snug text-ink-muted">
          {reason}
        </p>
      ) : null}
    </div>
  )
}
