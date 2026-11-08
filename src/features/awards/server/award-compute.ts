import "server-only"

import { getGroup, getGroupSettings, listGroupMembers } from "@/features/groups/server/group-access"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { type EntryView } from "@/features/entries/entry-view"
import { groupDayKey } from "@/features/entries/entry-format"
import { computeConsistencyAwardTypes } from "@/features/awards/consistency"
import { saveAwardClaims } from "./award-writes"
import { biggestChangeWinnerOf, saveBiggestChangeClaim, type BiggestChangeInput } from "./biggest-change"

export type ComputeGroupAwardClaimsParams = {
  readonly groupId: string
  readonly periodStart: string
  readonly periodEnd: string
  /** The login that requested the run; only used for identity on own-entry reads. */
  readonly computedByUserId: string
}

/**
 * Computes the whole group's claims for one period. Weights are read through
 * each member's own filtered history (`listEntriesForViewer`); dependents are
 * never awarded (G9), and the reveal stays private until its owner publishes.
 * Recomputing a period is idempotent: the claim rows upsert on the unique key.
 */
export async function computeGroupAwardClaims(
  params: ComputeGroupAwardClaimsParams,
): Promise<void> {
  const group = await getGroup(params.groupId)

  if (!group) {
    return
  }

  const timeZone = group.timezone

  const [members, settings] = await Promise.all([
    listGroupMembers(params.groupId),
    getGroupSettings(params.groupId),
  ])

  const periodEntryDetails = await Promise.all(
    members
      .filter((member) => !member.profile.isDependent)
      .map(async (member) => {
        const historyViews = await listEntriesForViewer({
          viewerProfileId: member.profile.id,
          subjectProfileId: member.profile.id,
          viewerUserId: params.computedByUserId,
        })
        const periodViews = historyViews.filter(isWithinPeriodOf(params, timeZone))
        const orderedPeriodViews = [...periodViews].sort(
          (left, right) => left.measuredAt.getTime() - right.measuredAt.getTime(),
        )

        const awardTypes = computeConsistencyAwardTypes({
          entryMeasuredAts: historyViews.map((view) => view.measuredAt),
          cadenceDays: member.membership.cadenceDays,
          weighInWeekday: settings ? settings.weighInWeekday : null,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          timeZone,
        })

        const biggestChangeInput: BiggestChangeInput = {
          profileId: member.profile.id,
          firstWeightKg: earliestWeightKgOf(orderedPeriodViews),
          lastWeightKg: latestWeightKgOf(orderedPeriodViews),
        }

        return { member, awardTypes, biggestChangeInput }
      }),
  )

  for (const detail of periodEntryDetails) {
    if (detail.awardTypes.length === 0) {
      continue
    }

    await saveAwardClaims({
      groupId: params.groupId,
      profileId: detail.member.profile.id,
      types: detail.awardTypes,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    })
  }

  await saveBiggestChangeClaim({
    groupId: params.groupId,
    winnerProfileId: biggestChangeWinnerOf(
      periodEntryDetails.map((detail) => detail.biggestChangeInput),
    ).winnerProfileId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  })
}

function isWithinPeriodOf(
  params: ComputeGroupAwardClaimsParams,
  timeZone: string,
): (view: EntryView) => boolean {
  return (view) => {
    const dayKey = groupDayKey(view.measuredAt, timeZone)

    return dayKey >= params.periodStart && dayKey <= params.periodEnd
  }
}

function earliestWeightKgOf(orderedViews: readonly EntryView[]): number | null {
  return orderedViews.find((view) => view.weightKg !== null)?.weightKg ?? null
}

function latestWeightKgOf(orderedViews: readonly EntryView[]): number | null {
  return [...orderedViews].reverse().find((view) => view.weightKg !== null)?.weightKg ?? null
}
