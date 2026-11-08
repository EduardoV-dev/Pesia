import { type AwardClaimType, type ConsistencyAwardType } from "@/features/awards/award-type"
import { type WeightUnit } from "@/lib/weight-units"
import { type TrendDirection, type TrendLineValue } from "@/features/stats/compose-trend"
import { type TrendReading } from "@/features/stats/trend-math"

/** Goal-relative goal progress of one member; never includes an ordinal position (G1). */
export type BoardProgress = {
  readonly percentage: number
  readonly distanceToBandKg: number | null
}

export type BoardSparkline = {
  readonly readings: readonly TrendReading[]
  readonly line: readonly TrendLineValue[]
}

/**
 * The exhaustive board card union. Every card the board renders is one of these
 * five kinds, chosen on the server from the member's own visibility grant, so
 * TypeScript forces every case to be handled (G10). `rankingOptOut` is a flag on
 * non-private cards, not a data variant: an opted-out member keeps their normal
 * card but leaves the consistency strip and every award chip (US-6.4, G1).
 */
export type BoardMemberCard =
  | BoardFullCard
  | BoardLatestOnlyCard
  | BoardNameOnlyCard
  | BoardDependentCard
  | { readonly kind: "private" }

export type BoardFullCard = {
  readonly kind: "full"
  readonly profileId: string
  readonly displayName: string
  readonly avatarEmoji: string | null
  readonly isViewer: boolean
  readonly rankingOptOut: boolean
  readonly latestWeightKg: number | null
  readonly unit: WeightUnit
  readonly sparkline: BoardSparkline | null
  readonly direction: TrendDirection | null
  readonly progress: BoardProgress | null
  /** Consistency chips plus the member's published reveal (shared_public). */
  readonly awardTypes: readonly AwardClaimType[]
  readonly isDue: boolean
  /** The viewer's own note on this member's latest-authored entry; travels to no one else. */
  readonly latestNote: string | null
}

export type BoardLatestOnlyCard = {
  readonly kind: "latestOnly"
  readonly profileId: string
  readonly displayName: string
  readonly avatarEmoji: string | null
  readonly isViewer: boolean
  readonly rankingOptOut: boolean
  readonly latestWeightKg: number | null
  readonly unit: WeightUnit
  readonly isDue: boolean
  readonly latestNote: string | null
}

export type BoardNameOnlyCard = {
  readonly kind: "nameOnly"
  readonly profileId: string
  readonly displayName: string
  readonly avatarEmoji: string | null
  readonly isViewer: boolean
  readonly rankingOptOut: boolean
  readonly unit: WeightUnit
  readonly isDue: boolean
  readonly latestNote: string | null
}

export type BoardDependentCard = {
  readonly kind: "dependent"
  readonly profileId: string
  readonly displayName: string
  readonly avatarEmoji: string | null
  readonly isViewer: boolean
  readonly latestWeightKg: number | null
  readonly unit: WeightUnit
  readonly direction: TrendDirection | null
  readonly latestNote: string | null
}

/** The viewer's private "me moví más" reveal; absent from every other payload. */
export type BoardViewerReveal = {
  readonly claimId: string
  readonly isPublic: boolean
}

export type PublishRevealAction = (formData: FormData) => Promise<void>

export type AssembleGroupBoardReturn = {
  readonly group: { readonly id: string; readonly name: string }
  readonly periodStart: string
  readonly periodEnd: string
  readonly members: readonly BoardMemberCard[]
  /** Behaviour-ordered members with their shared consistency awards (G1). */
  readonly consistencyStrip: readonly { readonly profileId: string; readonly awardTypes: readonly ConsistencyAwardType[] }[]
  readonly viewerReveal: BoardViewerReveal | null
}
