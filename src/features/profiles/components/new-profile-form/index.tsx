"use client"

import { startTransition, useActionState } from "react"

import { UnitPicker } from "@/components/unit-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createManagedProfileAction } from "@/features/profiles/server/create-profile"

export function NewProfileForm() {
  const [state, formAction, isPending] = useActionState(createManagedProfileAction, {})

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
        <Label htmlFor="displayName" className="text-sm font-semibold">
          ¿Cómo le llamamos?
        </Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="off"
          required
          maxLength={60}
          placeholder="Mara"
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
        />
      </div>

      <UnitPicker legend="¿En qué unidad se registra?" defaultUnit="kg" />

      <label className="flex cursor-pointer items-start gap-3 rounded-control bg-surface-muted px-4 py-3">
        <input
          type="checkbox"
          name="isDependent"
          value="true"
          className="mt-0.5 size-4 accent-[var(--accent)]"
        />
        <span className="text-sm leading-relaxed">
          <span className="font-semibold">Es una persona a cargo</span>
          <span className="block text-xs text-ink-muted">
            Se registra el peso y se ve la tendencia, sin objetivo ni porcentaje de avance.
          </span>
        </span>
      </label>

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
        {isPending ? "Creando…" : "Crear perfil"}
      </Button>
    </form>
  )
}
