import { type Goal } from "@/db/schema"
import { calculateGoalProgress, type GoalDirectionKey } from "@/features/goals/progress"
import { formatWeight, type WeightUnit } from "@/lib/weight-units"

export type GoalSummaryProps = {
  readonly goal: Goal
  readonly unit: WeightUnit
}

const PROGRESS_LABELS: Record<GoalDirectionKey, string> = {
  toward_goal: "Moviendo hacia tu objetivo",
  away_from_goal: "Alejándote de tu objetivo",
  stable: "Estable",
}

export function GoalSummary({ goal, unit }: GoalSummaryProps) {
  // Until entries exist, the baseline is the only weight this profile has.
  const progress = calculateGoalProgress(
    {
      direction: goal.direction,
      targetWeightKg: goal.targetWeightKg,
      bandKg: goal.bandKg,
      baselineWeightKg: goal.baselineWeightKg,
    },
    goal.baselineWeightKg,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl leading-none font-extrabold tracking-tight">
          {progress.percentage}%
        </span>
        <span className="text-sm font-semibold text-ink-muted">
          {PROGRESS_LABELS[progress.directionKey]}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{describeGoal(goal, unit)}</p>

      {progress.distanceToBandKg !== null && progress.distanceToBandKg > 0 ? (
        <p className="text-sm leading-relaxed text-ink-muted">
          Estás a {formatWeight(progress.distanceToBandKg, unit)} de tu banda.
        </p>
      ) : null}
    </div>
  )
}

function describeGoal(goal: Goal, unit: WeightUnit): string {
  const target = formatWeight(goal.targetWeightKg, unit)

  if (goal.direction === "maintain") {
    const band = goal.bandKg === null ? "" : ` con un margen de ±${formatWeight(goal.bandKg, unit)}`

    return `Mantener ${target}${band}.`
  }

  const verb = goal.direction === "lose" ? "Bajar" : "Subir"

  return `${verb} hasta ${target}.`
}
