import "server-only"

import type { AwardClaim } from "@/db/schema"
import {
  type ConsistencyAwardType,
  CONSISTENCY_AWARD_TYPES,
} from "@/features/awards/award-type"
import { currentMonthPeriod, previousMonthPeriod } from "@/features/awards/period"
import { computeGroupAwardClaims } from "@/features/awards/server/award-compute"
import { listAwardClaimsForPeriod } from "@/features/awards/server/award-reads"
import {
  type AssembleGroupBoardReturn,
  type BoardViewerReveal,
} from "@/features/board/board-payload"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { groupDayKey, todayKeyInTimeZone } from "@/features/entries/entry-format"
import { getActiveGoal } from "@/features/goals/server/get-active-goal"
import { getGroup, getGroupSettings, getMembership } from "@/features/groups/server/group-access"
import { resolveVisibleMembers } from "@/features/permissions/server/visibility"
import { buildMemberCards } from "./board-cards"
import { type MemberDetail, type MemberView } from "./board-source"

const CONSISTENCY_AWARD_RANKS: Record<ConsistencyAwardType, number> = {
  most_consistent: 0,
  perfect_month: 1,
  best_streak: 2,
  comeback_kid: 3,
}

export type AssembleGroupBoardParams = {
  readonly groupId: string
  readonly viewerProfileId: string
  readonly viewerUserId: string
}

/**
 * The single server-side assembly of a group board. Every board read goes
 * through this function and every member's card field is decided here, before
 * any byte of payload exists (G10): the member's own visibility grant, their
 * dependent status, their ranking opt-out and the note-authoring rule are
 * applied at the source. The board never touches `entries` itself, and no API
 * route serves raw memberships plus raw entries.
 */
export async function assembleGroupBoard(
  params: AssembleGroupBoardParams,
): Promise<AssembleGroupBoardReturn | null> {
  const [membership, group] = await Promise.all([
    getMembership(params.groupId, params.viewerProfileId),
    getGroup(params.groupId),
  ])

  if (!membership || !group) {
    return null
  }

  const timeZone = group.timezone
  const todayKey = todayKeyInTimeZone(timeZone)
  const { periodStart, periodEnd } = currentMonthPeriod(timeZone)
  const previousPeriod = previousMonthPeriod(timeZone)

  const [members, settings, claims, previousClaims] = await Promise.all([
    resolveVisibleMembers({ groupId: params.groupId, viewerProfileId: params.viewerProfileId }),
    getGroupSettings(params.groupId),
    listAwardClaimsForPeriod(params.groupId, periodStart),
    listAwardClaimsForPeriod(params.groupId, previousPeriod.periodStart),
  ])

  // Lazy catch-up: a previous month the group never computed stays honest
  // without a cron. The writes upsert on the unique key, so concurrent views
  // cannot duplicate anything.
  if (previousClaims.length === 0) {
    await computeGroupAwardClaims({
      groupId: params.groupId,
      periodStart: previousPeriod.periodStart,
      periodEnd: previousPeriod.periodEnd,
      computedByUserId: params.viewerUserId,
    })
  }

  const claimsByProfileId = groupClaimsByProfileId(claims)
  const claimsOfProfile = (profileId: string): readonly AwardClaim[] =>
    claimsByProfileId.get(profileId) ?? []

  const membersWithData = await Promise.all(
    members.map(async (member) => {
      const details = await detailOf(member, params, timeZone)

      return { member, details }
    }),
  )

  const { cardOrder, rankedProfileIds } = buildStripOrder(
    membersWithData.map(({ member }) => member),
    claimsOfProfile,
  )

  return {
    group: { id: group.id, name: group.name },
    periodStart,
    periodEnd,
    members: buildMemberCards({
      membersWithData,
      cardOrder,
      claimsOfProfile,
      todayKey,
      timeZone,
      groupWeekday: settings ? settings.weighInWeekday : null,
      viewerProfileId: params.viewerProfileId,
    }),
    consistencyStrip: rankedProfileIds.flatMap((profileId) => {
      const awardTypes = consistencyAwardTypesOf(claimsOfProfile(profileId))

      return awardTypes.length === 0 ? [] : [{ profileId, awardTypes }]
    }),
    viewerReveal: viewerRevealOf(claimsOfProfile(params.viewerProfileId)),
  }
}

/**
 * Per-member reads for the board. A private member resolves to a fixed
 * placeholder upstream, so their entries are never even read for the board.
 * Every entries read lands on `listEntriesForViewer`; no board path queries
 * `entries` directly.
 */
async function detailOf(
  member: MemberView,
  params: AssembleGroupBoardParams,
  timeZone: string,
): Promise<MemberDetail> {
  if (member.isPrivate) {
    return { views: [], goal: null, lastMeasuredDayKey: null }
  }

  const [views, goal] = await Promise.all([
    listEntriesForViewer({
      viewerProfileId: params.viewerProfileId,
      viewerUserId: params.viewerUserId,
      subjectProfileId: member.profileId,
      groupId: params.groupId,
    }),
    member.isDependent || !member.canViewTrend
      ? Promise.resolve(null)
      : getActiveGoal(member.profileId),
  ])

  const lastMeasuredView = views[0] ?? null

  return {
    views,
    goal,
    lastMeasuredDayKey: lastMeasuredView
      ? groupDayKey(lastMeasuredView.measuredAt, timeZone)
      : null,
  }
}

function groupClaimsByProfileId(claims: readonly AwardClaim[]): Map<string, AwardClaim[]> {
  const claimsByProfileId = new Map<string, AwardClaim[]>()

  for (const claim of claims) {
    const owned = claimsByProfileId.get(claim.profileId) ?? []
    owned.push(claim)
    claimsByProfileId.set(claim.profileId, owned)
  }

  return claimsByProfileId
}

/**
 * The only ranking the board issues: the behaviour-ordered strip. Members with
 * consistency awards come first, ordered by the significance of their largest
 * award, ties broken by join order; everyone else keeps the join order. No
 * progress, weight or body magnitude is ever an input (G1), and opted-out and
 * dependent members never enter it (G9, US-6.4).
 */
function buildStripOrder(
  members: readonly MemberView[],
  claimsOfProfile: (profileId: string) => readonly AwardClaim[],
): { readonly cardOrder: readonly string[]; readonly rankedProfileIds: readonly string[] } {
  const joinIndexOfProfile = new Map(members.map((member, index) => [member.profileId, index]))

  const awardRankOf = (member: MemberView): number => {
    const awardTypes = consistencyAwardTypesOf(claimsOfProfile(member.profileId))

    return awardTypes.length === 0
      ? Number.POSITIVE_INFINITY
      : Math.min(...awardTypes.map((awardType) => CONSISTENCY_AWARD_RANKS[awardType]))
  }

  const ranked = members
    .filter(
      (member) =>
        !member.isPrivate &&
        !member.isDependent &&
        !member.rankingOptOut &&
        consistencyAwardTypesOf(claimsOfProfile(member.profileId)).length > 0,
    )
    .sort((left, right) => {
      const rankDelta = awardRankOf(left) - awardRankOf(right)

      return rankDelta !== 0
        ? rankDelta
        : (joinIndexOfProfile.get(left.profileId) ?? 0) - (joinIndexOfProfile.get(right.profileId) ?? 0)
    })

  const rankedProfileIds = new Set(ranked.map((member) => member.profileId))

  return {
    rankedProfileIds: ranked.map((member) => member.profileId),
    cardOrder: [
      ...ranked.map((member) => member.profileId),
      ...members
        .map((member) => member.profileId)
        .filter((profileId) => !rankedProfileIds.has(profileId)),
    ],
  }
}

function consistencyAwardTypesOf(claims: readonly AwardClaim[]): ConsistencyAwardType[] {
  const consistencyTypes = new Set<string>(CONSISTENCY_AWARD_TYPES)

  return claims.flatMap((claim) =>
    consistencyTypes.has(claim.awardType) ? [claim.awardType as ConsistencyAwardType] : [],
  )
}

/**
 * The private reveal travels in the viewer's own payload only, published or
 * not; every other viewer's payload contains, without exception, no claim for
 * the member it is about (US-6.6, G1).
 */
function viewerRevealOf(claims: readonly AwardClaim[]): BoardViewerReveal | null {
  const reveal = claims.find((claim) => claim.awardType === "biggest_change")

  return reveal ? { claimId: reveal.id, isPublic: reveal.sharedPublic } : null
}
