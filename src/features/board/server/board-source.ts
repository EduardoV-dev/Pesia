import type { AwardClaim, Goal } from "@/db/schema"
import type { EntryView } from "@/features/entries/entry-view"
import type { GroupMemberView } from "@/features/permissions/server/visibility"

/** One group member as the read check reports it to the board. */
export type MemberView = GroupMemberView

/** Per-member reads the card builder consumes; never serialized to a client. */
export type MemberDetail = {
  readonly views: readonly EntryView[]
  readonly goal: Goal | null
  readonly lastMeasuredDayKey: string | null
}

export type ClaimsOfProfile = (profileId: string) => readonly AwardClaim[]

export type CardSource = {
  readonly membersWithData: readonly {
    readonly member: MemberView
    readonly details: MemberDetail
  }[]
  /** Every member's card order: ranked members first, join order after (G1). */
  readonly cardOrder: readonly string[]
  readonly claimsOfProfile: ClaimsOfProfile
  readonly todayKey: string
  readonly groupWeekday: number | null
  readonly timeZone: string
  readonly viewerProfileId: string
}
