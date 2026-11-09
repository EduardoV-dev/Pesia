import type { ReactNode } from "react"

import type { Profile } from "@/db/schema"
import type { TrendDirection, TrendView } from "@/features/stats/compose-trend"
import type { GoalProgressInput } from "@/features/goals/progress"
import { BmiCard } from "@/features/stats/components/bmi-card"
import { TrendSparkline } from "@/features/stats/components/trend-sparkline"
import { formatWeight, type WeightUnit } from "@/lib/weight-units"

/**
 * The shared trend surface for every screen the member may read their own trend
 * on. Everything it shows comes from the composed `TrendView`; states are content,
 * never error-like, and a dependent profile receives none of the target surfaces.
 */
export type TrendSectionProps = {
  readonly profile: Profile
  readonly trend: TrendView
  readonly goal: GoalProgressInput | null
  readonly viewerUserId: string
}

const DIRECTION_TEXT: Record<Exclude<TrendDirection, "insufficient">, string> = {
  toward: "Moviendo hacia tu objetivo",
  away: "Alejándote de tu objetivo",
  up: "El peso va subiendo",
  down: "El peso va bajando",
  stable: "Estable",
}

const CARD_SHADOW = "shadow-[0_18px_44px_rgba(150,95,45,0.14)]"

export function TrendSection({ profile, trend, goal, viewerUserId }: TrendSectionProps) {
  const unit = profile.unit
  const hasReadings = trend.readings.length > 0
  const directionWords = trend.direction === "insufficient" ? null : DIRECTION_TEXT[trend.direction]
  const canUseGoalSurfaces = goal !== null && !profile.isDependent
  const isMaintain = goal?.direction === "maintain"

  return (
    <div className="flex flex-col gap-5">
      <div className={`rounded-card bg-surface p-6 ${CARD_SHADOW}`}>
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Tu tendencia
        </p>

        {hasReadings ? (
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {directionWords ? (
                <>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong">
                    {directionWords}
                  </span>
                  {progressShareWords(trend, isMaintain) !== null ? (
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-muted">
                      {progressShareWords(trend, isMaintain)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-muted">
                  Aún sin dirección
                </span>
              )}
            </div>

            <div className="h-28 rounded-control bg-[radial-gradient(circle,rgba(27,22,20,0.13)_1px,transparent_1px)] bg-[length:16px_16px]">
              <TrendSparkline
                readings={trend.readings}
                line={trend.line}
                ariaLabel={sparklineLabel(trend, directionWords, !profile.isDependent)}
              />
            </div>

            <p className="text-xs leading-relaxed text-ink-muted">
              La línea es la media de 7 días; los puntos son tus pesadas.
              {trend.line.every((value) => value.valueKg === null)
                ? " Con pocas pesadas todavía no se dibuja la línea."
                : ""}
              {trend.line.some((value) => value.valueKg === null)
                ? " Las semanas sin pesada se ven como hueco."
                : ""}
            </p>

            {trend.direction === "insufficient" ? (
              <p className="text-sm leading-relaxed text-ink-muted">
                Todavía no hay pesada suficiente para medir una dirección. Cuando haya
                cerca de un mes, aparece.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Todavía no hay pesadas registradas. Pesá para ver la tendencia acá, y las
            semanas de arriba se van a llenar de lo que registres.
          </p>
        )}
      </div>

      {hasReadings && canUseGoalSurfaces && trend.progress ? (
        <div
          className={`grid grid-cols-1 gap-3 rounded-card bg-surface p-6 sm:grid-cols-2 ${CARD_SHADOW}`}
        >
          {pairCards(trend, goal, unit)}
        </div>
      ) : null}

      {!profile.isDependent && (profile.userId === null || profile.userId === viewerUserId) ? (
        <BmiCard
          profileId={profile.id}
          bmiEnabled={profile.bmiEnabled}
          heightCm={profile.heightCm}
          bmiValue={trend.bmi}
        />
      ) : null}
    </div>
  )
}

/** The pill next to the direction: goal members only, maintain excluded (its card says it). */
function progressShareWords(trend: TrendView, isMaintain: boolean): string | null {
  if (isMaintain) {
    return null
  }

  if (trend.progress) {
    return `${trend.progress.percentage}% del camino`
  }

  return null
}

/** The two inline stat cards: goal progress against the band, and the pct change. */
function pairCards(trend: TrendView, goal: GoalProgressInput, unit: WeightUnit): ReactNode[] {
  const share = trend.progress?.percentage ?? 0
  const directionWords = trend.direction === "insufficient" ? null : DIRECTION_TEXT[trend.direction]

  if (goal.direction === "maintain") {
    const band = goal.bandKg ?? 0
    const distance = trend.progress?.distanceToBandKg ?? 0

    return [
      <div key="band" className="rounded-control bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold text-ink-muted">Tu banda</p>
        <p className="font-display mt-1 text-2xl font-extrabold tracking-tight">
          {formatWeight(goal.targetWeightKg, unit)}
          <span className="text-base font-semibold text-ink-muted">
            {" "}
            ± {formatWeight(band, unit)}
          </span>
        </p>
      </div>,
      <div key="distance" className="rounded-control bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold text-ink-muted">Distancia a la banda</p>
        <p className="font-display mt-1 text-2xl font-extrabold tracking-tight">
          {distance === 0 ? "Estás dentro" : `Estás a ${formatWeight(distance, unit)}`}
        </p>
      </div>,
    ]
  }

  return [
    <div key="progress" className="rounded-control bg-surface-muted px-4 py-3">
      <p className="text-xs font-semibold text-ink-muted">Avance del objetivo</p>
      <p className="font-display mt-1 text-2xl font-extrabold tracking-tight">{share}%</p>
      <div
        className="mt-2 h-1.5 rounded-full bg-line"
        role="progressbar"
        aria-label="Avance del objetivo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
        aria-valuetext={`${share}% — ${directionWords ?? "sin dirección todavía"}`}
      >
        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${share}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        de {formatWeight(goal.baselineWeightKg, unit)} a {formatWeight(goal.targetWeightKg, unit)}
      </p>
    </div>,
    ...(trend.pctChange !== null
      ? [
          <div key="pct" className="rounded-control bg-surface-muted px-4 py-3">
            <p className="text-xs font-semibold text-ink-muted">Tu peso cambió</p>
            <p className="font-display mt-1 text-2xl font-extrabold tracking-tight">
              {signedPct(trend.pctChange)}%
            </p>
            <p className="mt-2 text-xs text-ink-muted">{trend.baselineLabel}</p>
          </div>,
        ]
      : []),
  ]
}

function signedPct(pctChange: number): string {
  return `${pctChange > 0 ? "+" : ""}${pctChange}`
}

/**
 * The screen-reader trend: goal-relative direction and, for members who own the
 * goal surfaces, the percentage change. A dependent's trend stays trend-only.
 */
function sparklineLabel(
  trend: TrendView,
  directionWords: string | null,
  includePctChange: boolean,
): string {
  const directionPart = directionWords
    ? `: ${directionWords.toLowerCase()}`
    : ": sin dirección todavía"
  const pctPart =
    includePctChange && trend.pctChange !== null
      ? `; tu peso cambió ${signedPct(trend.pctChange)}% ${trend.baselineLabel}`
      : ""

  return `Tendencia de tu peso${directionPart}${pctPart}`
}
