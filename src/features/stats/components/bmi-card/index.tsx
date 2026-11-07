"use client"

import { startTransition, useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveBmiReferenceAction } from "@/features/stats/server/save-bmi-reference"

/**
 * The member's private BMI reference: off by default, a screening number with no
 * category, no colour and no threshold, toggleable only on this surface. The
 * server write re-checks that the caller is the login owner or a manager of a
 * profile without one (G4).
 */
export type BmiCardProps = {
  readonly profileId: string
  readonly bmiEnabled: boolean
  readonly heightCm: number | null
  readonly bmiValue: number | null
}

const CARD_SHADOW = "shadow-[0_18px_44px_rgba(150,95,45,0.14)]"

export function BmiCard({ profileId, bmiEnabled, heightCm, bmiValue }: BmiCardProps) {
  const [state, formAction, isPending] = useActionState(saveBmiReferenceAction, {})

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        // React resets a form after a server action, which would wipe what was typed.
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(() => formAction(formData))
      }}
      className={`rounded-card bg-surface p-6 ${CARD_SHADOW}`}
    >
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="bmiEnabled" value={bmiEnabled ? "false" : "true"} />

      <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
        Referencia de IMC
      </p>

      {bmiEnabled ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            {bmiValue !== null ? (
              <>
                <span className="font-display text-4xl leading-none font-extrabold tracking-tight">
                  {bmiValue}
                </span>
                <span className="text-sm font-semibold text-ink-muted">IMC</span>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-ink-muted">
                Cuando haya una pesada registrada, el IMC se muestra acá.
              </p>
            )}
          </div>

          <p className="text-sm leading-relaxed text-ink-muted">
            Es un número de cribado: no separa músculo de grasa, y no indica el riesgo
            igual en todas las edades ni en todos los cuerpos. No te evalúa.
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted">
              Referencia de cribado
            </span>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted">
              Sin categorías
            </span>
          </div>

          <p className="text-sm leading-relaxed text-ink-muted">
            ¿Algo te da vueltas? La mejor lectura la da tu médica o tu médico.
          </p>

          <Button
            type="submit"
            disabled={isPending}
            className="h-auto rounded-control bg-surface-muted px-5 py-3 font-display font-extrabold text-ink hover:opacity-80"
          >
            {isPending ? "Apagando…" : "Apagar la referencia"}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-ink-muted">
            Un número de cribado privado, sólo para tu pantalla. Activarlo te pide tu
            altura; apagarlo hace que deje de verse.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="heightCm" className="text-sm font-semibold">
              Tu altura (centímetros)
            </Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="text"
              inputMode="numeric"
              required
              defaultValue={heightCm === null ? "" : String(heightCm)}
              placeholder="170"
              className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="h-auto rounded-control bg-accent px-5 py-3 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:bg-accent hover:opacity-90"
          >
            {isPending ? "Activando…" : "Activar la referencia"}
          </Button>
        </div>
      )}

      {state.errorMessage ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {state.errorMessage}
        </p>
      ) : null}
    </form>
  )
}
