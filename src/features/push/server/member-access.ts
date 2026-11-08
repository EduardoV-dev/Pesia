import "server-only"

import { and, eq, isNull, or } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, profileManagers, profiles } from "@/db/schema"

/**
 * True when any profile the login controls (their own or a managed one) is an
 * active member of the group. Write eligibility is user-level: the reminder
 * toggle and the subscription registration both gate on this, while read
 * eligibility stays per-profile in the board (G10).
 */
export async function userControlsActiveMemberProfile(
  userId: string,
  groupId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ profileId: groupMemberships.profileId })
    .from(groupMemberships)
    .innerJoin(profiles, eq(groupMemberships.profileId, profiles.id))
    .leftJoin(profileManagers, eq(profileManagers.profileId, profiles.id))
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        isNull(groupMemberships.leftAt),
        or(eq(profiles.userId, userId), eq(profileManagers.userId, userId)),
      ),
    )
    .limit(1)

  return Boolean(row)
}
