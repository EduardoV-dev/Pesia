import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { canLogFor as canLogForRows, groupMemberships, groups, groupSettings } from "@/db/schema"
import { createGroup, deleteGroup, updateGroupSettings } from "@/features/groups/server/group-writes"
import { getGroupsForProfile } from "@/features/groups/server/group-access"
import {
  createTestProfile,
  createTestUser,
  deleteTestGroup,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

const createdUsers: TestUser[] = []
const createdGroups: string[] = []

afterEach(async () => {
  await Promise.all(createdGroups.splice(0).map((groupId) => deleteTestGroup(groupId)))
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

describe("createGroup", () => {
  it("makes the creator the Owner of the new group", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    const result = await createGroup(testUser.id, profile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, result.groupId))

    expect(membership?.role).toBe("owner")
    expect(membership?.profileId).toBe(profile.id)
    expect(membership?.visibility).toBe("weight_trend")
  })

  it("gives the group its settings and its role permissions", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    const result = await createGroup(testUser.id, profile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")
    if (!result.ok) return

    const [settings] = await db
      .select()
      .from(groupSettings)
      .where(eq(groupSettings.groupId, result.groupId))
    const permissions = await db
      .select()
      .from(canLogForRows)
      .where(eq(canLogForRows.groupId, result.groupId))

    expect(settings?.weighInWeekday).toBe(0)
    expect(settings?.remindersEnabled).toBe(true)
    expect(permissions).toHaveLength(1)
  })

  it("refuses an empty name", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    const result = await createGroup(testUser.id, profile.id, { name: "   " })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("invalid_input")
  })

  it("keeps the group away from anybody who is not a member", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    const ownerProfile = await createTestProfile(owner)
    const otherProfile = await createTestProfile(other)

    const result = await createGroup(owner.id, ownerProfile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")

    const otherGroups = await getGroupsForProfile(otherProfile.id)

    expect(otherGroups).toHaveLength(0)
  })
})

describe("updateGroupSettings", () => {
  it("stores the weigh-in day and time for the group", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)
    const result = await createGroup(testUser.id, profile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")
    if (!result.ok) return

    const update = await updateGroupSettings(testUser.id, profile.id, result.groupId, {
      weighInWeekday: "3",
      weighInTime: "09:30",
    })

    expect(update.ok).toBe(true)

    const [settings] = await db
      .select()
      .from(groupSettings)
      .where(eq(groupSettings.groupId, result.groupId))

    expect(settings?.weighInWeekday).toBe(3)
    expect(settings?.weighInTime).toBe("09:30:00")
  })

  it("refuses a setting from anybody who is not the Owner", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const result = await createGroup(owner.id, ownerProfile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")
    if (!result.ok) return

    await db.insert(groupMemberships).values({
      groupId: result.groupId,
      profileId: memberProfile.id,
      role: "member",
    })

    const update = await updateGroupSettings(member.id, memberProfile.id, result.groupId, {
      weighInWeekday: "3",
      weighInTime: "",
    })

    expect(update.ok).toBe(false)
    if (update.ok) return
    expect(update.code).toBe("not_an_owner")
  })

  it("rejects an impossible weekday", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)
    const result = await createGroup(testUser.id, profile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")
    if (!result.ok) return

    const update = await updateGroupSettings(testUser.id, profile.id, result.groupId, {
      weighInWeekday: "9",
      weighInTime: "",
    })

    expect(update.ok).toBe(false)
  })
})

describe("deleteGroup", () => {
  it("removes the group with everything that belongs to it", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)
    const result = await createGroup(testUser.id, profile.id, { name: "Familia" })
    if (!result.ok) return

    const deletion = await deleteGroup(testUser.id, profile.id, result.groupId, { confirmed: true })

    expect(deletion.ok).toBe(true)

    const remainingGroups = await db.select().from(groups).where(eq(groups.id, result.groupId))
    const remainingMemberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, result.groupId))
    const remainingSettings = await db
      .select()
      .from(groupSettings)
      .where(eq(groupSettings.groupId, result.groupId))
    const remainingPermissions = await db
      .select()
      .from(canLogForRows)
      .where(eq(canLogForRows.groupId, result.groupId))

    expect(remainingGroups).toHaveLength(0)
    expect(remainingMemberships).toHaveLength(0)
    expect(remainingSettings).toHaveLength(0)
    expect(remainingPermissions).toHaveLength(0)
  })

  it("refuses a deletion without the explicit confirmation", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)
    const result = await createGroup(testUser.id, profile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")
    if (!result.ok) return

    const deletion = await deleteGroup(testUser.id, profile.id, result.groupId, { confirmed: false })

    expect(deletion.ok).toBe(false)

    const remainingGroups = await db.select().from(groups).where(eq(groups.id, result.groupId))

    expect(remainingGroups).toHaveLength(1)
  })

  it("refuses a deletion from anybody who is not the Owner", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const result = await createGroup(owner.id, ownerProfile.id, { name: "Familia" })
    createdGroups.push(result.ok ? result.groupId : "")
    if (!result.ok) return

    await db.insert(groupMemberships).values({
      groupId: result.groupId,
      profileId: memberProfile.id,
      role: "member",
    })

    const deletion = await deleteGroup(member.id, memberProfile.id, result.groupId, {
      confirmed: true,
    })

    expect(deletion.ok).toBe(false)
    if (deletion.ok) return
    expect(deletion.code).toBe("not_an_owner")
  })
})
