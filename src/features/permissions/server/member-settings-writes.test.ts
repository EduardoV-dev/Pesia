import { afterEach, describe, expect, it } from "vitest"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships } from "@/db/schema"
import {
  setCadence,
  setRankingOptOut,
  setVisibility,
} from "@/features/permissions/server/member-settings-writes"
import { canLogFor } from "@/features/permissions/server/log-permissions"
import {
  addTestGroupMember,
  createTestGroup,
  createTestManagedProfile,
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

describe("setVisibility", () => {
  it("stores the level the member chose for this group", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await setVisibility(
      member.id,
      { groupId, profileId: memberProfile.id },
      "private",
    )

    expect(result.ok).toBe(true)

    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.profileId, memberProfile.id),
        ),
      )

    expect(membership?.visibility).toBe("private")
  })

  it("refuses a level that does not exist", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await setVisibility(
      member.id,
      { groupId, profileId: memberProfile.id },
      "everything",
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("invalid_input")
  })

  it("refuses a change on a profile the caller does not manage", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    const ownerProfile = await createTestProfile(owner)
    const otherProfile = await createTestProfile(other)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, otherProfile.id, "member")

    const result = await setVisibility(
      other.id,
      { groupId, profileId: ownerProfile.id },
      "private",
    )

    expect(result.ok).toBe(false)
  })
})

describe("setRankingOptOut", () => {
  it("keeps the member in the group and out of the ranking", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await setRankingOptOut(
      member.id,
      { groupId, profileId: memberProfile.id },
      true,
    )

    expect(result.ok).toBe(true)

    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.profileId, memberProfile.id),
        ),
      )

    expect(membership?.rankingOptOut).toBe(true)
    expect(membership?.leftAt).toBeNull()
  })

  it("refuses to put a dependent in the ranking", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const dependentProfile = await createTestManagedProfile(owner, { isDependent: true })
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, dependentProfile.id, "member")

    const result = await setRankingOptOut(
      owner.id,
      { groupId, profileId: dependentProfile.id },
      true,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("dependent_profile")
  })
})

describe("setCadence", () => {
  it("stores the cadence of the member without touching any permission", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await setCadence(
      member.id,
      { groupId, profileId: memberProfile.id },
      "biweekly",
    )

    expect(result.ok).toBe(true)

    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.profileId, memberProfile.id),
        ),
      )
    const mayRecord = await canLogFor({
      groupId,
      subjectProfileId: memberProfile.id,
      loggerProfileId: memberProfile.id,
    })

    expect(membership?.cadenceDays).toBe(14)
    expect(mayRecord).toBe(true)
  })

  it("stores no cadence when the member picks none", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    await setCadence(member.id, { groupId, profileId: memberProfile.id }, "none")

    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.profileId, memberProfile.id),
        ),
      )

    expect(membership?.cadenceDays).toBeNull()
  })
})
