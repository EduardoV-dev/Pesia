/**
 * Consistency awards are earned by behaviour against each member's own cadence.
 * `biggest_change` is the private magnitude reveal (US-6.6): it lives in the same
 * claim table but never ranks and stays unpublished until the member opts in.
 */
export const CONSISTENCY_AWARD_TYPES = [
  "most_consistent",
  "perfect_month",
  "best_streak",
  "comeback_kid",
] as const

export type ConsistencyAwardType = (typeof CONSISTENCY_AWARD_TYPES)[number]

export type AwardClaimType = ConsistencyAwardType | "biggest_change"

export const CONSISTENCY_AWARD_LABELS: Record<ConsistencyAwardType, string> = {
  most_consistent: "Consistente",
  perfect_month: "Mes perfecto",
  best_streak: "Mejor racha",
  comeback_kid: "Gran regreso",
}

export const BIGGEST_CHANGE_LABEL = "Me moví más en el mes"
