import { describe, expect, it } from "vitest"

import { computeConsistencyAwardTypes } from "@/features/awards/consistency"

const PERIOD_JAN = { periodStart: "2026-01-01", periodEnd: "2026-01-31" }
const PERIOD_JAN_28 = { periodStart: "2026-01-01", periodEnd: "2026-01-28" }
const PERIOD_JAN_14 = { periodStart: "2026-01-01", periodEnd: "2026-01-14" }
const PERIOD_JAN_FEB = { periodStart: "2026-01-01", periodEnd: "2026-02-28" }

const at = (dayKey: string, timeOfDay = "21:34") => new Date(`${dayKey}T${timeOfDay}:00Z`)

function compute(params: {
  readonly entryMeasuredAts: readonly Date[]
  readonly cadenceDays: number | null
  readonly weighInWeekday: number | null
  readonly periodStart: string
  readonly periodEnd: string
  readonly timeZone?: string
}) {
  return computeConsistencyAwardTypes({ timeZone: "UTC", ...params })
}

describe("computeConsistencyAwardTypes", () => {
  it("completing every window of a weekly month earns the completing awards", () => {
    const awards = compute({
      ...PERIOD_JAN_28,
      cadenceDays: 7,
      weighInWeekday: null,
      entryMeasuredAts: [at("2026-01-02"), at("2026-01-09"), at("2026-01-16"), at("2026-01-23")],
    })

    expect(awards).toEqual(["most_consistent", "perfect_month", "best_streak"])
  })

  it("completing two expected windows earns perfect month and the shortest streak, below the 3-expected bar", () => {
    const awards = compute({
      ...PERIOD_JAN_14,
      cadenceDays: 7,
      weighInWeekday: null,
      entryMeasuredAts: [at("2026-01-03"), at("2026-01-11")],
    })

    expect(awards).toEqual(["perfect_month", "best_streak"])
  })

  it("a two-window run with later misses earns only best streak", () => {
    const awards = compute({
      ...PERIOD_JAN_28,
      cadenceDays: 7,
      weighInWeekday: null,
      entryMeasuredAts: [at("2026-01-02"), at("2026-01-09"), at("2026-01-24")],
    })

    expect(awards).toEqual(["best_streak"])
  })

  it("a member with an undetectable cadence earns nothing, silently", () => {
    const awards = compute({
      ...PERIOD_JAN,
      cadenceDays: null,
      weighInWeekday: null,
      entryMeasuredAts: [at("2026-01-02"), at("2026-01-09"), at("2026-01-16"), at("2026-01-23"), at("2026-01-30")],
    })

    expect(awards).toEqual([])
  })

  it("the group weekday fills in the weekly rhythm when no personal cadence is set", () => {
    const awards = compute({
      ...PERIOD_JAN,
      cadenceDays: null,
      weighInWeekday: 0,
      entryMeasuredAts: [at("2026-01-02"), at("2026-01-09", "06:05"), at("2026-01-16"), at("2026-01-23"), at("2026-01-30")],
    })

    expect(awards).toEqual(["most_consistent", "perfect_month", "best_streak"])
  })

  it("a single isolated weigh-in earns nothing", () => {
    const awards = compute({
      ...PERIOD_JAN,
      cadenceDays: 7,
      weighInWeekday: null,
      entryMeasuredAts: [at("2026-01-02")],
    })

    expect(awards).toEqual([])
  })

  it("a gap of at least twice the cadence followed by two check-ins earns comeback kid", () => {
    const awards = compute({
      ...PERIOD_JAN_FEB,
      cadenceDays: 14,
      weighInWeekday: null,
      entryMeasuredAts: [at("2025-12-20"), at("2026-02-02"), at("2026-02-06")],
    })

    expect(awards).toEqual(["comeback_kid"])
  })

  it("a comeback with only one check-in after the return earns nothing", () => {
    const awards = compute({
      ...PERIOD_JAN_FEB,
      cadenceDays: 14,
      weighInWeekday: null,
      entryMeasuredAts: [at("2026-01-02"), at("2026-02-20")],
    })

    expect(awards).toEqual([])
  })

  it("a gap shorter than twice the cadence never earns comeback kid", () => {
    const awards = compute({
      ...PERIOD_JAN_FEB,
      cadenceDays: 14,
      weighInWeekday: null,
      entryMeasuredAts: [at("2026-01-05"), at("2026-01-20"), at("2026-02-04"), at("2026-02-19")],
    })

    expect(awards).toEqual(["best_streak"])
  })
})
