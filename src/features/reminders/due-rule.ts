const MS_PER_DAY = 86_400_000
const WEEKLY_FALLBACK_CADENCE_DAYS = 7

export type EffectiveCadenceDaysParams = {
  readonly cadenceDays: number | null
  readonly weighInWeekday: number | null
}

export type IsDueByCadenceParams = {
  readonly cadenceDays: number | null
  readonly weighInWeekday: number | null
  readonly joinedDayKey: string
  readonly lastMeasuredDayKey: string | null
  readonly todayKey: string
}

/** No personal cadence falls back to the group's weigh-in day as a weekly rhythm. */
export function effectiveCadenceDays(params: EffectiveCadenceDaysParams): number | null {
  if (params.cadenceDays !== null) {
    return params.cadenceDays
  }

  return params.weighInWeekday === null ? null : WEEKLY_FALLBACK_CADENCE_DAYS
}

/**
 * The one due rule the board and the reminders share: a subject's turn is due
 * when a whole group-timezone day count since their last weigh-in day (their
 * join day anchors a never-weighed member) reaches their own cadence.
 * Dependents are excluded by their callers, never here (G7).
 */
export function isDueByCadence(params: IsDueByCadenceParams): boolean {
  const cadenceDays = effectiveCadenceDays({
    cadenceDays: params.cadenceDays,
    weighInWeekday: params.weighInWeekday,
  })

  if (cadenceDays === null) {
    return false
  }

  const anchorDayKey = params.lastMeasuredDayKey ?? params.joinedDayKey

  return dayNumber(params.todayKey) - dayNumber(anchorDayKey) >= cadenceDays
}

export function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / MS_PER_DAY)
}
