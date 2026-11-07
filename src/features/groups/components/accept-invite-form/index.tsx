"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { acceptInviteAction } from "@/features/groups/server/invite-actions"

export type AcceptInviteFormProps = {
  readonly token: string
}

export function AcceptInviteForm({ token }: AcceptInviteFormProps) {
  const [state, formAction, isPending] = useActionState(acceptInviteAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      {state.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {state.errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="h-auto rounded-control bg-accent px-5 py-3.5 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:bg-accent hover:opacity-90"
      >
        {isPending ? "Entrando…" : "Entrar al grupo"}
      </Button>
    </form>
  )
}
