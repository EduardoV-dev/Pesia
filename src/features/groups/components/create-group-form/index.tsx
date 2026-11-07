"use client"

import { startTransition, useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createGroupAction } from "@/features/groups/server/group-actions"

export function CreateGroupForm() {
  const [state, formAction, isPending] = useActionState(createGroupAction, {})

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        // React resets a form after a server action, which would wipe what was typed.
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(() => formAction(formData))
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="groupName" className="text-sm font-semibold">
          ¿Cómo se llama el grupo?
        </Label>
        <Input
          id="groupName"
          name="name"
          type="text"
          required
          maxLength={60}
          placeholder="Familia"
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
        />
        <p className="text-xs text-ink-muted">Solo entra quien tenga una invitación.</p>
      </div>

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
        {isPending ? "Creando…" : "Crear grupo"}
      </Button>
    </form>
  )
}
