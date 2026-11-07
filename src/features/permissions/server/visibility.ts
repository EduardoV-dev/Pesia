import "server-only"

import { and, asc, eq, isNull } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, profiles } from "@/db/schema"
import { type GroupRole } from "@/features/groups/roles"
import { resolveVisibilityGrant, type GroupVisibility } from "@/features/groups/visibility"

export const PRIVATE_MEMBER_LABEL = "Privado"

export type GroupMemberView = {
  readonly profileId: string
  readonly displayName: string
  readonly avatarEmoji: string | null
  readonly role: GroupRole
  readonly isPrivate: boolean
  readonly isDependent: boolean
  readonly canViewWeight: boolean
  readonly canViewTrend: boolean
  readonly rankingOptOut: boolean
}

export type ResolveVisibleMembersParams = {
  readonly groupId: string
  readonly viewerProfileId: string
}

/**
 * The read check, and the only function that assembles what a viewer may see of a
 * group's members. It applies each member's own visibility to every other member
 * and never widens a level because the viewer may record that member's weight.
 */
export async function resolveVisibleMembers({
  groupId,
  viewerProfileId,
}: ResolveVisibleMembersParams): Promise<GroupMemberView[]> {
  const rows = await db
    .select({ membership: groupMemberships, profile: profiles })
    .from(groupMemberships)
    .innerJoin(profiles, eq(groupMemberships.profileId, profiles.id))
    .where(and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftAt)))
    .orderBy(asc(groupMemberships.joinedAt))

  return rows.map((row) =>
    resolveMemberView({
      profileId: row.profile.id,
      displayName: row.profile.displayName,
      avatarEmoji: row.profile.avatarEmoji,
      role: row.membership.role,
      visibility: row.membership.visibility,
      rankingOptOut: row.membership.rankingOptOut,
      isDependent: row.profile.isDependent,
      isSelf: row.profile.id === viewerProfileId,
    }),
  )
}

type ResolveMemberViewParams = {
  readonly profileId: string
  readonly displayName: string
  readonly avatarEmoji: string | null
  readonly role: GroupRole
  readonly visibility: GroupVisibility
  readonly rankingOptOut: boolean
  readonly isDependent: boolean
  readonly isSelf: boolean
}

function resolveMemberView({
  profileId,
  displayName,
  avatarEmoji,
  role,
  visibility,
  rankingOptOut,
  isDependent,
  isSelf,
}: ResolveMemberViewParams): GroupMemberView {
  if (isSelf) {
    return {
      profileId,
      displayName,
      avatarEmoji,
      role,
      isPrivate: false,
      isDependent,
      canViewWeight: true,
      canViewTrend: true,
      rankingOptOut,
    }
  }

  const grant = resolveVisibilityGrant(visibility)

  if (!grant.showsName) {
    return {
      profileId,
      displayName: PRIVATE_MEMBER_LABEL,
      avatarEmoji: null,
      role,
      isPrivate: true,
      isDependent,
      canViewWeight: false,
      canViewTrend: false,
      rankingOptOut: false,
    }
  }

  return {
    profileId,
    displayName,
    avatarEmoji,
    role,
    isPrivate: false,
    isDependent,
    canViewWeight: grant.showsWeight,
    canViewTrend: grant.showsTrend,
    // A dependent is never ranked, so there is nothing to opt out of.
    rankingOptOut: isDependent ? false : rankingOptOut,
  }
}
