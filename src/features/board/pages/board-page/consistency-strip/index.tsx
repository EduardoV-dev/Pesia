import type { ConsistencyAwardType } from "@/features/awards/award-type"
import { CONSISTENCY_AWARD_LABELS } from "@/features/awards/award-type"
import type { BoardMemberCard } from "@/features/board/board-payload"

export type ConsistencyStripProps = {
  readonly entries: readonly { readonly profileId: string; readonly awardTypes: readonly ConsistencyAwardType[] }[]
  readonly members: readonly BoardMemberCard[]
}

/**
 * The only ranking in the product: who kept the rhythm, ordered by behaviour
 * (G1). The strip carries names and award chips only — no weight, no progress
 * and no body magnitude ever appears here (US-6.10).
 */
export function ConsistencyStrip({ entries, members }: ConsistencyStripProps) {
  const nameByProfileId = new Map(
    members.flatMap((member) =>
      "displayName" in member ? [[member.profileId, member.displayName] as const] : [],
    ),
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <section
      aria-label="Quién se mantiene"
      className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]"
    >
      <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
        Esfuerzo
      </p>
      <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
        Quién se mantiene
      </h2>
      <p className="mt-2 mb-4 text-sm leading-relaxed text-ink-muted">
        Cada persona se mide con su propio ritmo: la comparación es entre conductas,
        nunca entre cuerpos.
      </p>

      <ol className="flex flex-col gap-2">
        {entries.map((entry, index) => {
          const displayName = nameByProfileId.get(entry.profileId)

          return displayName === undefined ? null : (
            <li
              key={entry.profileId}
              className="flex flex-wrap items-center gap-2 rounded-control bg-surface-muted px-4 py-3"
            >
              <span className="font-display text-base font-extrabold tracking-tight">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{displayName}</span>
              {entry.awardTypes.map((awardType) => (
                <span
                  key={awardType}
                  className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong"
                >
                  {CONSISTENCY_AWARD_LABELS[awardType]}
                </span>
              ))}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
