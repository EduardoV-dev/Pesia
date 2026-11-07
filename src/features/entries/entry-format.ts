/**
 * Entry timestamps are stored as UTC instants and rendered in the group's
 * timezone, so members in the same group read the same measured day.
 */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) {
    return "UTC"
  }

  try {
    new Intl.DateTimeFormat("es-AR", { timeZone }).format(new Date())

    return timeZone
  } catch {
    return "UTC"
  }
}

/** The group-local calendar day of an instant, as `YYYY-MM-DD`. */
export function groupDayKey(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value)
}

export function todayKeyInTimeZone(timeZone: string): string {
  return groupDayKey(new Date(), timeZone)
}

/** "6 nov" — the measured date in the group's timezone. */
export function formatMeasuredAt(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: safeTimeZone(timeZone),
    day: "numeric",
    month: "short",
  }).format(value)
}

/** "6 nov, 21:34" — the recorded instant in the group's timezone. */
export function formatRecordedAt(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: safeTimeZone(timeZone),
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value)
}

/** The instant of a `YYYY-MM-DD` group-local day with today's local time-of-day. */
export function instantWithNowTimeOfDay(dayKey: string, timeZone: string): Date {
  const tz = safeTimeZone(timeZone)
  const now = new Date()
  const clockParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now)

  const partValue = (type: string) =>
    clockParts.find((part) => part.type === type)?.value ?? "00"
  const timeText = `${partValue("hour")}:${partValue("minute")}:${partValue("second")}`

  const naive = Date.parse(`${dayKey}T${timeText}Z`)

  return new Date(naive - timeZoneOffsetMs(naive, tz))
}

function timeZoneOffsetMs(naiveInstantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(naiveInstantMs))

  const partValue = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "0"

  const asUtc = Date.UTC(
    Number(partValue("year")),
    Number(partValue("month")) - 1,
    Number(partValue("day")),
    Number(partValue("hour")),
    Number(partValue("minute")),
    Number(partValue("second")),
  )

  return asUtc - naiveInstantMs
}
