import { groupDayKey } from "@/features/entries/entry-format"

import { type ConsistencyAwardType } from "./award-type"

/**
 * The period boundaries are `YYYY-MM-DD` day keys in the group's timezone,
 * inclusive. The measured instants are turned into the same group-local day
 * keys, so the award math is exact in the month the group actually weighs in.
 */
export type ComputeConsistencyAwardTypesParams = {
  /**
   * One member's measured instants. Entries from just before the period may be
   * included so a comeback gap crossing the boundary is visible; they never
   * count as completed check-ins of the period itself.
   */
  readonly entryMeasuredAts: readonly Date[]
  /** The member's own cadence in days; `null` when they did not set one. */
  readonly cadenceDays: number | null
  /** The group's weigh-in weekday; `null` when the group has no settings row. */
  readonly weighInWeekday: number | null
  readonly periodStart: string
  readonly periodEnd: string
  readonly timeZone: string
}

/**
 * The pure award engine. A member is judged only against their own cadence, so
 * the comparison between members is between behaviours on different scales
 * (G1/G5). An undetectable cadence earns nothing, silently.
 *
 * Per-member semantics of the two completing awards: completing every expected
 * window earns `perfect_month` from 2 expected windows on, and
 * `most_consistent` from the epic's bar of 3 expected windows on. Cross-member
 * "highest share" never enters this function: the board ranks stored claims, it
 * does not rank bodies or recompute comparisons.
 */
export function computeConsistencyAwardTypes(
  params: ComputeConsistencyAwardTypesParams,
): readonly ConsistencyAwardType[] {
  const cadenceDays = deriveCadenceDays(params.cadenceDays, params.weighInWeekday)

  if (cadenceDays === null) {
    return []
  }

  const entryDays = uniqueEntryDays(params)
  const startDay = dayNumber(params.periodStart)
  const endDay = dayNumber(params.periodEnd)
  const windows = expectedWindows(startDay, endDay, cadenceDays)
  const completedFlags = windows.map((window) => hasEntryIn(entryDays, window))
  const completedCount = completedFlags.filter(Boolean).length
  const longestRun = longestCompletedRun(completedFlags)

  const earned = new Set<ConsistencyAwardType>()

  if (completedCount === windows.length && windows.length >= MIN_EXPECTED_FOR_MOST_CONSISTENT) {
    earned.add("most_consistent")
  }

  if (completedCount === windows.length && completedCount >= MIN_EXPECTED_FOR_PERFECT_MONTH) {
    earned.add("perfect_month")
  }

  if (longestRun >= MIN_WINDOWS_FOR_STREAK) {
    earned.add("best_streak")
  }

  if (hasComeback(entryDays, startDay, endDay, cadenceDays)) {
    earned.add("comeback_kid")
  }

  return CONSISTENCY_AWARD_ORDER.filter((awardType) => earned.has(awardType))
}

const MS_PER_DAY = 86_400_000
const WEEKLY_CADENCE_DAYS = 7
const COMEBACK_GAP_MULTIPLIER = 2
const MIN_EXPECTED_FOR_MOST_CONSISTENT = 3
const MIN_EXPECTED_FOR_PERFECT_MONTH = 2
const MIN_WINDOWS_FOR_STREAK = 2
const MIN_ENTRIES_AFTER_COMEBACK = 2

const CONSISTENCY_AWARD_ORDER = [
  "most_consistent",
  "perfect_month",
  "best_streak",
  "comeback_kid",
] as const satisfies readonly ConsistencyAwardType[]

/** No personal cadence falls back to the group's weigh-in day as a weekly rhythm. */
function deriveCadenceDays(cadenceDays: number | null, weighInWeekday: number | null): number | null {
  if (cadenceDays !== null) {
    return cadenceDays
  }

  return weighInWeekday === null ? null : WEEKLY_CADENCE_DAYS
}

function uniqueEntryDays(params: ComputeConsistencyAwardTypesParams): number[] {
  const dayKeys = new Set(params.entryMeasuredAts.map((instant) => groupDayKey(instant, params.timeZone)))

  return [...dayKeys].map(dayNumber).sort((a, b) => a - b)
}

function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / MS_PER_DAY)
}

/** Consecutive windows of `cadenceDays` from the period start, clipped to its end. */
function expectedWindows(startDay: number, endDay: number, cadenceDays: number) {
  const windows: { readonly from: number; readonly to: number }[] = []

  for (let from = startDay; from <= endDay; from += cadenceDays) {
    windows.push({ from, to: Math.min(from + cadenceDays - 1, endDay) })
  }

  return windows
}

function hasEntryIn(entryDays: number[], window: { readonly from: number; readonly to: number }) {
  return entryDays.some((entryDay) => entryDay >= window.from && entryDay <= window.to)
}

function longestCompletedRun(completedFlags: boolean[]): number {
  let longest = 0
  let run = 0

  for (const completed of completedFlags) {
    run = completed ? run + 1 : 0
    longest = Math.max(longest, run)
  }

  return longest
}

/**
 * A comeback is a resumption after staying away at least twice the member's own
 * cadence, followed by at least two completed check-ins in the period.
 */
function hasComeback(
  entryDays: number[],
  startDay: number,
  endDay: number,
  cadenceDays: number,
): boolean {
  const comebackGap = COMEBACK_GAP_MULTIPLIER * cadenceDays

  for (let index = 1; index < entryDays.length; index += 1) {
    const previousDay = entryDays[index - 1]
    const returnDay = entryDays[index]
    const gapIsLongEnough = returnDay - previousDay >= comebackGap
    const returnHappensInPeriod = returnDay >= startDay && returnDay <= endDay

    if (!gapIsLongEnough || !returnHappensInPeriod) {
      continue
    }

    const completedAfterReturn = entryDays
      .slice(index)
      .filter((entryDay) => entryDay <= endDay).length

    if (completedAfterReturn >= MIN_ENTRIES_AFTER_COMEBACK) {
      return true
    }
  }

  return false
}
