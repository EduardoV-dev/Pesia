import { type GoalDirection } from "@/features/goals/direction"

export const GOAL_PROGRESS_MIN = 0
export const GOAL_PROGRESS_MAX = 100

export type GoalDirectionKey = "toward_goal" | "away_from_goal" | "stable"

export type GoalProgressInput = {
  readonly direction: GoalDirection
  readonly targetWeightKg: number
  readonly bandKg: number | null
  readonly baselineWeightKg: number
}

export type GoalProgress = {
  readonly percentage: number
  readonly directionKey: GoalDirectionKey
  readonly distanceToBandKg: number | null
}

export function calculateGoalProgress(
  goal: GoalProgressInput,
  currentWeightKg: number,
): GoalProgress {
  if (goal.direction === "maintain") {
    return calculateMaintainProgress(goal, currentWeightKg)
  }

  return calculateDirectionalProgress(goal, currentWeightKg)
}

function calculateDirectionalProgress(
  goal: GoalProgressInput,
  currentWeightKg: number,
): GoalProgress {
  const isLosing = goal.direction === "lose"
  const totalDistance = isLosing
    ? goal.baselineWeightKg - goal.targetWeightKg
    : goal.targetWeightKg - goal.baselineWeightKg
  const coveredDistance = isLosing
    ? goal.baselineWeightKg - currentWeightKg
    : currentWeightKg - goal.baselineWeightKg

  const percentage = totalDistance === 0 ? GOAL_PROGRESS_MIN : (coveredDistance / totalDistance) * 100

  return {
    percentage: roundPercentage(percentage),
    directionKey: resolveDirectionKey(coveredDistance),
    distanceToBandKg: null,
  }
}

function calculateMaintainProgress(goal: GoalProgressInput, currentWeightKg: number): GoalProgress {
  const bandKg = goal.bandKg ?? 0
  const distanceFromTarget = Math.abs(currentWeightKg - goal.targetWeightKg)
  const isInsideBand = distanceFromTarget <= bandKg
  const distanceToBandKg = Math.max(0, distanceFromTarget - bandKg)

  const percentage = isInsideBand
    ? GOAL_PROGRESS_MAX
    : (bandKg / (bandKg + distanceToBandKg)) * 100

  return {
    percentage: roundPercentage(percentage),
    directionKey: isInsideBand ? "stable" : "away_from_goal",
    distanceToBandKg,
  }
}

function resolveDirectionKey(coveredDistance: number): GoalDirectionKey {
  if (coveredDistance > 0) {
    return "toward_goal"
  }

  if (coveredDistance < 0) {
    return "away_from_goal"
  }

  return "stable"
}

function roundPercentage(percentage: number): number {
  if (!Number.isFinite(percentage)) {
    return GOAL_PROGRESS_MIN
  }

  const clamped = Math.min(GOAL_PROGRESS_MAX, Math.max(GOAL_PROGRESS_MIN, percentage))

  return Math.round(clamped)
}
