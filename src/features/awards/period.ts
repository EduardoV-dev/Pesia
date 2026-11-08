import { groupDayKey } from "@/features/entries/entry-format"

export type MonthPeriod = {
  readonly periodStart: string
  readonly periodEnd: string
}

/** The `YYYY-MM-DD` first and last day of the month containing `dayKey`. */
export function monthPeriodOfDay(dayKey: string): MonthPeriod {
  const year = Number(dayKey.slice(0, 4))
  const month = Number(dayKey.slice(5, 7))

  if (Number.isNaN(year) || Number.isNaN(month)) {
    throw new Error(`Invalid day key for a month period: ${dayKey}`)
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return {
    periodStart: `${dayKey.slice(0, 7)}-01`,
    periodEnd: `${dayKey.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`,
  }
}

/** The calendar month, in the group's timezone, that contains right now. */
export function currentMonthPeriod(timeZone: string): MonthPeriod {
  return monthPeriodOfDay(groupDayKey(new Date(), timeZone))
}

const MS_PER_DAY = 86_400_000

/**
 * The calendar month before the current one, anchored on the current period's
 * first day: the 1st minus one day always lands inside the previous month.
 */
export function previousMonthPeriod(timeZone: string): MonthPeriod {
  const currentStart = currentMonthPeriod(timeZone).periodStart
  const previousDayUtc = Date.parse(`${currentStart}T00:00:00Z`) - MS_PER_DAY

  return monthPeriodOfDay(new Date(previousDayUtc).toISOString().slice(0, 10))
}
