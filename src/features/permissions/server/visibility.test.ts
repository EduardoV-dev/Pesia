import { afterEach, describe, expect, it } from "vitest"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships } from "@/db/schema"
import { type GroupVisibility } from "@/features/groups/visibility"
import { PRIVATE_MEMBER_LABEL, resolveVisibleMembers } from "@/features/permissions/server/visibility"
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

async function setVisibility(
  groupId: string,
  profileId: string,
  visibility: GroupVisibility,
): Promise<void> {
  await db
    .update(groupMemberships)
    .set({ visibility })
    .where(
      and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, profileId)),
    )
}

describe("resolveVisibleMembers", () => {
  it("hides the name, the weight and the trend of a private member", async () => {
    const owner = await createTestUser()
    const privateMember = await createTestUser()
    createdUsers.push(owner, privateMember)

    const ownerProfile = await createTestProfile(owner)
    const privateProfile = await createTestProfile(privateMember, { displayName: "Sofía" })
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, privateProfile.id, "member")
    await setVisibility(groupId, privateProfile.id, "private")

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: ownerProfile.id,
    })
    const view = members.find((member) => member.profileId === privateProfile.id)

    expect(view?.displayName).toBe(PRIVATE_MEMBER_LABEL)
    expect(view?.displayName).not.toContain("Sofía")
    expect(view?.isPrivate).toBe(true)
    expect(view?.canViewWeight).toBe(false)
    expect(view?.canViewTrend).toBe(false)
    expect(view?.avatarEmoji).toBeNull()
  })

  it("shows the name of a name-only member but no number", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member, { displayName: "Luis" })
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")
    await setVisibility(groupId, memberProfile.id, "name_only")

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: ownerProfile.id,
    })
    const view = members.find((member) => member.profileId === memberProfile.id)

    expect(view?.displayName).toBe("Luis")
    expect(view?.canViewWeight).toBe(false)
    expect(view?.canViewTrend).toBe(false)
  })

  it("shows the latest weight of a latest-only member but not the trend", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")
    await setVisibility(groupId, memberProfile.id, "latest_only")

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: ownerProfile.id,
    })
    const view = members.find((member) => member.profileId === memberProfile.id)

    expect(view?.canViewWeight).toBe(true)
    expect(view?.canViewTrend).toBe(false)
  })

  it("shows the whole trend of a member who shares everything", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: ownerProfile.id,
    })
    const view = members.find((member) => member.profileId === memberProfile.id)

    expect(view?.canViewWeight).toBe(true)
    expect(view?.canViewTrend).toBe(true)
  })

  it("shows a member their own data in full even when they share nothing", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member, { displayName: "Sofía" })
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")
    await setVisibility(groupId, memberProfile.id, "private")

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: memberProfile.id,
    })
    const view = members.find((member) => member.profileId === memberProfile.id)

    expect(view?.displayName).toBe("Sofía")
    expect(view?.isPrivate).toBe(false)
    expect(view?.canViewWeight).toBe(true)
    expect(view?.canViewTrend).toBe(true)
  })

  it("hides the ranking opt-out of a private member", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")
    await setVisibility(groupId, memberProfile.id, "private")
    await db
      .update(groupMemberships)
      .set({ rankingOptOut: true })
      .where(
        and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, memberProfile.id)),
      )

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: ownerProfile.id,
    })
    const view = members.find((member) => member.profileId === memberProfile.id)

    expect(view?.rankingOptOut).toBe(false)
  })

  it("never shows a dependent in the ranking", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const dependentProfile = await createTestManagedProfile(owner, { isDependent: true })
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, dependentProfile.id, "member")
    await db
      .update(groupMemberships)
      .set({ rankingOptOut: true })
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.profileId, dependentProfile.id),
        ),
      )

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: ownerProfile.id,
    })
    const view = members.find((member) => member.profileId === dependentProfile.id)

    expect(view?.isDependent).toBe(true)
    expect(view?.rankingOptOut).toBe(false)
  })

  it("shows a member who left the group to nobody", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")
    await db
      .update(groupMemberships)
      .set({ leftAt: new Date() })
      .where(
        and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, memberProfile.id)),
      )

    const members = await resolveVisibleMembers({
      groupId,
      viewerProfileId: ownerProfile.id,
    })

    expect(members.map((member) => member.profileId)).not.toContain(memberProfile.id)
  })
})
