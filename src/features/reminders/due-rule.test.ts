import { describe, expect, it } from "vitest"

import { effectiveCadenceDays, isDueByCadence } from "./due-rule"

describe("effectiveCadenceDays", () => {
  it("keeps the member's own cadence", () => {
    expect(effectiveCadenceDays({ cadenceDays: 14, weighInWeekday: 1 })).toBe(14)
  })

  it("falls back to weekly when the group has a weigh-in weekday", () => {
    expect(effectiveCadenceDays({ cadenceDays: null, weighInWeekday: 6 })).toBe(7)
  })

  it("is null without a cadence or a group weekday", () => {
    expect(effectiveCadenceDays({ cadenceDays: null, weighInWeekday: null })).toBeNull()
  })
})

describe("isDueByCadence", () => {
  const base = {
    cadenceDays: 7 as number | null,
    weighInWeekday: 6 as number | null,
    joinedDayKey: "2026-01-01",
    lastMeasuredDayKey: null as string | null,
    todayKey: "2026-01-08",
  }

  it("is due when the last weigh-in is exactly the cadence old", () => {
    expect(isDueByCadence({ ...base, lastMeasuredDayKey: "2026-01-01" })).toBe(true)
  })

  it("is not due while the cadence has not elapsed", () => {
    expect(isDueByCadence({ ...base, lastMeasuredDayKey: "2026-01-04" })).toBe(false)
  })

  it("weighs in on today are never due", () => {
    expect(isDueByCadence({ ...base, lastMeasuredDayKey: "2026-01-08" })).toBe(false)
  })

  it("falls back to weekly with no personal cadence and a group weekday", () => {
    expect(
      isDueByCadence({
        ...base,
        cadenceDays: null,
        weighInWeekday: 6,
        lastMeasuredDayKey: "2026-01-01",
      }),
    ).toBe(true)
  })

  it("is never due without a cadence and without a group weekday", () => {
    expect(
      isDueByCadence({
        ...base,
        cadenceDays: null,
        weighInWeekday: null,
        lastMeasuredDayKey: "2020-01-01",
      }),
    ).toBe(false)
  })

  it("the join day anchors a member with no entries", () => {
    expect(
      isDueByCadence({ ...base, cadenceDays: 3, joinedDayKey: "2026-01-05" }),
    ).toBe(true)
    expect(
      isDueByCadence({ ...base, cadenceDays: 7, joinedDayKey: "2026-01-05" }),
    ).toBe(false)
  })

  it("respects the member's own cadence over the weekly fallback", () => {
    expect(
      isDueByCadence({ ...base, cadenceDays: 14, lastMeasuredDayKey: "2026-01-01" }),
    ).toBe(false)
  })
})
