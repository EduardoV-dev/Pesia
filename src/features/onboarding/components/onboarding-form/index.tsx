"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProfileAction } from "@/features/onboarding/server/create-profile"

const UNIT_OPTIONS = [
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "lb", label: "Libras (lb)" },
] as const

export function OnboardingForm() {
  const [state, formAction, isPending] = useActionState(createProfileAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName" className="text-sm font-semibold">
          ¿Cómo te llamamos?
        </Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          maxLength={60}
          placeholder="Ana"
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
        />
        <p className="text-xs text-ink-muted">Es el nombre que ven las demás personas del grupo.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">¿En qué unidad pesás?</legend>
        <div className="flex flex-wrap gap-2">
          {UNIT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-full bg-surface-muted px-4 py-2 text-sm font-semibold has-checked:bg-accent has-checked:text-accent-ink"
            >
              <input
                type="radio"
                name="unit"
                value={option.value}
                defaultChecked={option.value === "kg"}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-muted">
          Podés cambiarla más adelante. Los datos se guardan siempre en kilogramos.
        </p>
      </fieldset>

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
        {isPending ? "Guardando…" : "Continuar"}
      </Button>
    </form>
  )
}
