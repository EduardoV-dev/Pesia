import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { pushOptIns } from "@/db/schema"
import { type GroupWriteResult } from "@/features/groups/server/write-result"
import { userControlsActiveMemberProfile } from "./member-access"

export type ReminderOptInParams = {
  readonly groupId: string
}

const NOT_A_MEMBER_MESSAGE = "No sos parte de este grupo."

/**
 * The server truth for the reminder consent: one row per user per group, kept
 * even when the user has no subscription yet — the email fallback needs to
 * know who opted in (G7: nothing is ever sent without this row enabled).
 */
export async function setReminderOptIn(
  userId: string,
  params: ReminderOptInParams,
  enabled: boolean,
): Promise<GroupWriteResult> {
  const isMember = await userControlsActiveMemberProfile(userId, params.groupId)

  if (!isMember) {
    return { ok: false, code: "not_a_member", errorMessage: NOT_A_MEMBER_MESSAGE }
  }

  await db
    .insert(pushOptIns)
    .values({ userId, groupId: params.groupId, enabled })
    .onConflictDoUpdate({
      target: [pushOptIns.userId, pushOptIns.groupId],
      set: { enabled, updatedAt: new Date() },
    })

  return { ok: true }
}

export async function getReminderOptIn(userId: string, groupId: string): Promise<boolean> {
  const [row] = await db
    .select({ enabled: pushOptIns.enabled })
    .from(pushOptIns)
    .where(and(eq(pushOptIns.userId, userId), eq(pushOptIns.groupId, groupId)))
    .limit(1)

  return row?.enabled ?? false
}
