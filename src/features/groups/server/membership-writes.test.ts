import { afterEach, describe, expect, it } from "vitest"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/db/client"
import { canLogFor as canLogForRows, groupMemberships } from "@/db/schema"
import {
  changeMemberRole,
  leaveGroup,
  removeMember,
  transferOwnership,
} from "@/features/groups/server/membership-writes"
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

describe("changeMemberRole", () => {
  it("refuses a role change from anybody who is not the Owner", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await changeMemberRole(member.id, memberProfile.id, groupId, ownerProfile.id, {
      role: "logger",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_an_owner")

    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.profileId, ownerProfile.id),
        ),
      )

    expect(membership?.role).toBe("owner")
  })

  it("refuses to promote a dependent profile", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const dependentProfile = await createTestManagedProfile(owner, { isDependent: true })
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, dependentProfile.id, "member")

    const result = await changeMemberRole(
      owner.id,
      ownerProfile.id,
      groupId,
      dependentProfile.id,
      { role: "logger" },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("dependent_profile")
  })

  it("refuses to demote the only Owner", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const result = await changeMemberRole(
      owner.id,
      ownerProfile.id,
      groupId,
      ownerProfile.id,
      { role: "member" },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("last_owner")
  })

  it("refuses a role that does not exist", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestManagedProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await changeMemberRole(
      owner.id,
      ownerProfile.id,
      groupId,
      memberProfile.id,
      { role: "admin" },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("invalid_input")
  })
})

describe("transferOwnership", () => {
  it("hands the Owner role over and keeps the group with an Owner", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await transferOwnership(owner.id, ownerProfile.id, groupId, memberProfile.id)

    expect(result.ok).toBe(true)

    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId))

    expect(memberships.find((row) => row.profileId === memberProfile.id)?.role).toBe("owner")
    expect(memberships.find((row) => row.profileId === ownerProfile.id)?.role).toBe("member")
  })

  it("refuses a transfer to somebody outside the group", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    const ownerProfile = await createTestProfile(owner)
    const otherProfile = await createTestProfile(other)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const result = await transferOwnership(owner.id, ownerProfile.id, groupId, otherProfile.id)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_a_member")
  })
})

describe("removeMember", () => {
  it("closes the membership and takes the permissions away", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await removeMember(owner.id, ownerProfile.id, groupId, memberProfile.id)

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

    expect(membership?.leftAt).not.toBeNull()

    const mayRecord = await canLogFor({
      groupId,
      subjectProfileId: memberProfile.id,
      loggerProfileId: memberProfile.id,
    })

    expect(mayRecord).toBe(false)
  })

  it("refuses to remove the Owner", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const result = await removeMember(owner.id, ownerProfile.id, groupId, ownerProfile.id)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("owner_must_transfer")
  })
})

describe("leaveGroup", () => {
  it("closes the membership and keeps the group history intact", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await leaveGroup(member.id, memberProfile.id, groupId)

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
    const remainingOwners = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.role, "owner"),
          isNull(groupMemberships.leftAt),
        ),
      )

    expect(membership?.leftAt).not.toBeNull()
    expect(remainingOwners).toHaveLength(1)
  })

  it("refuses to let the Owner walk away", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const result = await leaveGroup(owner.id, ownerProfile.id, groupId)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("owner_must_transfer")
  })

  it("refuses to let somebody leave a group they are not in", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    const ownerProfile = await createTestProfile(owner)
    const otherProfile = await createTestProfile(other)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const result = await leaveGroup(other.id, otherProfile.id, groupId)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_a_member")
  })
})

describe("the role matrix after a membership change", () => {
  it("matches the roles after a member joins", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    await addTestGroupMember(groupId, memberProfile.id, "logger")

    const ownerMayRecord = await canLogFor({
      groupId,
      subjectProfileId: memberProfile.id,
      loggerProfileId: ownerProfile.id,
    })
    const loggerMayRecord = await canLogFor({
      groupId,
      subjectProfileId: ownerProfile.id,
      loggerProfileId: memberProfile.id,
    })

    expect(ownerMayRecord).toBe(true)
    expect(loggerMayRecord).toBe(true)
  })

  it("holds no row for a member who left", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "logger")

    await leaveGroup(member.id, memberProfile.id, groupId)

    const rows = await db
      .select()
      .from(canLogForRows)
      .where(eq(canLogForRows.groupId, groupId))

    expect(rows.every((row) => row.loggerProfileId !== memberProfile.id)).toBe(true)
    expect(rows.some((row) => row.subjectProfileId === memberProfile.id)).toBe(false)
  })
})
