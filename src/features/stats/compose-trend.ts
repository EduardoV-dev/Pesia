import { type Goal } from "@/db/schema"
import { type EntryView } from "@/features/entries/entry-view"
import { calculateGoalProgress } from "@/features/goals/progress"
import { bmiValue, dailyValue, directionFromSeries, pctBodyMassChange, rollingMean, type TrendReading, type WindowValue } from "@/features/stats/trend-math"

/**
 * The wording the composition issues for the baseline of the percentage change;
 * screens render it verbatim so every surface names the same reference.
 */
export const BASELINE_LABEL_WITH_GOAL = "desde el inicio de tu objetivo"
export const BASELINE_LABEL_WITHOUT_GOAL = "desde tu primera pesada"

export type TrendDirection =
  | "toward"
  | "away"
  | "up"
  | "down"
  | "stable"
  | "insufficient"

export type TrendLineValue = {
  readonly dayKey: string
  readonly valueKg: number | null
}

export type TrendView = {
  /** The weight this engine believes: the latest rolling mean, else the latest day mean. */
  readonly currentKg: number | null
  readonly readings: readonly TrendReading[]
  readonly line: readonly TrendLineValue[]
  readonly direction: TrendDirection
  readonly pctChange: number | null
  readonly baselineKg: number | null
  readonly baselineLabel: string
  /**
   * Goal-relative progress, only for members whose goal exists. The raw
   * `directionKey` of the goal math never crosses this boundary: the trend's
   * own deadband direction is the one statement the screen gets to show.
   */
  readonly progress: { readonly percentage: number; readonly distanceToBandKg: number | null } | null
  readonly bmi: number | null
}

export type ComposeTrendParams = {
  /** Assembler output; weights arrive pre-filtered by the viewer's visibility. */
  readonly views: readonly EntryView[]
  readonly goal: Goal | null
  readonly timeZone: string
  readonly bmiEnabled: boolean
  readonly heightCm: number | null
}

/** The single composition every trend screen renders from; never reads `entries` directly. */
export function composeTrend(params: ComposeTrendParams): TrendView {
  const readings = params.views
    .flatMap((view) =>
      view.weightKg === null
        ? []
        : [{ weightKg: view.weightKg, measuredAt: view.measuredAt }],
    )
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())

  const daily = dailyValue(readings, params.timeZone)
  const line = rollingMean(daily)

  const latestWindowValue = lastWindowValue(line)
  const currentKg = latestWindowValue ?? daily[daily.length - 1]?.valueKg ?? null
  const baselineKg = params.goal?.baselineWeightKg ?? daily[0]?.valueKg ?? null

  return {
    currentKg,
    readings,
    line,
    direction: resolveDirection(line, params.goal, currentKg),
    pctChange:
      baselineKg !== null && currentKg !== null && baselineKg > 0
        ? pctBodyMassChange(currentKg, baselineKg)
        : null,
    baselineKg,
    baselineLabel: params.goal ? BASELINE_LABEL_WITH_GOAL : BASELINE_LABEL_WITHOUT_GOAL,
    progress: composeProgress(params.goal, currentKg, baselineKg),
    bmi:
      params.bmiEnabled && params.heightCm !== null && currentKg !== null
        ? bmiValue(currentKg, params.heightCm)
        : null,
  }
}

function resolveDirection(
  line: readonly WindowValue[],
  goal: Goal | null,
  currentKg: number | null,
): TrendDirection {
  const { outcome, insufficient } = directionFromSeries(line)

  if (insufficient) {
    return "insufficient"
  }

  if (!goal) {
    return outcome
  }

  if (outcome === "stable" || currentKg === null) {
    return "stable"
  }

  const movingTowardTarget =
    (goal.targetWeightKg > currentKg && outcome === "up") ||
    (goal.targetWeightKg < currentKg && outcome === "down")

  if (movingTowardTarget) {
    return "toward"
  }

  return "away"
}

function composeProgress(
  goal: Goal | null,
  currentKg: number | null,
  baselineKg: number | null,
): TrendView["progress"] {
  if (!goal) {
    return null
  }

  const progress = calculateGoalProgress(
    {
      direction: goal.direction,
      targetWeightKg: goal.targetWeightKg,
      bandKg: goal.bandKg,
      baselineWeightKg: goal.baselineWeightKg,
    },
    currentKg ?? baselineKg ?? goal.baselineWeightKg,
  )

  return { percentage: progress.percentage, distanceToBandKg: progress.distanceToBandKg }
}

function lastWindowValue(line: readonly WindowValue[]): number | null {
  const window = line.flatMap((value) =>
    value.valueKg === null ? [] : [{ dayKey: value.dayKey, valueKg: value.valueKg }],
  )

  return window[window.length - 1]?.valueKg ?? null
}
