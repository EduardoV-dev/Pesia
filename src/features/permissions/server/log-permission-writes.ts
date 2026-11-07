import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { canLogFor as canLogForRows, type CanLogFor } from "@/db/schema"
import { getGroupMember } from "@/features/groups/server/group-access"
import { type GroupWriteCode } from "@/features/groups/server/write-result"
import { getProfileForManager } from "@/features/profiles/server/profile-access"

export type LogPermissionWriteResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: GroupWriteCode
      readonly errorMessage: string
    }

export type GrantLogPermissionParams = {
  readonly groupId: string
  readonly loggerProfileId: string
}

/**
 * Grants one member permission to record the subject's weight in one group. The
 * grant is scoped to that group and never reaches another one.
 */
export async function grantLogPermission(
  userId: string,
  subjectProfileId: string,
  { groupId, loggerProfileId }: GrantLogPermissionParams,
): Promise<LogPermissionWriteResult> {
  const subject = await getGroupMember(groupId, subjectProfileId)

  if (!subject) {
    return { ok: false, code: "not_a_member", errorMessage: "No estás en este grupo." }
  }

  const managedSubject = await getProfileForManager(userId, subjectProfileId)

  if (!managedSubject) {
    return {
      ok: false,
      code: "not_a_member",
      errorMessage: "Ese perfil no lo manejás.",
    }
  }

  const logger = await getGroupMember(groupId, loggerProfileId)

  if (!logger) {
    return {
      ok: false,
      code: "not_a_member",
      errorMessage: "Esa persona no está en el grupo.",
    }
  }

  if (logger.membership.profileId === subjectProfileId) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: "Ya podés anotar tu propio peso.",
    }
  }

  await db
    .delete(canLogForRows)
    .where(
      and(
        eq(canLogForRows.groupId, groupId),
        eq(canLogForRows.subjectProfileId, subjectProfileId),
        eq(canLogForRows.loggerProfileId, loggerProfileId),
        eq(canLogForRows.source, "role"),
      ),
    )

  await db
    .insert(canLogForRows)
    .values({
      groupId,
      subjectProfileId,
      loggerProfileId,
      grantedByUserId: userId,
      source: "explicit",
    })
    .onConflictDoNothing()

  return { ok: true }
}

/**
 * Revokes an explicit grant. When the person still holds it because of their role,
 * the revocation is refused: the role is what grants it, and only a role change
 * takes it away.
 */
export async function revokeLogPermission(
  userId: string,
  subjectProfileId: string,
  { groupId, loggerProfileId }: GrantLogPermissionParams,
): Promise<LogPermissionWriteResult> {
  const subject = await getGroupMember(groupId, subjectProfileId)

  if (!subject) {
    return { ok: false, code: "not_a_member", errorMessage: "No estás en este grupo." }
  }

  const managedSubject = await getProfileForManager(userId, subjectProfileId)

  if (!managedSubject) {
    return {
      ok: false,
      code: "not_a_member",
      errorMessage: "Ese perfil no lo manejás.",
    }
  }

  await db
    .delete(canLogForRows)
    .where(
      and(
        eq(canLogForRows.groupId, groupId),
        eq(canLogForRows.subjectProfileId, subjectProfileId),
        eq(canLogForRows.loggerProfileId, loggerProfileId),
        eq(canLogForRows.source, "explicit"),
      ),
    )

  const [remaining] = await db
    .select({ source: canLogForRows.source })
    .from(canLogForRows)
    .where(
      and(
        eq(canLogForRows.groupId, groupId),
        eq(canLogForRows.subjectProfileId, subjectProfileId),
        eq(canLogForRows.loggerProfileId, loggerProfileId),
      ),
    )
    .limit(1)

  if (remaining) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage:
        "Esa persona anota para todo el grupo por su rol. Pedile a la propiedad que cambie el rol.",
    }
  }

  return { ok: true }
}

/** Everybody who may record the subject's weight in this group. */
export async function listLogPermissionHolders(
  groupId: string,
  subjectProfileId: string,
): Promise<CanLogFor[]> {
  return db
    .select()
    .from(canLogForRows)
    .where(
      and(
        eq(canLogForRows.groupId, groupId),
        eq(canLogForRows.subjectProfileId, subjectProfileId),
      ),
    )
}
