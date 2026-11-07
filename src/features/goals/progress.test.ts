import { describe, expect, it } from "vitest"

import { calculateGoalProgress } from "@/features/goals/progress"

const loseGoal = {
  direction: "lose",
  targetWeightKg: 70,
  bandKg: null,
  baselineWeightKg: 80,
} as const

const gainGoal = {
  direction: "gain",
  targetWeightKg: 80,
  bandKg: null,
  baselineWeightKg: 72.5,
} as const

const maintainGoal = {
  direction: "maintain",
  targetWeightKg: 72,
  bandKg: 2,
  baselineWeightKg: 72,
} as const

describe("calculateGoalProgress", () => {
  it("reads 0% at the baseline", () => {
    expect(calculateGoalProgress(loseGoal, 80).percentage).toBe(0)
    expect(calculateGoalProgress(loseGoal, 80).directionKey).toBe("stable")
  })

  it("reads the share of the distance already covered", () => {
    expect(calculateGoalProgress(loseGoal, 75).percentage).toBe(50)
    expect(calculateGoalProgress(loseGoal, 75).directionKey).toBe("toward_goal")
  })

  it("measures a gain goal from the same baseline", () => {
    expect(calculateGoalProgress(gainGoal, 76.25).percentage).toBe(50)
    expect(calculateGoalProgress(gainGoal, 76.25).directionKey).toBe("toward_goal")
  })

  it("reads 100% once the target is reached or passed", () => {
    expect(calculateGoalProgress(loseGoal, 70).percentage).toBe(100)
    expect(calculateGoalProgress(loseGoal, 65).percentage).toBe(100)
  })

  it("never reads below 0% when the weight moves away from the goal", () => {
    const progress = calculateGoalProgress(loseGoal, 85)

    expect(progress.percentage).toBe(0)
    expect(progress.directionKey).toBe("away_from_goal")
  })

  it("reads 100% while the weight is inside the maintain band", () => {
    const progress = calculateGoalProgress(maintainGoal, 73)

    expect(progress.percentage).toBe(100)
    expect(progress.directionKey).toBe("stable")
    expect(progress.distanceToBandKg).toBe(0)
  })

  it("reports the distance to the band when the weight is outside it", () => {
    const progress = calculateGoalProgress(maintainGoal, 75)

    expect(progress.percentage).toBe(67)
    expect(progress.distanceToBandKg).toBe(1)
    expect(progress.directionKey).toBe("away_from_goal")
  })

  it("never leaves the 0 to 100 range", () => {
    const percentages = [0, 10, 50, 72.5, 80, 120, 200].map(
      (currentWeightKg) => calculateGoalProgress(loseGoal, currentWeightKg).percentage,
    )

    expect(Math.min(...percentages)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...percentages)).toBeLessThanOrEqual(100)
  })
})
