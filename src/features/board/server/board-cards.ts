import "server-only"

import type { AwardClaim } from "@/db/schema"
import type { AwardClaimType } from "@/features/awards/award-type"
import type { BoardMemberCard } from "@/features/board/board-payload"
import { groupDayKey } from "@/features/entries/entry-format"
import { type EntryView } from "@/features/entries/entry-view"
import { composeTrend, type TrendDirection } from "@/features/stats/compose-trend"
import { type CardSource, type MemberDetail, type MemberView } from "./board-source"

const WEEKLY_FALLBACK_CADENCE_DAYS = 7
const MS_PER_DAY = 86_400_000

/**
 * One card per member, ordered by the consistency strip first and the family
 * join order after it: every member renders exactly one card, and the private
 * placeholder moves with its member's join order.
 */
export function buildMemberCards(source: CardSource): BoardMemberCard[] {
  const cardByProfileId = new Map(
    source.membersWithData.map(({ member, details }) => [member.profileId, cardOf(member, details, source)] as const),
  )

  return [
    ...source.cardOrder,
    ...source.membersWithData
      .map(({ member }) => member.profileId)
      .filter((profileId) => !source.cardOrder.includes(profileId)),
  ].flatMap((profileId) => {
    const card = cardByProfileId.get(profileId)

    return card ? [card] : []
  })
}

function cardOf(member: MemberView, details: MemberDetail, source: CardSource): BoardMemberCard {
  if (member.isPrivate) {
    // A private member is nothing at all: no name, no data, no due state (G8),
    // and the payload carries no reason for the absence.
    return { kind: "private" }
  }

  if (member.isDependent) {
    return dependentCard(member, details, source)
  }

  if (member.canViewTrend) {
    return fullCard(member, details, source)
  }

  if (member.canViewWeight) {
    return latestOnlyCard(member, details, source)
  }

  return nameOnlyCard(member, details, source)
}

function fullCard(member: MemberView, details: MemberDetail, source: CardSource): BoardMemberCard {
  const trend = composeTrend({
    views: details.views,
    goal: details.goal,
    timeZone: source.timeZone,
    // BMI is never board data (G4).
    bmiEnabled: false,
    heightCm: null,
  })
  const sparkline = trend.readings.length === 0 ? null : { readings: trend.readings, line: trend.line }

  return {
    kind: "full",
    profileId: member.profileId,
    displayName: member.displayName,
    avatarEmoji: member.avatarEmoji,
    isViewer: member.profileId === source.viewerProfileId,
    rankingOptOut: member.rankingOptOut,
    latestWeightKg: latestWeightOf(details.views),
    unit: member.unit,
    sparkline,
    direction: trend.direction,
    progress: trend.progress,
    awardTypes: chipTypesOf(member, source.claimsOfProfile(member.profileId)),
    isDue: isDue(member, details, source),
    latestNote: latestAuthorNoteOf(details.views),
  }
}

function latestOnlyCard(
  member: MemberView,
  details: MemberDetail,
  source: CardSource,
): BoardMemberCard {
  return {
    kind: "latestOnly",
    profileId: member.profileId,
    displayName: member.displayName,
    avatarEmoji: member.avatarEmoji,
    isViewer: member.profileId === source.viewerProfileId,
    rankingOptOut: member.rankingOptOut,
    latestWeightKg: latestWeightOf(details.views),
    unit: member.unit,
    isDue: isDue(member, details, source),
    latestNote: latestAuthorNoteOf(details.views),
  }
}

function nameOnlyCard(
  member: MemberView,
  details: MemberDetail,
  source: CardSource,
): BoardMemberCard {
  return {
    kind: "nameOnly",
    profileId: member.profileId,
    displayName: member.displayName,
    avatarEmoji: member.avatarEmoji,
    isViewer: member.profileId === source.viewerProfileId,
    rankingOptOut: member.rankingOptOut,
    unit: member.unit,
    // Due state is a flag, never a date, for a member whose grant hides weight (G7).
    isDue: isDue(member, details, source),
    latestNote: latestAuthorNoteOf(details.views),
  }
}

function dependentCard(
  member: MemberView,
  details: MemberDetail,
  source: CardSource,
): BoardMemberCard {
  return {
    kind: "dependent",
    profileId: member.profileId,
    displayName: member.displayName,
    avatarEmoji: member.avatarEmoji,
    isViewer: false,
    latestWeightKg: latestWeightOf(details.views),
    unit: member.unit,
    // Trend direction only: no sparkline, no progress, no awards (G9).
    direction: member.canViewTrend ? composedTrendDirection(details.views, source.timeZone) : null,
    latestNote: latestAuthorNoteOf(details.views),
  }
}

function composedTrendDirection(
  views: readonly EntryView[],
  timeZone: string,
): TrendDirection {
  return composeTrend({
    views,
    goal: null,
    timeZone,
    bmiEnabled: false,
    heightCm: null,
  }).direction
}

function latestWeightOf(views: readonly EntryViewLike[]): number | null {
  return views.find((view) => view.weightKg !== null)?.weightKg ?? null
}

/**
 * The viewer's own note travels to their own payload; every other note never
 * crosses the board payload, at any visibility level. `listEntriesForViewer`
 * nulls notes that are not the viewer's own, and the assembler keeps their
 * guarantee (G10).
 */
function latestAuthorNoteOf(views: readonly EntryView[]): string | null {
  return views.find((view) => view.note !== null)?.note ?? null
}

/**
 * Award chips on a card: the member's consistency claims, and their published
 * "me moví más" badge (shared_public). A member who opted out of rankings
 * carries no award display anywhere on the board (US-6.4); dependents never
 * reach this code (G9).
 */
function chipTypesOf(member: MemberView, claims: readonly AwardClaim[]): AwardClaimType[] {
  if (member.rankingOptOut) {
    return []
  }

  return claims
    .map((claim) =>
      claim.awardType === "biggest_change" && !claim.sharedPublic ? null : claim.awardType,
    )
    .flatMap((awardType) => (awardType ? [awardType] : []))
}

/**
 * A member's turn is due when their last weigh-in is as old as their own
 * cadence (their joined day anchors members without entries). Dependents are
 * excluded by construction: their "turn" is whoever records for them, never a
 * self-check they can miss (G7).
 */
function isDue(member: MemberView, details: MemberDetail, source: CardSource): boolean {
  if (member.isDependent) {
    return false
  }

  const cadenceDays =
    member.cadenceDays ?? (source.groupWeekday === null ? null : WEEKLY_FALLBACK_CADENCE_DAYS)

  if (cadenceDays === null) {
    return false
  }

  const anchorDayKey = details.lastMeasuredDayKey ?? groupDayKey(member.joinedAt, source.timeZone)
  const daysSinceAnchor = dayNumber(source.todayKey) - dayNumber(anchorDayKey)

  return daysSinceAnchor >= cadenceDays
}

function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / MS_PER_DAY)
}

type EntryViewLike = { readonly weightKg: number | null }
