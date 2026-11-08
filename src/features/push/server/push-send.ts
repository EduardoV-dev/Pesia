import "server-only"

import { eq } from "drizzle-orm"
import { sendNotification, setVapidDetails } from "web-push"

import { db } from "@/db/client"
import { pushSubscriptions } from "@/db/schema"
import type { ReminderCopy } from "@/features/reminders/copy"

export type PushSubscriptionTarget = {
  readonly endpoint: string
  readonly p256dh: string
  readonly auth: string
}

export type PushSendOutcome = "sent" | "gone" | "failed"
/** The VAPID config is read at send time, never frozen into a build. */
function configureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    return false
  }

  setVapidDetails(subject, publicKey, privateKey)

  return true
}

/**
 * Sends one reminder push. A `404`/`410` answer means the endpoint no longer
 * exists: the row is reaped and the outcome is "gone" — the caller treats that
 * recipient as having no live subscription.
 */
export async function sendReminderPush(
  subscription: PushSubscriptionTarget,
  copy: ReminderCopy,
): Promise<PushSendOutcome> {
  if (!configureVapid()) {
    return "failed"
  }

  try {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(copy),
    )
  } catch (error) {
    if (goneStatus(error)) {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))

      return "gone"
    }

    console.error(
      `push send failed for ${subscription.endpoint.split("/").pop() ?? "endpoint"}:`,
      error instanceof Error ? error.message : String(error),
    )

    return "failed"
  }

  return "sent"
}

function goneStatus(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  const status = (error as { statusCode?: unknown }).statusCode

  return status === 404 || status === 410
}
