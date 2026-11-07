import { describe, expect, it } from "vitest"

import { randomUUID } from "node:crypto"

import { type Goal } from "@/db/schema"
import { type EntryView } from "@/features/entries/entry-view"
import {
  BASELINE_LABEL_WITH_GOAL,
  BASELINE_LABEL_WITHOUT_GOAL,
  composeTrend,
  type ComposeTrendParams,
} from "@/features/stats/compose-trend"

const FIRST_DAY = Date.parse("2026-01-01T00:00:00Z")
const MILLISECONDS_PER_DAY = 86_400_000

function entryView(weightKg: number | null, day: number): EntryView {
  const measuredAt = new Date(FIRST_DAY + day * MILLISECONDS_PER_DAY)

  return {
    id: randomUUID(),
    profileId: "subject-profile",
    weightVisible: weightKg !== null,
    weightKg,
    measuredAt,
    recordedAt: measuredAt,
    editedAt: null,
    editedByName: null,
    recordedByName: "Ana",
    recordedByIsLegacy: false,
    note: null,
    canEdit: false,
  }
}

function win(
  weights: ReadonlyArray<[day: number, weightKg: number]>,
): EntryView[] {
  return weights.map(([day, weightKg]) => entryView(weightKg, day))
}

/** Dense daily readings moving `rateKg` per week for the whole 35-day span. */
function dailyDrift(startKg: number, rateKgPerWeek: number): EntryView[] {
  return win(
    Array.from({ length: 35 }, (_, day) => {
      const weightKg = startKg + (rateKgPerWeek * day) / 7
      return [day, Math.round(weightKg * 100) / 100] as [number, number]
    }),
  )
}

function goal(overrides: Partial<Omit<Goal, "profileId">> = {}): Goal {
  return {
    id: "goal-1",
    profileId: "subject-profile",
    direction: "lose",
    targetWeightKg: 70,
    bandKg: null,
    baselineWeightKg: 80,
    baselineAt: new Date(FIRST_DAY),
    active: true,
    createdAt: new Date(FIRST_DAY),
    ...overrides,
  }
}

function compose(overrides: Partial<ComposeTrendParams>): ReturnType<typeof composeTrend> {
  return composeTrend({
    views: [],
    goal: null,
    timeZone: "UTC",
    bmiEnabled: false,
    heightCm: null,
    ...overrides,
  })
}

describe("composeTrend draws the trend the member reads", () => {
  it("feeds the goal progress with the latest rolling mean, not a single reading", () => {
    const trend = compose({
      views: dailyDrift(82, -0.55),
      goal: goal(),
    })

    expect(trend.direction).toBe("toward")
    expect(trend.progress?.percentage).toBeGreaterThan(0)
    expect(trend.progress?.percentage).toBeLessThan(50)
  })

  it("draws the rolling mean line and keeps the readings behind it", () => {
    const trend = compose({
      views: dailyDrift(82, 0),
      goal: null,
    })

    expect(trend.readings).toHaveLength(35)
    expect(trend.line).toHaveLength(35)
    expect(trend.line[0].valueKg).toBeNull()
    expect(trend.line[1].valueKg).not.toBeNull()
    expect(trend.currentKg).not.toBeNull()
  })

  it("continues composing through pre-filtered assembler views without weights", () => {
    const trend = compose({
      views: [entryView(null, 0), entryView(80.4, 1)],
    })

    expect(trend.readings).toEqual([
      { weightKg: 80.4, measuredAt: new Date(FIRST_DAY + MILLISECONDS_PER_DAY) },
    ])
  })

  it("states the insufficient-data direction when the span is not covered", () => {
    const trend = compose({
      views: win([
        [0, 80],
        [1, 80.4],
      ]),
    })

    expect(trend.direction).toBe("insufficient")
    expect(trend.pctChange).not.toBeNull()
  })

  it("renders nothing but emptiness when there are no entries", () => {
    const trend = compose({ goal: goal() })

    expect(trend.readings).toEqual([])
    expect(trend.pctChange).toBeNull()
    expect(trend.baselineKg).toBe(80)
    expect(trend.direction).toBe("insufficient")
  })
})

describe("composeTrend measures direction against the member's own goal", () => {
  it("does the same physical change opposite ways for opposite goals", () => {
    const views = dailyDrift(79.5, 0.55)

    const againstLoss = compose({ views, goal: goal() })
    const againstGain = compose({
      views,
      goal: goal({
        direction: "gain",
        targetWeightKg: 85,
        baselineWeightKg: 72,
      }),
    })

    expect(againstLoss.direction).toBe("away")
    expect(againstGain.direction).toBe("toward")
  })

  it("returns a moving member back toward a maintain target", () => {
    const trend = compose({
      views: dailyDrift(75, -0.55),
      goal: goal({ direction: "maintain", targetWeightKg: 72, bandKg: 2 }),
    })

    expect(trend.direction).toBe("toward")
  })

  it("speaks about plain movement to a member without a target", () => {
    const trend = compose({ views: dailyDrift(79.5, 0.55) })

    expect(trend.direction).toBe("up")
    expect(trend.progress).toBeNull()
    expect(trend.baselineLabel).toBe(BASELINE_LABEL_WITHOUT_GOAL)
    expect(trend.pctChange).toBeGreaterThan(0)
  })

  it("names the goal baseline and reuses the clamped goal math for progress", () => {
    const trend = compose({
      views: dailyDrift(82, -0.55),
      goal: goal(),
    })

    expect(trend.baselineLabel).toBe(BASELINE_LABEL_WITH_GOAL)
    expect(trend.baselineKg).toBe(80)
    expect(trend.progress?.percentage).toBeGreaterThanOrEqual(0)
    expect(trend.progress?.percentage).toBeLessThanOrEqual(100)
  })

  it("recycles the maintain band distance without a verdict", () => {
    const trend = compose({
      views: dailyDrift(75, 0),
      goal: goal({ direction: "maintain", targetWeightKg: 72, bandKg: 2 }),
    })

    expect(trend.direction).toBe("stable")
    expect(trend.progress?.distanceToBandKg).toBe(1)
    expect(trend.progress?.percentage).toBe(67)
  })

  it("starts the no-goal baseline at the earliest day's mean", () => {
    const trend = compose({
      views: win([
        [0, 80],
        [0, 80.2],
        [1, 81],
      ]),
    })

    expect(trend.baselineKg).toBe(80.1)
  })
})

describe("composeTrend keeps BMI private behind the opt-in", () => {
  it("shows the value only when the member opted in with a height", () => {
    const views = dailyDrift(70, 0)
    const optedIn = compose({ views, bmiEnabled: true, heightCm: 170 })
    const optedOut = compose({ views, bmiEnabled: false, heightCm: 170 })
    const optedInWithoutHeight = compose({ views, bmiEnabled: true, heightCm: null })

    expect(optedIn.bmi).toBe(24.2)
    expect(optedOut.bmi).toBeNull()
    expect(optedInWithoutHeight.bmi).toBeNull()
  })

  it("leaves BMI out entirely when no weight exists to measure", () => {
    const trend = compose({ bmiEnabled: true, heightCm: 170 })

    expect(trend.bmi).toBeNull()
  })
})
