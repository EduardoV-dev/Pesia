import { BIGGEST_CHANGE_LABEL, CONSISTENCY_AWARD_LABELS } from "@/features/awards/award-type"
import type { BoardMemberCard } from "@/features/board/board-payload"
import { type TrendDirection } from "@/features/stats/compose-trend"
import { TrendSparkline } from "@/features/stats/components/trend-sparkline"
import { formatWeight } from "@/lib/weight-units"

export type MemberCardViewProps = {
  readonly card: BoardMemberCard
}

/** Every card except the fixed private placeholder. */
type VisibleCard = Exclude<BoardMemberCard, { readonly kind: "private" }>

/** The chips render the Spanish label of every claim; the reveal badge included. */
const AWARD_CHIP_LABELS = {
  ...CONSISTENCY_AWARD_LABELS,
  biggest_change: BIGGEST_CHANGE_LABEL,
} as const

const DIRECTION_CHIP_WORDS: Record<Exclude<TrendDirection, "insufficient">, string> = {
  toward: "Hacia su objetivo",
  away: "Alejándose de su objetivo",
  up: "El peso va subiendo",
  down: "El peso va bajando",
  stable: "Estable",
} as const

const DUE_CHIP_SELF = "Tu turno de pesada"
const DUE_CHIP_OTHER = "Su turno de pesada"

const NO_READINGS_YET = "Todavía no hay pesadas registradas."

/**
 * The card renderer for the exhaustive board union. Each variant carries only
 * the fields its own visibility granted, decided server-side; nothing here
 * widens anything (G10). A dependent card never shows a progress bar (G9), and
 * the private placeholder is exactly one fixed label (G8).
 */
export function MemberCardView({ card }: MemberCardViewProps) {
  if (card.kind === "private") {
    return (<article
        aria-label="Privado"
        className="rounded-card bg-surface-muted p-6 shadow-[0_18px_44px_rgba(150,95,45,0.10)]"
      >
        <span className="text-xl" aria-hidden="true">
          🔒
        </span>
        <p className="font-display mt-2 text-lg font-extrabold tracking-tight">Privado</p>
      </article>
    )
  }

  return (
    <article
      aria-label={card.displayName}
      className="flex flex-col gap-4 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]"
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          {card.avatarEmoji ?? "⚖️"}
        </span>
        <h3 className="font-display text-lg leading-tight font-extrabold tracking-tight">
          {card.displayName}
        </h3>
        {card.isViewer ? (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">
            Vos
          </span>
        ) : null}
        {"rankingOptOut" in card && card.rankingOptOut ? (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">
            Fuera del ranking
          </span>
        ) : null}
        {dueChip(card)}
      </header>

      {awardChipList(card)}

      {cardBody(card)}

      {card.latestNote ? (
        <p className="text-xs leading-relaxed text-ink-muted">Tu nota: {card.latestNote}</p>
      ) : null}
    </article>
  )
}

function dueChip(card: VisibleCard) {
  if (!("isDue" in card) || !card.isDue) {
    return null
  }

  return (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">
      {card.isViewer ? DUE_CHIP_SELF : DUE_CHIP_OTHER}
    </span>
  )
}

function awardChipList(card: VisibleCard) {
  const awardTypes = "awardTypes" in card ? card.awardTypes : []

  if (awardTypes.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Distinciones">
      {awardTypes.map((awardType) => (
        <span
          key={awardType}
          className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong"
        >
          {AWARD_CHIP_LABELS[awardType]}
        </span>
      ))}
    </div>
  )
}

function cardBody(card: VisibleCard) {
  if (card.kind === "nameOnly") {
    return <p className="text-xs text-ink-muted">Este perfil solo comparte el nombre.</p>
  }

  if (card.kind === "latestOnly") {
    return (
      <div className="flex flex-col gap-3">
        {card.latestWeightKg !== null ? (
          <p className="font-display text-3xl font-extrabold tracking-tight">
            {formatWeight(card.latestWeightKg, card.unit)}
          </p>
        ) : (
          <p className="text-xs text-ink-muted">{NO_READINGS_YET}</p>
        )}
        <p className="text-xs text-ink-muted">Sólo el último peso se comparte en este perfil.</p>
      </div>
    )
  }

  if (card.kind === "dependent") {
    return (
      <div className="flex flex-col gap-3">
        {card.latestWeightKg !== null ? (
          <p className="font-display text-3xl font-extrabold tracking-tight">
            {formatWeight(card.latestWeightKg, card.unit)}
          </p>
        ) : (
          <p className="text-xs text-ink-muted">{NO_READINGS_YET}</p>
        )}
        {directionChip(card.direction)}
        <p className="text-xs text-ink-muted">
          De una persona a cargo se comparte el peso y la dirección de su tendencia.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {card.latestWeightKg !== null ? (
        <p className="font-display text-3xl font-extrabold tracking-tight">
          {formatWeight(card.latestWeightKg, card.unit)}
        </p>
      ) : (
        <p className="text-xs text-ink-muted">{NO_READINGS_YET}</p>
      )}

      {card.progress ? (
        <div className="rounded-control bg-surface-muted px-4 py-3">
          <p className="text-xs font-semibold text-ink-muted">
            {card.isViewer ? "Tu avance" : "Su avance"}
          </p>
          <p className="font-display mt-1 text-2xl font-extrabold tracking-tight">
            {card.progress.percentage}%
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-line">
            <div
              className="h-1.5 rounded-full bg-accent"
              style={{ width: `${Math.max(0, Math.min(100, card.progress.percentage))}%` }}
            />
          </div>
        </div>
      ) : null}

      {card.sparkline ? (
        <div className="h-24 rounded-control bg-[radial-gradient(circle,rgba(27,22,20,0.13)_1px,transparent_1px)] bg-[length:16px_16px]">
          <TrendSparkline
            readings={card.sparkline.readings}
            line={card.sparkline.line}
            ariaLabel={
              card.isViewer
                ? "Tu tendencia en el tablero"
                : `Tendencia de ${card.displayName} en el tablero`
            }
          />
        </div>
      ) : null}

      {directionChip(card.direction)}
    </div>
  )
}

function directionChip(direction: TrendDirection | null) {
  if (direction === null || direction === "insufficient") {
    return null
  }

  return (
    <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong">
      {DIRECTION_CHIP_WORDS[direction]}
    </span>
  )
}
