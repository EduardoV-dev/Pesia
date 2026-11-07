export const GOAL_DIRECTIONS = ["lose", "gain", "maintain"] as const

export type GoalDirection = (typeof GOAL_DIRECTIONS)[number]

export type DerivedGoalDirection = Exclude<GoalDirection, "maintain">

/**
 * "maintain" is never derived: a target equal to the current weight is a coincidence,
 * not an intention. It is chosen explicitly and expressed as a band around a target.
 */
export function deriveGoalDirection(
  currentWeightKg: number,
  targetWeightKg: number,
): DerivedGoalDirection | null {
  if (targetWeightKg < currentWeightKg) {
    return "lose"
  }

  if (targetWeightKg > currentWeightKg) {
    return "gain"
  }

  return null
}
