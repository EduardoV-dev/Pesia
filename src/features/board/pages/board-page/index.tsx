import type { AssembleGroupBoardReturn, PublishRevealAction } from "@/features/board/board-payload"
import { ConsistencyStrip } from "./consistency-strip"
import { MemberCardView } from "./member-card-view"
import { ViewerRevealCard } from "./viewer-reveal-card"

export type BoardPageProps = {
  readonly board: AssembleGroupBoardReturn
  readonly publishAction: PublishRevealAction
}

/**
 * The group board screen: the family's shared view. Every member's own
 * progress side by side, the consistency strip as the only ranking, and the
 * viewer's private reveal. The payload arrives already filtered per viewer.
 */
export function BoardPage({ board, publishAction }: BoardPageProps) {
  const looksEmpty = board.members
    .flatMap((card) =>
      "latestWeightKg" in card ? [card.latestWeightKg === null] : [],
    )
    .reduce((allEmpty, isEmpty) => allEmpty && isEmpty, true)

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Tablero
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          {board.group.name}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Cada persona avanza contra su propio objetivo. Lo que alguien no comparte,
          no aparece.
        </p>
      </div>

      {looksEmpty ? (
        <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
          <h2 className="font-display text-lg leading-tight font-extrabold tracking-tight">
            Todavía no hay pesadas registradas
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Cuando registren pesadas del grupo, el tablero se llena con el avance de
            cada persona.
          </p>
        </div>
      ) : null}

      {board.viewerReveal ? (
        <div className="mt-5">
          <ViewerRevealCard reveal={board.viewerReveal} publishAction={publishAction} />
        </div>
      ) : null}

      <ConsistencyStrip entries={board.consistencyStrip} members={board.members} />

      <section aria-label="El tablero del grupo" className="mt-5 grid gap-4 sm:grid-cols-2">
        {board.members.map((card, index) => (
          <MemberCardView key={card.kind === "private" ? index : card.profileId} card={card} />
        ))}
      </section>
    </main>
  )
}
