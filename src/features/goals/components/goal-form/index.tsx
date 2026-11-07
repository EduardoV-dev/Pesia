"use client"

import { startTransition, useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type Goal } from "@/db/schema"
import { type GoalDirection } from "@/features/goals/direction"
import { saveGoalAction } from "@/features/goals/server/save-goal"
import { displayWeightValue, type WeightUnit } from "@/lib/weight-units"

export type GoalFormProps = {
  readonly profileId: string
  readonly unit: WeightUnit
  readonly goal: Goal | null
}

const DIRECTION_OPTIONS: ReadonlyArray<{ readonly value: GoalDirection; readonly label: string }> = [
  { value: "lose", label: "Bajar hasta ese peso" },
  { value: "gain", label: "Subir hasta ese peso" },
  { value: "maintain", label: "Mantener un margen" },
]

export function GoalForm({ profileId, unit, goal }: GoalFormProps) {
  const [state, formAction, isPending] = useActionState(saveGoalAction, {})
  const [selectedDirection, setSelectedDirection] = useState(goal?.direction ?? "")

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
      <input type="hidden" name="profileId" value={profileId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="currentWeight" className="text-sm font-semibold">
          Peso actual ({unit})
        </Label>
        <Input
          id="currentWeight"
          name="currentWeight"
          type="text"
          inputMode="decimal"
          required
          defaultValue={goalWeightValue(goal?.baselineWeightKg, unit)}
          placeholder="72,5"
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
        />
        <p className="text-xs text-ink-muted">Es la base contra la que se mide tu objetivo.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">¿Qué querés hacer?</legend>
        <div className="flex flex-col gap-2">
          {DIRECTION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-control bg-surface-muted px-4 py-3 text-sm font-semibold has-checked:bg-accent has-checked:text-accent-ink"
            >
              <input
                type="radio"
                name="direction"
                value={option.value}
                required
                checked={selectedDirection === option.value}
                onChange={() => setSelectedDirection(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="targetWeight" className="text-sm font-semibold">
          Peso objetivo ({unit})
        </Label>
        <Input
          id="targetWeight"
          name="targetWeight"
          type="text"
          inputMode="decimal"
          required
          defaultValue={goalWeightValue(goal?.targetWeightKg, unit)}
          placeholder="70"
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
        />
      </div>

      {selectedDirection === "maintain" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="band" className="text-sm font-semibold">
            Margen que querés mantener (± {unit})
          </Label>
          <Input
            id="band"
            name="band"
            type="text"
            inputMode="decimal"
            required
            defaultValue={goalWeightValue(goal?.bandKg ?? null, unit)}
            placeholder="2"
            className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
          />
        </div>
      ) : null}

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
        {isPending ? "Guardando…" : goal ? "Cambiar objetivo" : "Guardar objetivo"}
      </Button>
    </form>
  )
}

function goalWeightValue(kilograms: number | null | undefined, unit: WeightUnit): string {
  return kilograms === null || kilograms === undefined ? "" : String(displayWeightValue(kilograms, unit))
}
