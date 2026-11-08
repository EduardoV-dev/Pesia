import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { pushOptIns } from "@/db/schema"
import {
  addTestGroupMember,
  createTestGroup,
  createTestProfile,
  createTestUser,
  deleteTestGroup,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

import { getReminderOptIn, setReminderOptIn } from "./opt-in-writes"

const createdUsers: TestUser[] = []
const createdGroups: string[] = []

afterEach(async () => {
  await Promise.all(createdGroups.splice(0).map((groupId) => deleteTestGroup(groupId)))
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

async function givenMemberWithOwnProfile(): Promise<{ testUser: TestUser; groupId: string }> {
  const testUser = await createTestUser()
  createdUsers.push(testUser)

  const ownerProfile = await createTestProfile(testUser)
  const groupId = await createTestGroup(testUser, ownerProfile)
  createdGroups.push(groupId)

  return { testUser, groupId }
}

describe("setReminderOptIn", () => {
  it("stores and flips the consent row for a group member", async () => {
    const { testUser, groupId } = await givenMemberWithOwnProfile()

    expect(await setReminderOptIn(testUser.id, { groupId }, true)).toEqual({ ok: true })
    expect(await getReminderOptIn(testUser.id, groupId)).toBe(true)

    expect(await setReminderOptIn(testUser.id, { groupId }, false)).toEqual({ ok: true })
    expect(await getReminderOptIn(testUser.id, groupId)).toBe(false)
  })

  it("keeps one row per user and group when toggled repeatedly", async () => {
    const { testUser, groupId } = await givenMemberWithOwnProfile()

    await setReminderOptIn(testUser.id, { groupId }, true)
    await setReminderOptIn(testUser.id, { groupId }, false)
    await setReminderOptIn(testUser.id, { groupId }, true)

    const rows = await db
      .select()
      .from(pushOptIns)
      .where(eq(pushOptIns.userId, testUser.id))

    expect(rows).toHaveLength(1)
    expect(rows[0]?.enabled).toBe(true)
  })

  it("refuses a login with no active membership in the group", async () => {
    const { groupId } = await givenMemberWithOwnProfile()
    const outsider = await createTestUser()
    createdUsers.push(outsider)

    const result = await setReminderOptIn(outsider.id, { groupId }, true)

    expect(result).toMatchObject({ ok: false, code: "not_a_member" })
    expect(await getReminderOptIn(outsider.id, groupId)).toBe(false)
  })

  it("accepts a member whose managed profile belongs to the group", async () => {
    const { createTestManagedProfile } = await import("@/test/database")
    const testUser = await createTestUser()
    createdUsers.push(testUser)

    const guardianProfile = await createTestProfile(testUser)
    const groupId = await createTestGroup(testUser, guardianProfile)
    createdGroups.push(groupId)
    const managedProfile = await createTestManagedProfile(testUser)
    await addTestGroupMember(groupId, managedProfile.id, "member")

    const result = await setReminderOptIn(testUser.id, { groupId }, true)

    expect(result).toEqual({ ok: true })
    expect(await getReminderOptIn(testUser.id, groupId)).toBe(true)
  })
})
