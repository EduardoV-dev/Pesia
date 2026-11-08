import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { pushSubscriptions } from "@/db/schema"
import {
  createTestGroup,
  createTestProfile,
  createTestUser,
  deleteTestGroup,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

import { registerReminderPush, removeReminderPush } from "./subscription-endpoints"

const createdUsers: TestUser[] = []
const createdGroups: string[] = []

const ENDPOINT = "https://push.example.test/endpoint-1"
const KEYS = { p256dh: "key-p256dh", auth: "key-auth" }

afterEach(async () => {
  await Promise.all(createdGroups.splice(0).map((groupId) => deleteTestGroup(groupId)))
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

async function givenMember(): Promise<{ testUser: TestUser; groupId: string }> {
  const testUser = await createTestUser()
  createdUsers.push(testUser)

  const ownerProfile = await createTestProfile(testUser)
  const groupId = await createTestGroup(testUser, ownerProfile)
  createdGroups.push(groupId)

  return { testUser, groupId }
}

function subscriptionFor(endpoint: string) {
  return { endpoint, keys: KEYS }
}

describe("registerReminderPush", () => {
  it("stores one subscription row per endpoint for a member", async () => {
    const { testUser, groupId } = await givenMember()

    const result = await registerReminderPush({
      userId: testUser.id,
      groupId,
      subscription: subscriptionFor(ENDPOINT),
    })

    expect(result).toEqual({ ok: true })

    const rows = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, testUser.id))

    expect(rows).toHaveLength(1)
    expect(rows[0]?.endpoint).toBe(ENDPOINT)
    expect(rows[0]?.p256dh).toBe("key-p256dh")
  })

  it("re-registering the same endpoint updates it instead of duplicating", async () => {
    const { testUser, groupId } = await givenMember()

    await registerReminderPush({
      userId: testUser.id,
      groupId,
      subscription: subscriptionFor(ENDPOINT),
    })
    await registerReminderPush({
      userId: testUser.id,
      groupId,
      subscription: { endpoint: ENDPOINT, keys: { p256dh: "rotated", auth: "auth-rotated" } },
    })

    const rows = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, testUser.id))

    expect(rows).toHaveLength(1)
    expect(rows[0]?.p256dh).toBe("rotated")
  })

  it("refuses a login with no active membership in the group", async () => {
    const { groupId } = await givenMember()
    const outsider = await createTestUser()
    createdUsers.push(outsider)

    const result = await registerReminderPush({
      userId: outsider.id,
      groupId,
      subscription: subscriptionFor(ENDPOINT),
    })

    expect(result).toMatchObject({ ok: false, code: "not_a_member" })

    const rows = await db.select().from(pushSubscriptions)

    expect(rows).toHaveLength(0)
  })
})

describe("removeReminderPush", () => {
  it("removes the caller's own row", async () => {
    const { testUser, groupId } = await givenMember()

    await registerReminderPush({
      userId: testUser.id,
      groupId,
      subscription: subscriptionFor(ENDPOINT),
    })

    expect(await removeReminderPush({ userId: testUser.id, endpoint: ENDPOINT })).toBe(true)

    const rows = await db.select().from(pushSubscriptions)

    expect(rows).toHaveLength(0)
  })

  it("never removes another owner's row", async () => {
    const { testUser: realOwner, groupId } = await givenMember()
    await registerReminderPush({
      userId: realOwner.id,
      groupId,
      subscription: subscriptionFor(ENDPOINT),
    })

    const otherUser = await createTestUser()
    createdUsers.push(otherUser)

    expect(await removeReminderPush({ userId: otherUser.id, endpoint: ENDPOINT })).toBe(false)

    const rows = await db.select().from(pushSubscriptions)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe(realOwner.id)
  })
})
