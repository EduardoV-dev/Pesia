import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db, type DatabaseTransaction } from "@/db/client"
import { canLogFor as canLogForRows, groupMemberships } from "@/db/schema"
import { isRecorderRole } from "@/features/groups/roles"

export type CanLogForParams = {
  readonly groupId: string
  readonly subjectProfileId: string
  readonly loggerProfileId: string
}

/**
 * The write check. It reads the log permission table and nothing else, so a viewer
 * who may record a weight never gains the right to read that subject's history.
 */
export async function canLogFor({
  groupId,
  subjectProfileId,
  loggerProfileId,
}: CanLogForParams): Promise<boolean> {
  const [grant] = await db
    .select({ groupId: canLogForRows.groupId })
    .from(canLogForRows)
    .where(
      and(
        eq(canLogForRows.groupId, groupId),
        eq(canLogForRows.subjectProfileId, subjectProfileId),
        eq(canLogForRows.loggerProfileId, loggerProfileId),
      ),
    )
    .limit(1)

  return Boolean(grant)
}

/** The subjects a logger may record for in a group, for the weigh-in selector. */
export async function listLoggableSubjectIds(groupId: string, loggerProfileId: string): Promise<string[]> {
  const rows = await db
    .select({ subjectProfileId: canLogForRows.subjectProfileId })
    .from(canLogForRows)
    .where(
      and(
        eq(canLogForRows.groupId, groupId),
        eq(canLogForRows.loggerProfileId, loggerProfileId),
      ),
    )

  return rows.map((row) => row.subjectProfileId)
}

/**
 * Rebuilds the role preset rows of a group from its active memberships.
 *
 * A `"role"` row exists if and only if the roles say it should: every active member
 * may record their own weight, and every active Logger and Owner may record anybody's.
 * Explicit grants are never touched here, so a member's consent survives a role
 * change.
 */
export async function rebuildRolePermissions(
  transaction: DatabaseTransaction,
  groupId: string,
  grantedByUserId: string,
): Promise<void> {
  const members = await transaction
    .select({ profileId: groupMemberships.profileId, role: groupMemberships.role })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftAt)))

  await transaction
    .delete(canLogForRows)
    .where(and(eq(canLogForRows.groupId, groupId), eq(canLogForRows.source, "role")))

  const rows = members.flatMap((member) => {
    const selfRow = {
      groupId,
      subjectProfileId: member.profileId,
      loggerProfileId: member.profileId,
      grantedByUserId,
      source: "role" as const,
    }

    if (!isRecorderRole(member.role)) {
      return [selfRow]
    }

    return [
      selfRow,
      ...members.map((subject) => ({
        groupId,
        subjectProfileId: subject.profileId,
        loggerProfileId: member.profileId,
        grantedByUserId,
        source: "role" as const,
      })),
    ]
  })

  if (rows.length === 0) {
    return
  }

  await transaction.insert(canLogForRows).values(rows).onConflictDoNothing()
}
