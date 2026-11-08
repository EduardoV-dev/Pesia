import "server-only"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/db/client"
import { pushSubscriptions } from "@/db/schema"
import { type GroupWriteResult } from "@/features/groups/server/write-result"
import { userControlsActiveMemberProfile } from "./member-access"

const NOT_A_MEMBER_MESSAGE = "No sos parte de este grupo."

/** The browser `PushSubscription.toJSON()` shape this endpoint pair accepts. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export type PushSubscriptionPayload = z.infer<typeof pushSubscriptionSchema>

export type RegisterReminderPushParams = {
  readonly userId: string
  readonly groupId: string
  readonly subscription: PushSubscriptionPayload
}

export type UnsubscribeReminderPushParams = {
  readonly userId: string
  readonly endpoint: string
}

/**
 * Stores one subscription row per device endpoint, always for an active group
 * member's login. A user may register several devices; delivery reads them all.
 */
export async function registerReminderPush(
  params: RegisterReminderPushParams,
): Promise<GroupWriteResult> {
  const isMember = await userControlsActiveMemberProfile(params.userId, params.groupId)

  if (!isMember) {
    return { ok: false, code: "not_a_member", errorMessage: NOT_A_MEMBER_MESSAGE }
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: params.userId,
      groupId: params.groupId,
      endpoint: params.subscription.endpoint,
      p256dh: params.subscription.keys.p256dh,
      auth: params.subscription.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: params.userId,
        groupId: params.groupId,
        p256dh: params.subscription.keys.p256dh,
        auth: params.subscription.keys.auth,
      },
    })

  return { ok: true }
}

/**
 * Removes only the caller's own rows: another login passing the same endpoint
 * found nothing to delete and the store stays intact.
 */
export async function removeReminderPush(params: UnsubscribeReminderPushParams): Promise<boolean> {
  const deleted = await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, params.endpoint),
        eq(pushSubscriptions.userId, params.userId),
      ),
    )
    .returning({ id: pushSubscriptions.id })

  return deleted.length > 0
}
