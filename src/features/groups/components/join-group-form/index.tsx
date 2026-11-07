"use client"

import { startTransition, useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinGroupWithCodeAction } from "@/features/groups/server/membership-actions"

export function JoinGroupForm() {
  const [state, formAction, isPending] = useActionState(joinGroupWithCodeAction, {})

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(() => formAction(formData))
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="inviteCode" className="text-sm font-semibold">
          ¿Tenés un código de invitación?
        </Label>
        <Input
          id="inviteCode"
          name="code"
          type="text"
          required
          maxLength={8}
          autoCapitalize="characters"
          placeholder="K7M2QX"
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base tracking-[0.3em] uppercase placeholder:text-ink-muted placeholder:tracking-[0.3em] focus-visible:border-accent"
        />
        <p className="text-xs text-ink-muted">Seis caracteres, sin cero ni uno.</p>
      </div>

      {state.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {state.errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="h-auto rounded-control bg-surface-muted px-5 py-3.5 font-display font-extrabold text-ink hover:opacity-80"
      >
        {isPending ? "Entrando…" : "Entrar al grupo"}
      </Button>
    </form>
  )
}
