import { describe, expect, it } from "vitest"

import {
  bmiValue,
  dailyValue,
  directionFromSeries,
  pctBodyMassChange,
  rollingMean,
  type DailyValue,
  type TrendReading,
  type WindowValue,
} from "@/features/stats/trend-math"

const FIRST_DAY = Date.parse("2026-01-01T00:00:00Z")
const MILLISECONDS_PER_DAY = 86_400_000

function readingsAcrossDays(dayWeights: ReadonlyArray<[day: number, weightKg: number]>): TrendReading[] {
  return dayWeights.map(([day, weightKg]) => ({
    weightKg,
    measuredAt: new Date(FIRST_DAY + day * MILLISECONDS_PER_DAY),
  }))
}

function daily(values: ReadonlyArray<[day: number, weightKg: number]>): DailyValue[] {
  return values.map(([day, weightKg]) => ({
    // `dayIndex` anchors day keys at `FIRST_DAY`, so an offset key round-trips.
    dayKey: new Date(FIRST_DAY + day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10),
    valueKg: weightKg,
  }))
}

describe("dailyValue", () => {
  it("collapses all of a day's readings into one mean day value", () => {
    const values = dailyValue(
      readingsAcrossDays([
        [0, 80],
        [0, 80.2],
        [1, 81],
      ]),
      "UTC",
    )

    expect(values).toEqual([
      { dayKey: "2026-01-01", valueKg: 80.1 },
      { dayKey: "2026-01-02", valueKg: 81 },
    ])
  })

  it("measures days in the group's timezone, not the UTC calendar", () => {
    const readings = [
      { weightKg: 80.4, measuredAt: new Date("2026-11-06T22:30:00Z") },
      { weightKg: 80.6, measuredAt: new Date("2026-11-07T01:00:00Z") },
    ]

    expect(dailyValue(readings, "America/Santiago")).toEqual([
      { dayKey: "2026-11-06", valueKg: 80.5 },
    ])
    expect(dailyValue(readings, "UTC")).toEqual([
      { dayKey: "2026-11-06", valueKg: 80.4 },
      { dayKey: "2026-11-07", valueKg: 80.6 },
    ])
  })

  it("returns the days in ascending order", () => {
    const values = dailyValue(
      readingsAcrossDays([
        [2, 80],
        [0, 80],
      ]),
      "UTC",
    )

    expect(values.map((value) => value.dayKey)).toEqual(["2026-01-01", "2026-01-03"])
  })
})

describe("rollingMean", () => {
  it("marks windows with fewer daily values than the floor as gaps", () => {
    const windows = rollingMean(daily([
      [0, 80],
      [1, 80.4],
      [2, 80.6],
    ]))

    expect(windows).toEqual([
      { dayKey: "2026-01-01", valueKg: null },
      { dayKey: "2026-01-02", valueKg: 80.2 },
      { dayKey: "2026-01-03", valueKg: 80.33 },
    ])
  })

  it("keeps the window within seven calendar days", () => {
    const windows = rollingMean(daily([
      [0, 80],
      [6, 82],
      [7, 84],
    ]))

    expect(windows[1]).toEqual({ dayKey: "2026-01-07", valueKg: 81 })
    expect(windows[2]).toEqual({ dayKey: "2026-01-08", valueKg: 83 })
  })

  it("spans a window that covers eight days across a leap into the next month", () => {
    const windows = rollingMean(daily([
      [0, 80],
      [27, 81],
      [31, 82],
    ]))

    expect(windows[2]).toEqual({ dayKey: "2026-02-01", valueKg: 81.5 })
  })

  it("skips daily values older than the window even when more exist", () => {
    const windows = rollingMean(daily([
      [0, 90],
      [8, 80],
      [9, 82],
      [10, 84],
    ]))

    expect(windows[1]).toEqual({ dayKey: "2026-01-09", valueKg: null })
    expect(windows[3]).toEqual({ dayKey: "2026-01-11", valueKg: 82 })
  })
})

describe("directionFromSeries", () => {
  function rolling(
    values: ReadonlyArray<[day: number, weightKg: number | null]>,
  ): WindowValue[] {
    return values.map(([day, weightKg]) => ({
      dayKey: new Date(FIRST_DAY + day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10),
      valueKg: weightKg,
    }))
  }

  it("reports a flat week as stable", () => {
    const flatWindow = (day: number, weightKg: number = 80): [number, number] => [day, weightKg]

    const series = rolling([
      flatWindow(0),
      flatWindow(1),
      flatWindow(2),
      flatWindow(3),
      flatWindow(4),
      flatWindow(5),
      flatWindow(6),
      flatWindow(10),
      flatWindow(13),
      flatWindow(17),
      flatWindow(20),
      flatWindow(24),
      flatWindow(27),
      flatWindow(30),
      flatWindow(34),
    ])

    expect(directionFromSeries(series)).toEqual({ outcome: "stable", insufficient: false })
  })

  it("reports a sustained movement beyond the deadband", () => {
    const descendingWindow = (day: number): [number, number] => [day, 82 - (0.55 * day) / 7]

    const series = rolling(
      Array.from({ length: 35 }, (_, day) => descendingWindow(day)).filter(
        (_, day) => day === 0 || day === 6 || day === 13 || day === 20 || day === 27 || day === 34,
      ),
    )

    expect(directionFromSeries(series)).toEqual({ outcome: "down", insufficient: false })
  })

  it("refuses the comparison when the end window lacks enough daily values", () => {
    const series = rolling([
      [0, 80],
      [1, 80.4],
      [30, null],
    ])

    expect(directionFromSeries(series)).toEqual({ outcome: "stable", insufficient: true })
  })

  it("refuses the comparison when the span is not covered", () => {
    const series = rolling(
      Array.from({ length: 15 }, (_, day) => [day, 80] as [number, number]),
    )

    expect(directionFromSeries(series)).toEqual({ outcome: "stable", insufficient: true })
  })

  it("refuses the comparison when there is nothing anchored at all", () => {
    const series = rolling([
      [0, null],
      [31, null],
    ])

    expect(directionFromSeries(series)).toEqual({ outcome: "stable", insufficient: true })
  })

  it("anchors inside the four-week tolerance even when days are skipped", () => {
    const series = rolling([
      [0, 81.5],
      [7, 81],
      [14, 80.5],
      [21, 80],
      [30, 72],
    ])

    expect(directionFromSeries(series)).toEqual({ outcome: "down", insufficient: false })
  })
})

describe("pctBodyMassChange", () => {
  it("keeps the sign of the change", () => {
    expect(pctBodyMassChange(75.2, 80)).toBe(-6)
    expect(pctBodyMassChange(82.5, 80)).toBe(3.1)
  })

  it("guards against a zero or negative start", () => {
    expect(pctBodyMassChange(80, 0)).toBeNull()
    expect(pctBodyMassChange(80, -70)).toBeNull()
  })
})

describe("bmiValue", () => {
  it("computes the screening value to one decimal", () => {
    expect(bmiValue(70, 170)).toBe(24.2)
  })

  it("refuses an invalid height", () => {
    expect(bmiValue(70, 0)).toBeNull()
    expect(bmiValue(70, -5)).toBeNull()
  })
})
