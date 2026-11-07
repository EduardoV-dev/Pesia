import { groupDayKey } from "@/features/entries/entry-format"
import { roundWeightKg } from "@/lib/weight-units"

/**
 * The deadband is the anti-false-alarm threshold: normal weekly swing (0.5–1 kg)
 * must never read as a direction, so sustained movement has to clear this floor
 * before the trend says anything at all.
 */
export const DIRECTION_DEADBAND_KG_PER_WEEK = 0.3
export const ROLLING_WINDOW_DAYS = 7
export const MIN_DAILY_VALUES_PER_WINDOW = 2
export const PCT_CHANGE_DECIMALS = 1

/** The direction comparison looks back four weeks, not two. */
export const DIRECTION_SPAN_DAYS = 28

export type TrendReading = {
  readonly weightKg: number
  readonly measuredAt: Date
}

/** One calendar day of the group's timezone, collapsed to a single weight. */
export type DailyValue = {
  readonly dayKey: string
  readonly valueKg: number
}

export type WindowValue = {
  readonly dayKey: string
  /** `null` marks a window without the daily values the floor demands: a gap. */
  readonly valueKg: number | null
}

export type SeriesDirection = {
  readonly outcome: "up" | "down" | "stable"
  readonly insufficient: boolean
}

export function dailyValue(readings: readonly TrendReading[], timeZone: string): DailyValue[] {
  const weightsByDay = new Map<string, number[]>()

  for (const reading of readings) {
    const dayKey = groupDayKey(reading.measuredAt, timeZone)
    const dayWeights = weightsByDay.get(dayKey)

    if (dayWeights) {
      dayWeights.push(reading.weightKg)
    } else {
      weightsByDay.set(dayKey, [reading.weightKg])
    }
  }

  return [...weightsByDay.entries()]
    .map(([dayKey, weights]) => ({ dayKey, valueKg: mean(weights) }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}

export function rollingMean(daily: readonly DailyValue[], window = ROLLING_WINDOW_DAYS): WindowValue[] {
  return daily.map((value, index) => {
    const windowStartDay = dayIndex(value.dayKey) - (window - 1)

    const insideWindow: number[] = []
    for (let cursor = index; cursor >= 0 && dayIndex(daily[cursor].dayKey) >= windowStartDay; cursor--) {
      insideWindow.push(daily[cursor].valueKg)
    }

    return {
      dayKey: value.dayKey,
      valueKg: insideWindow.length >= MIN_DAILY_VALUES_PER_WINDOW ? mean(insideWindow) : null,
    }
  })
}

/**
 * Compares the latest window mean against the mean closest to four weeks prior,
 * normalised to kg/week. Any missing end of the comparison reports insufficient
 * data instead of manufacturing a direction.
 */
export function directionFromSeries(rolling: readonly WindowValue[]): SeriesDirection {
  const anchored = rolling.flatMap((value) =>
    value.valueKg === null ? [] : [{ dayKey: value.dayKey, valueKg: value.valueKg }],
  )

  const latest = anchored[anchored.length - 1] ?? null

  if (!latest) {
    return { outcome: "stable", insufficient: true }
  }

  const latestDay = dayIndex(latest.dayKey)
  const earliestDay = dayIndex(anchored[0].dayKey)

  if (latestDay - earliestDay < DIRECTION_SPAN_DAYS) {
    return { outcome: "stable", insufficient: true }
  }

  // Gaps strictly decrease while values go from oldest to newest, so the last one
  // inside the tolerance is the mean closest to four weeks back.
  let prior: DailyValue | null = null
  let priorGapDays = 0

  for (const value of anchored) {
    const gapDays = latestDay - dayIndex(value.dayKey)

    if (gapDays < DIRECTION_SPAN_DAYS || gapDays > DIRECTION_SPAN_DAYS + ROLLING_WINDOW_DAYS) {
      continue
    }

    prior = value
    priorGapDays = gapDays
  }

  if (!prior) {
    return { outcome: "stable", insufficient: true }
  }

  const weeks = priorGapDays / 7

  if (weeks <= 0) {
    return { outcome: "stable", insufficient: true }
  }

  const kgPerWeek = (latest.valueKg - prior.valueKg) / weeks

  if (Math.abs(kgPerWeek) < DIRECTION_DEADBAND_KG_PER_WEEK) {
    return { outcome: "stable", insufficient: false }
  }

  if (kgPerWeek > 0) {
    return { outcome: "up", insufficient: false }
  }

  return { outcome: "down", insufficient: false }
}

export function pctBodyMassChange(currentKg: number, startKg: number): number | null {
  if (!Number.isFinite(startKg) || startKg <= 0) {
    return null
  }

  const percentage = ((currentKg - startKg) / startKg) * 100

  if (!Number.isFinite(percentage)) {
    return null
  }

  return Number(percentage.toFixed(PCT_CHANGE_DECIMALS))
}

export function bmiValue(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    return null
  }

  const bmi = weightKg / (heightCm / 100) ** 2

  return Number.isFinite(bmi) ? Number(bmi.toFixed(PCT_CHANGE_DECIMALS)) : null
}

/** The mean the engine believes; window lists hold one value per day already. */
function mean(weights: readonly number[]): number {
  return roundWeightKg(weights.reduce((total, weight) => total + weight, 0) / weights.length)
}

function dayIndex(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000
}
