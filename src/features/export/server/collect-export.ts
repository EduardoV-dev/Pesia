import "server-only"

import { eq, inArray, or } from "drizzle-orm"

import { db } from "@/db/client"
import {
  canLogFor,
  goals,
  groupMemberships,
  groups,
  pushOptIns,
  type Profile,
} from "@/db/schema"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { getManagedProfiles } from "@/features/profiles/server/profile-access"

import type { ExportedEntry, ExportedProfile, MemberExport } from "../export-view"

export type CollectMemberExportParams = {
  readonly userId: string
}

/**
 * Assembles the member's complete export through the same read primitives the app
 * enforces everywhere else: entries come from `listEntriesForViewer` in the
 * profile's own-history path, so foreign notes are withheld at the source and
 * deleted rows never appear. Everything else is the member's own rows.
 */
export async function collectMemberExport({
  userId,
}: CollectMemberExportParams): Promise<MemberExport> {
  const managedProfiles = await getManagedProfiles(userId)
  const profileIds = managedProfiles.map((profile) => profile.id)

  const entriesPerProfile = await Promise.all(
    managedProfiles.map((profile) =>
      listEntriesForViewer({
        viewerProfileId: profile.id,
        viewerUserId: userId,
        subjectProfileId: profile.id,
      }),
    ),
  )

  const [exportGoals, memberships, permissions, pushOptInRows] = await Promise.all([
    profileIds.length > 0
      ? db.select().from(goals).where(inArray(goals.profileId, profileIds))
      : Promise.resolve([]),
    profileIds.length > 0
      ? db
          .select({
            groupId: groupMemberships.groupId,
            groupName: groups.name,
            profileId: groupMemberships.profileId,
            role: groupMemberships.role,
            visibility: groupMemberships.visibility,
            rankingOptOut: groupMemberships.rankingOptOut,
            cadenceDays: groupMemberships.cadenceDays,
            joinedAt: groupMemberships.joinedAt,
          })
          .from(groupMemberships)
          .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
          .where(inArray(groupMemberships.profileId, profileIds))
      : Promise.resolve([]),
    profileIds.length > 0
      ? db
          .select()
          .from(canLogFor)
          .where(
            or(
              inArray(canLogFor.loggerProfileId, profileIds),
              inArray(canLogFor.subjectProfileId, profileIds),
            ),
          )
      : Promise.resolve([]),
    db.select().from(pushOptIns).where(eq(pushOptIns.userId, userId)),
  ])

  const exportEntries = entriesPerProfile.flat().map(exportEntryFromView)

  return {
    exportedAt: new Date().toISOString(),
    profiles: managedProfiles.map(exportProfile),
    goals: exportGoals.map((goal) => ({
      profileId: goal.profileId,
      direction: goal.direction,
      targetWeightKg: goal.targetWeightKg,
      bandKg: goal.bandKg,
      baselineWeightKg: goal.baselineWeightKg,
      baselineAt: goal.baselineAt.toISOString(),
      active: goal.active,
    })),
    entries: exportEntries,
    memberships: memberships.map((membership) => ({
      ...membership,
      joinedAt: membership.joinedAt.toISOString(),
    })),
    permissions: permissions.map((permission) => ({
      groupId: permission.groupId,
      subjectProfileId: permission.subjectProfileId,
      loggerProfileId: permission.loggerProfileId,
      source: permission.source,
    })),
    pushOptIns: pushOptInRows.map((optIn) => ({
      groupId: optIn.groupId,
      enabled: optIn.enabled,
      updatedAt: optIn.updatedAt.toISOString(),
    })),
  }
}

function exportProfile(profile: Profile): ExportedProfile {
  return {
    id: profile.id,
    displayName: profile.displayName,
    unit: profile.unit,
    avatarEmoji: profile.avatarEmoji,
    isDependent: profile.isDependent,
    bmiEnabled: profile.bmiEnabled,
    heightCm: profile.heightCm,
  }
}

function exportEntryFromView(view: {
  readonly id: string
  readonly profileId: string
  readonly weightKg: number | null
  readonly measuredAt: Date
  readonly recordedAt: Date
  readonly editedAt: Date | null
  readonly recordedByName: string
  readonly recordedByIsLegacy: boolean
  readonly note: string | null
}): ExportedEntry {
  return {
    id: view.id,
    profileId: view.profileId,
    weightKg: view.weightKg,
    measuredAt: view.measuredAt.toISOString(),
    recordedAt: view.recordedAt.toISOString(),
    editedAt: view.editedAt ? view.editedAt.toISOString() : null,
    recordedByName: view.recordedByName,
    recordedByIsLegacy: view.recordedByIsLegacy,
    note: view.note,
  }
}
