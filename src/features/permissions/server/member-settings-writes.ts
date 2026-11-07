import "server-only"

import { z } from "zod"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships } from "@/db/schema"
import { getCadenceDays, type CadenceKey } from "@/features/groups/cadence"
import { GROUP_VISIBILITIES } from "@/features/groups/visibility"
import { type GroupWriteCode, type GroupWriteResult } from "@/features/groups/server/write-result"
import { getProfileForManager } from "@/features/profiles/server/profile-access"

const visibilitySchema = z.enum(GROUP_VISIBILITIES, { error: "Elegí qué ve el grupo." })
const cadenceSchema = z.enum(["weekly", "biweekly", "monthly", "none"], { error: "Elegí cada cuánto." })

export type UpdateMemberSettingsParams = {
  readonly groupId: string
  readonly profileId: string
}

/**
 * Sets what the group sees of the member. The choice applies to every read the
 * group makes of that member.
 */
export async function setVisibility(
  userId: string,
  params: UpdateMemberSettingsParams,
  visibility: string,
): Promise<GroupWriteResult> {
  const membership = await getOwnMembership(userId, params)

  if (!membership.ok) {
    return membership
  }

  const parsedVisibility = visibilitySchema.safeParse(visibility)

  if (!parsedVisibility.success) {
    return { ok: false, code: "invalid_input", errorMessage: "Elegí qué ve el grupo." }
  }

  await db
    .update(groupMemberships)
    .set({ visibility: parsedVisibility.data })
    .where(eq(groupMemberships.id, membership.membershipId))

  return { ok: true }
}

/** Keeps the member in the group and on the weigh-in sheet, out of the ranking. */
export async function setRankingOptOut(
  userId: string,
  params: UpdateMemberSettingsParams,
  rankingOptOut: boolean,
): Promise<GroupWriteResult> {
  const membership = await getOwnMembership(userId, params)

  if (!membership.ok) {
    return membership
  }

  if (membership.isDependent) {
    return {
      ok: false,
      code: "dependent_profile",
      errorMessage: "Una persona a cargo nunca entra en el ranking.",
    }
  }

  await db
    .update(groupMemberships)
    .set({ rankingOptOut })
    .where(eq(groupMemberships.id, membership.membershipId))

  return { ok: true }
}

/** Sets how often the member wants to be asked. It never changes a permission. */
export async function setCadence(
  userId: string,
  params: UpdateMemberSettingsParams,
  cadenceKey: string,
): Promise<GroupWriteResult> {
  const membership = await getOwnMembership(userId, params)

  if (!membership.ok) {
    return membership
  }

  const parsedCadence = cadenceSchema.safeParse(cadenceKey)

  if (!parsedCadence.success) {
    return { ok: false, code: "invalid_input", errorMessage: "Elegí cada cuánto te pesamos." }
  }

  await db
    .update(groupMemberships)
    .set({ cadenceDays: getCadenceDays(parsedCadence.data as CadenceKey) })
    .where(eq(groupMemberships.id, membership.membershipId))

  return { ok: true }
}

type OwnMembership = {
  readonly ok: true
  readonly membershipId: string
  readonly isDependent: boolean
} | {
  readonly ok: false
  readonly code: GroupWriteCode
  readonly errorMessage: string
}

async function getOwnMembership(
  userId: string,
  params: UpdateMemberSettingsParams,
): Promise<OwnMembership> {
  const managedProfile = await getProfileForManager(userId, params.profileId)

  if (!managedProfile) {
    return {
      ok: false,
      code: "not_a_member",
      errorMessage: "Ese perfil no lo manejás.",
    }
  }

  const [membership] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, params.groupId),
        eq(groupMemberships.profileId, params.profileId),
        isNull(groupMemberships.leftAt),
      ),
    )
    .limit(1)

  if (!membership) {
    return { ok: false, code: "not_a_member", errorMessage: "No estás en este grupo." }
  }

  return { ok: true, membershipId: membership.id, isDependent: managedProfile.isDependent }
}
