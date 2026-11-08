import type { BoardViewerReveal, PublishRevealAction } from "@/features/board/board-payload"
import { BIGGEST_CHANGE_LABEL } from "@/features/awards/award-type"

export type ViewerRevealCardProps = {
  readonly reveal: BoardViewerReveal
  readonly publishAction: PublishRevealAction
}

/**
 * The viewer's own "me moví más" reveal: a small card only the viewer sees
 * (US-6.6). `shared_public` on the claim is the entire disclosure mechanism, so
 * the submit toggles that one flag; no other payload ever carries it (G1).
 */
export function ViewerRevealCard({ reveal, publishAction }: ViewerRevealCardProps) {
  return (
    <section
      aria-label="Tu movimiento del mes"
      className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]"
    >
      <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
        Para vos solamente
      </p>
      <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
        {BIGGEST_CHANGE_LABEL}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Sólo vos sabés que la tuya fue la mayor variación del mes. Nadie más recibe este
        dato, ni una pista de él.
      </p>

      <form action={publishAction} className="mt-4">
        <input type="hidden" name="claimId" value={reveal.claimId} />
        <input type="hidden" name="shared" value={reveal.isPublic ? "false" : "true"} />
        <button
          type="submit"
          className={
            reveal.isPublic
              ? "rounded-control bg-surface-muted px-5 py-3 font-display font-extrabold text-ink hover:opacity-80"
              : "rounded-control bg-accent px-5 py-3 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:opacity-90"
          }
        >
          {reveal.isPublic ? "Dejar de publicar" : "Publicar en el grupo"}
        </button>
      </form>
    </section>
  )
}
