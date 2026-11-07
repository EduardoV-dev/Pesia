import "server-only"

import { and, asc, count, eq, isNull } from "drizzle-orm"

import { db } from "@/db/client"
import {
  groupMemberships,
  groups,
  groupSettings,
  profiles,
  type Group,
  type GroupMembership,
  type GroupSetting,
  type Profile,
} from "@/db/schema"
import { type GroupRole } from "@/features/groups/roles"

export type GroupMember = {
  readonly membership: GroupMembership
  readonly profile: Profile
}

/** Every group the profile is an active member of. There is no other way in. */
export async function getGroupsForProfile(profileId: string): Promise<Group[]> {
  const rows = await db
    .select({ group: groups })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(and(eq(groupMemberships.profileId, profileId), isNull(groupMemberships.leftAt)))
    .orderBy(asc(groups.createdAt))

  return rows.map((row) => row.group)
}

export type GroupSummary = {
  readonly group: Group
  readonly role: GroupRole
  readonly memberCount: number
}

/** The groups the profile belongs to, with its role in each and the group's size. */
export async function getGroupSummaries(profileId: string): Promise<GroupSummary[]> {
  const rows = await db
    .select({ group: groups, role: groupMemberships.role })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(and(eq(groupMemberships.profileId, profileId), isNull(groupMemberships.leftAt)))
    .orderBy(asc(groups.createdAt))

  const counts = await db
    .select({ groupId: groupMemberships.groupId, total: count() })
    .from(groupMemberships)
    .where(isNull(groupMemberships.leftAt))
    .groupBy(groupMemberships.groupId)

  const countByGroup = new Map(counts.map((row) => [row.groupId, row.total]))

  return rows.map((row) => ({
    group: row.group,
    role: row.role,
    memberCount: countByGroup.get(row.group.id) ?? 0,
  }))
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1)

  return group ?? null
}

export async function getMembership(
  groupId: string,
  profileId: string,
): Promise<GroupMembership | null> {
  const [membership] = await db
    .select()
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.profileId, profileId),
        isNull(groupMemberships.leftAt),
      ),
    )
    .limit(1)

  return membership ?? null
}

export async function getOwnerMembership(
  groupId: string,
  profileId: string,
): Promise<GroupMembership | null> {
  const membership = await getMembership(groupId, profileId)

  return membership?.role === "owner" ? membership : null
}

export async function getGroupMember(
  groupId: string,
  profileId: string,
): Promise<GroupMember | null> {
  const [row] = await db
    .select({ membership: groupMemberships, profile: profiles })
    .from(groupMemberships)
    .innerJoin(profiles, eq(groupMemberships.profileId, profiles.id))
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.profileId, profileId),
        isNull(groupMemberships.leftAt),
      ),
    )
    .limit(1)

  return row ?? null
}

export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
  const rows = await db
    .select({ membership: groupMemberships, profile: profiles })
    .from(groupMemberships)
    .innerJoin(profiles, eq(groupMemberships.profileId, profiles.id))
    .where(and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftAt)))
    .orderBy(asc(groupMemberships.joinedAt))

  return rows.map((row) => ({ membership: row.membership, profile: row.profile }))
}

export async function getGroupSettings(groupId: string): Promise<GroupSetting | null> {
  const [settings] = await db
    .select()
    .from(groupSettings)
    .where(eq(groupSettings.groupId, groupId))
    .limit(1)

  return settings ?? null
}
