"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { type InviteKind } from "@/features/groups/invite"
import { createInviteAction, revokeInviteAction } from "@/features/groups/server/invite-actions"

export type InviteView = {
  readonly id: string
  readonly kind: InviteKind
  readonly token: string
  readonly url: string
}

export type InvitePanelProps = {
  readonly groupId: string
  readonly invites: readonly InviteView[]
}

export function InvitePanel({ groupId, invites }: InvitePanelProps) {
  const [createState, createAction, isCreating] = useActionState(createInviteAction, {})
  const [revokeState, revokeAction] = useActionState(revokeInviteAction, {})

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <form action={createAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="kind" value="link" />
          <Button
            type="submit"
            disabled={isCreating}
            variant="outline"
            className="h-auto rounded-control bg-surface-muted px-4 py-2.5 font-display font-extrabold text-ink hover:opacity-80"
          >
            Crear enlace
          </Button>
        </form>

        <form action={createAction}>
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="kind" value="code" />
          <Button
            type="submit"
            disabled={isCreating}
            variant="outline"
            className="h-auto rounded-control bg-surface-muted px-4 py-2.5 font-display font-extrabold text-ink hover:opacity-80"
          >
            Crear código
          </Button>
        </form>
      </div>

      {createState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {createState.errorMessage}
        </p>
      ) : null}

      {revokeState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {revokeState.errorMessage}
        </p>
      ) : null}

      {invites.length === 0 ? (
        <p className="text-sm leading-relaxed text-ink-muted">
          No hay invitaciones activas. Creá un enlace para compartirlo o un código para leerlo en
          voz alta.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {invites.map((invite) => (
          <li key={invite.id} className="rounded-control bg-surface-muted px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold tracking-[0.16em] text-accent-strong uppercase">
                {invite.kind === "code" ? "Código" : "Enlace"}
              </span>

              <form action={revokeAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <input type="hidden" name="inviteId" value={invite.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  className="h-auto rounded-control px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface hover:text-ink"
                >
                  Revocar
                </Button>
              </form>
            </div>

            {invite.kind === "code" ? (
              <p className="font-display mt-1 text-2xl font-extrabold tracking-[0.3em]">
                {invite.token}
              </p>
            ) : (
              <input
                readOnly
                value={invite.url}
                aria-label="Enlace de invitación"
                onFocus={(event) => event.currentTarget.select()}
                className="mt-1 w-full rounded-control border-line bg-surface px-3 py-2 text-sm text-ink-muted focus-visible:border-accent"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
