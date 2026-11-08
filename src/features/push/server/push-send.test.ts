import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { eq } from "drizzle-orm"

const sendNotification = vi.fn()
const setVapidDetails = vi.fn()

vi.mock("web-push", () => ({
  sendNotification: (...args: unknown[]) => sendNotification(...args),
  setVapidDetails: (...args: unknown[]) => setVapidDetails(...args),
}))

import { db } from "@/db/client"
import { pushSubscriptions } from "@/db/schema"
import type { ReminderCopy } from "@/features/reminders/copy"
import {
  createTestGroup,
  createTestProfile,
  createTestUser,
  deleteTestGroup,
  deleteTestUser,
  type TestUser,
} from "@/test/database"
import { sendReminderPush } from "./push-send"

const copy: ReminderCopy = {
  title: "Tu turno de pesada",
  body: "Es tu turno de pesada. Abrí la app para registrarla.",
  emailSubject: "Tu turno de pesada",
  emailBody: "Es tu turno de pesada. Abrí la app para registrarla.",
}

const ENDPOINT = "https://push.example.test/reap-test"

let seededGroupId: string | null = null
let seededUser: TestUser | null = null

beforeAll(() => {
  vi.stubEnv("VAPID_PUBLIC_KEY", "public-key")
  vi.stubEnv("VAPID_PRIVATE_KEY", "private-key")
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.test")
})

beforeEach(async () => {
  sendNotification.mockReset()
  vi.stubEnv("VAPID_PUBLIC_KEY", "public-key")

  seededUser = await createTestUser()
  const ownerProfile = await createTestProfile(seededUser)
  seededGroupId = await createTestGroup(seededUser, ownerProfile)

  await db.insert(pushSubscriptions).values({
    userId: seededUser.id,
    groupId: seededGroupId,
    endpoint: ENDPOINT,
    p256dh: "key",
    auth: "auth",
  })
})

afterEach(async () => {
  if (seededGroupId) {
    await deleteTestGroup(seededGroupId)
    seededGroupId = null
  }

  if (seededUser) {
    await deleteTestUser(seededUser)
    seededUser = null
  }
})

const TARGET = {
  endpoint: ENDPOINT,
  p256dh: "key",
  auth: "auth",
}

async function reapedRowExists(): Promise<boolean> {
  const rows = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, TARGET.endpoint))

  return rows.length > 0
}

describe("sendReminderPush", () => {
  it("sends and keeps a working subscription", async () => {
    sendNotification.mockResolvedValue(undefined)

    expect(await sendReminderPush(TARGET, copy)).toBe("sent")
    expect(await reapedRowExists()).toBe(true)
  })

  it("reaps the row when the endpoint is gone (410/404)", async () => {
    sendNotification.mockRejectedValue({ statusCode: 410 })

    expect(await sendReminderPush(TARGET, copy)).toBe("gone")
    expect(await reapedRowExists()).toBe(false)
  })

  it("counts a different failure without reaping", async () => {
    sendNotification.mockRejectedValue({ statusCode: 500 })

    expect(await sendReminderPush(TARGET, copy)).toBe("failed")
    expect(await reapedRowExists()).toBe(true)
  })

  it("fails fast without VAPID config", async () => {
    sendNotification.mockResolvedValue(undefined)
    vi.stubEnv("VAPID_PUBLIC_KEY", "")

    expect(await sendReminderPush(TARGET, copy)).toBe("failed")
    expect(await reapedRowExists()).toBe(true)
    expect(sendNotification).not.toHaveBeenCalled()
  })
})
