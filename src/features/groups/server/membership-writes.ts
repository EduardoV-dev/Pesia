import "server-only"

import { z } from "zod"

import { and, eq, isNull, or } from "drizzle-orm"

import { db, type DatabaseTransaction } from "@/db/client"
import { canLogFor as canLogForRows, groupMemberships } from "@/db/schema"
import { GROUP_ROLES } from "@/features/groups/roles"
import {
  getGroupMember,
  getMembership,
  getOwnerMembership,
  listGroupMembers,
} from "@/features/groups/server/group-access"
import { type GroupWriteResult } from "@/features/groups/server/write-result"
import { rebuildRolePermissions } from "@/features/permissions/server/log-permissions"

const roleInputSchema = z.enum(GROUP_ROLES, { error: "Elegí un rol." })

export type ChangeMemberRoleInput = {
  readonly role: string
}

/**
 * Moves a member between roles. Only an Owner may do it, and the group always keeps
 * at least one Owner.
 */
export async function changeMemberRole(
  userId: string,
  actorProfileId: string,
  groupId: string,
  targetProfileId: string,
  input: ChangeMemberRoleInput,
): Promise<GroupWriteResult> {
  const ownerMembership = await getOwnerMembership(groupId, actorProfileId)

  if (!ownerMembership) {
    return {
      ok: false,
      code: "not_an_owner",
      errorMessage: "Solo la propiedad del grupo puede cambiar los roles.",
    }
  }

  const target = await getGroupMember(groupId, targetProfileId)

  if (!target) {
    return { ok: false, code: "not_a_member", errorMessage: "Esa persona no está en el grupo." }
  }

  const parsedInput = roleInputSchema.safeParse(input.role)

  if (!parsedInput.success) {
    return { ok: false, code: "invalid_input", errorMessage: "Elegí un rol." }
  }

  const nextRole = parsedInput.data

  if (target.profile.isDependent && nextRole !== "member") {
    return {
      ok: false,
      code: "dependent_profile",
      errorMessage: "Una persona a cargo no puede administrar ni anotar por otras.",
    }
  }

  if (target.membership.role === "owner" && nextRole !== "owner") {
    const owners = await countOwners(groupId)

    if (owners <= 1) {
      return {
        ok: false,
        code: "last_owner",
        errorMessage: "El grupo siempre necesita una propiedad. Transferí la propiedad primero.",
      }
    }
  }

  await db.transaction(async (transaction) => {
    await transaction
      .update(groupMemberships)
      .set({ role: nextRole })
      .where(eq(groupMemberships.id, target.membership.id))

    await rebuildRolePermissions(transaction, groupId, userId)
  })

  return { ok: true }
}

/**
 * Hands the Owner role to another member of the group. The previous Owner steps
 * down to Member, so the group never loses its Owner.
 */
export async function transferOwnership(
  userId: string,
  actorProfileId: string,
  groupId: string,
  newOwnerProfileId: string,
): Promise<GroupWriteResult> {
  const ownerMembership = await getOwnerMembership(groupId, actorProfileId)

  if (!ownerMembership) {
    return {
      ok: false,
      code: "not_an_owner",
      errorMessage: "Solo la propiedad del grupo puede transferir la propiedad.",
    }
  }

  const target = await getGroupMember(groupId, newOwnerProfileId)

  if (!target) {
    return { ok: false, code: "not_a_member", errorMessage: "Esa persona no está en el grupo." }
  }

  if (target.membership.role === "owner") {
    return { ok: false, code: "invalid_input", errorMessage: "Esa persona ya es la propiedad." }
  }

  await db.transaction(async (transaction) => {
    await transaction
      .update(groupMemberships)
      .set({ role: "owner" })
      .where(eq(groupMemberships.id, target.membership.id))

    await transaction
      .update(groupMemberships)
      .set({ role: "member" })
      .where(eq(groupMemberships.id, ownerMembership.id))

    await rebuildRolePermissions(transaction, groupId, userId)
  })

  return { ok: true }
}

/**
 * Closes somebody's membership. Their past entries stay in the group's history:
 * other people weighed them and saw those numbers.
 */
export async function removeMember(
  userId: string,
  actorProfileId: string,
  groupId: string,
  targetProfileId: string,
): Promise<GroupWriteResult> {
  const ownerMembership = await getOwnerMembership(groupId, actorProfileId)

  if (!ownerMembership) {
    return {
      ok: false,
      code: "not_an_owner",
      errorMessage: "Solo la propiedad del grupo puede sacar a alguien.",
    }
  }

  const target = await getGroupMember(groupId, targetProfileId)

  if (!target) {
    return { ok: false, code: "not_a_member", errorMessage: "Esa persona no está en el grupo." }
  }

  if (target.membership.role === "owner") {
    return {
      ok: false,
      code: "owner_must_transfer",
      errorMessage: "Transferí la propiedad antes de sacar a esta persona.",
    }
  }

  await closeMembership(groupId, target.membership.profileId, userId)

  return { ok: true }
}

/** Closes the caller's own membership. Their past entries stay in the group. */
export async function leaveGroup(
  userId: string,
  profileId: string,
  groupId: string,
): Promise<GroupWriteResult> {
  const membership = await getMembership(groupId, profileId)

  if (!membership) {
    return { ok: false, code: "not_a_member", errorMessage: "No estás en este grupo." }
  }

  if (membership.role === "owner") {
    return {
      ok: false,
      code: "owner_must_transfer",
      errorMessage: "Transferí la propiedad antes de salir del grupo.",
    }
  }

  await closeMembership(groupId, profileId, userId)

  return { ok: true }
}

/**
 * Adds a profile to a group as a Member. A profile that is already an active member
 * keeps everything it had, and a profile that left before reuses its closed
 * membership and keeps the visibility it chose for itself.
 */
export async function addMemberToGroup(
  transaction: DatabaseTransaction,
  groupId: string,
  profileId: string,
): Promise<void> {
  const [existing] = await transaction
    .select()
    .from(groupMemberships)
    .where(
      and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, profileId)),
    )
    .limit(1)

  if (existing) {
    if (existing.leftAt === null) {
      return
    }

    await transaction
      .update(groupMemberships)
      .set({ role: "member", leftAt: null, joinedAt: new Date() })
      .where(eq(groupMemberships.id, existing.id))

    return
  }

  await transaction.insert(groupMemberships).values({ groupId, profileId, role: "member" })
}

async function closeMembership(
  groupId: string,
  profileId: string,
  userId: string,
): Promise<void> {
  await db.transaction(async (transaction) => {
    await transaction
      .update(groupMemberships)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.profileId, profileId),
          isNull(groupMemberships.leftAt),
        ),
      )

    await transaction
      .delete(canLogForRows)
      .where(
        and(
          eq(canLogForRows.groupId, groupId),
          or(
            eq(canLogForRows.subjectProfileId, profileId),
            eq(canLogForRows.loggerProfileId, profileId),
          ),
        ),
      )

    await rebuildRolePermissions(transaction, groupId, userId)
  })
}

async function countOwners(groupId: string): Promise<number> {
  const members = await listGroupMembers(groupId)

  return members.filter((member) => member.membership.role === "owner").length
}
