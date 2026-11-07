import { describe, expect, it } from "vitest"

import { deriveGoalDirection } from "@/features/goals/direction"

describe("deriveGoalDirection", () => {
  it("derives lose when the target is below the current weight", () => {
    expect(deriveGoalDirection(72.5, 70)).toBe("lose")
  })

  it("derives gain when the target is above the current weight", () => {
    expect(deriveGoalDirection(72.5, 80)).toBe("gain")
  })

  it("never derives maintain, which is chosen explicitly", () => {
    expect(deriveGoalDirection(72.5, 72.5)).toBeNull()
  })
})
