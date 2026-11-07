import { describe, expect, it } from "vitest"

import {
  displayToKilograms,
  formatWeight,
  kilogramsToDisplay,
  roundWeightKg,
} from "@/lib/weight-units"

describe("weight units", () => {
  it("keeps kilograms untouched", () => {
    expect(kilogramsToDisplay(72.5, "kg")).toBe(72.5)
    expect(displayToKilograms(72.5, "kg")).toBe(72.5)
  })

  it("converts pounds to kilograms and back without losing the weight", () => {
    const pounds = kilogramsToDisplay(72.5, "lb")

    expect(pounds).toBeCloseTo(159.835, 3)
    expect(displayToKilograms(pounds, "lb")).toBeCloseTo(72.5, 5)
  })

  it("rounds to the precision the database stores", () => {
    expect(roundWeightKg(72.456)).toBe(72.46)
    expect(roundWeightKg(72.454)).toBe(72.45)
  })

  it("formats a weight in the unit of the profile", () => {
    expect(formatWeight(70, "kg")).toBe("70 kg")
    expect(formatWeight(70, "lb")).toBe("154.3 lb")
  })
})
