import "server-only"

import { type Goal, type Profile } from "@/db/schema"
import { getGroupsForProfile } from "@/features/groups/server/group-access"
import { type TrendView } from "@/features/stats/compose-trend"
import { getActiveGoal } from "@/features/goals/server/get-active-goal"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { composeTrend } from "@/features/stats/compose-trend"

export type ComposedTrend = {
  readonly trend: TrendView
  readonly goal: Goal | null
}

/**
 * The one data path for every trend surface: the profile's reads land on
 * `listEntriesForViewer` (G10) and feed the single composition. The profile must
 * already be gated by the caller's standing (`getProfileForManager` or the
 * active-profile resolution).
 */
export async function composeTrendForProfile(
  profile: Profile,
  viewerUserId: string,
): Promise<ComposedTrend> {
  const [goal, views, subjectGroups] = await Promise.all([
    profile.isDependent ? Promise.resolve(null) : getActiveGoal(profile.id),
    listEntriesForViewer({
      viewerProfileId: profile.id,
      viewerUserId,
      subjectProfileId: profile.id,
    }),
    getGroupsForProfile(profile.id),
  ])

  return {
    trend: composeTrend({
      views,
      goal,
      timeZone: subjectGroups[0]?.timezone ?? "UTC",
      bmiEnabled: profile.bmiEnabled,
      heightCm: profile.heightCm,
    }),
    goal,
  }
}
