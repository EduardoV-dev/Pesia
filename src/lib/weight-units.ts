export const WEIGHT_UNITS = ["kg", "lb"] as const

export type WeightUnit = (typeof WEIGHT_UNITS)[number]

const POUNDS_PER_KILOGRAM = 0.45359237

export function kilogramsToDisplay(kilograms: number, unit: WeightUnit): number {
  return unit === "lb" ? kilograms / POUNDS_PER_KILOGRAM : kilograms
}

export function displayToKilograms(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value * POUNDS_PER_KILOGRAM : value
}

/** Weights are stored with two decimals, so comparisons must use the same precision. */
export function roundWeightKg(kilograms: number): number {
  return Math.round(kilograms * 100) / 100
}

export function displayWeightValue(kilograms: number, unit: WeightUnit): number {
  return Number(kilogramsToDisplay(kilograms, unit).toFixed(1))
}

export function toWeightUnit(value: string): WeightUnit {
  return value === "lb" ? "lb" : "kg"
}

export function formatWeight(kilograms: number, unit: WeightUnit): string {
  return `${displayWeightValue(kilograms, unit)} ${unit}`
}
