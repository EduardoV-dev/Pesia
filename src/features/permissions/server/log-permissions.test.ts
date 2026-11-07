import { afterEach, describe, expect, it } from "vitest"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { canLogFor as canLogForRows, groupMemberships } from "@/db/schema"
import { GROUP_ROLES } from "@/features/groups/roles"
import { GROUP_VISIBILITIES, type GroupVisibility } from "@/features/groups/visibility"
import { changeMemberRole, removeMember } from "@/features/groups/server/membership-writes"
import { canLogFor } from "@/features/permissions/server/log-permissions"
import { resolveVisibleMembers } from "@/features/permissions/server/visibility"
import {
  addTestGroupMember,
  createTestGroup,
  createTestProfile,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

const createdUsers: TestUser[] = []

afterEach(async () => {
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

describe("canLogFor", () => {
  it("lets a member record their own weight", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const allowed = await canLogFor({
      groupId,
      subjectProfileId: memberProfile.id,
      loggerProfileId: memberProfile.id,
    })

    expect(allowed).toBe(true)
  })

  it("does not let a member record somebody else's weight", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const allowed = await canLogFor({
      groupId,
      subjectProfileId: ownerProfile.id,
      loggerProfileId: memberProfile.id,
    })

    expect(allowed).toBe(false)
  })

  it("lets a Logger record the weight of every member of the group", async () => {
    const owner = await createTestUser()
    const logger = await createTestUser()
    createdUsers.push(owner, logger)

    const ownerProfile = await createTestProfile(owner)
    const loggerProfile = await createTestProfile(logger)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, loggerProfile.id, "logger")

    const allowed = await canLogFor({
      groupId,
      subjectProfileId: ownerProfile.id,
      loggerProfileId: loggerProfile.id,
    })

    expect(allowed).toBe(true)
  })

  it("stops granting the moment a Logger is demoted", async () => {
    const owner = await createTestUser()
    const logger = await createTestUser()
    createdUsers.push(owner, logger)

    const ownerProfile = await createTestProfile(owner)
    const loggerProfile = await createTestProfile(logger)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, loggerProfile.id, "logger")

    await changeMemberRole(owner.id, ownerProfile.id, groupId, loggerProfile.id, { role: "member" })

    const allowed = await canLogFor({
      groupId,
      subjectProfileId: ownerProfile.id,
      loggerProfileId: loggerProfile.id,
    })

    expect(allowed).toBe(false)
  })

  it("keeps a Logger's own recording right when they are demoted", async () => {
    const owner = await createTestUser()
    const logger = await createTestUser()
    createdUsers.push(owner, logger)

    const ownerProfile = await createTestProfile(owner)
    const loggerProfile = await createTestProfile(logger)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, loggerProfile.id, "logger")

    await changeMemberRole(owner.id, ownerProfile.id, groupId, loggerProfile.id, { role: "member" })

    const allowed = await canLogFor({
      groupId,
      subjectProfileId: loggerProfile.id,
      loggerProfileId: loggerProfile.id,
    })

    expect(allowed).toBe(true)
  })

  it("drops the permission of a member who is removed", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    await removeMember(owner.id, ownerProfile.id, groupId, memberProfile.id)

    const allowed = await canLogFor({
      groupId,
      subjectProfileId: memberProfile.id,
      loggerProfileId: memberProfile.id,
    })

    expect(allowed).toBe(false)
  })
})

describe("the write check and the read check never stand in for each other", () => {
  it("answers the write from the role and the read from the visibility, in every combination", async () => {
    for (const loggerRole of GROUP_ROLES) {
      for (const subjectVisibility of GROUP_VISIBILITIES) {
        const owner = await createTestUser()
        const logger = await createTestUser()
        const subject = await createTestUser()
        createdUsers.push(owner, logger, subject)

        const ownerProfile = await createTestProfile(owner, { displayName: "Nina" })
        const loggerProfile = await createTestProfile(logger, { displayName: "Ana" })
        const subjectProfile = await createTestProfile(subject, { displayName: "Luis" })

        const groupId = await createTestGroup(owner, ownerProfile)
        await addTestGroupMember(groupId, loggerProfile.id, loggerRole)
        await addTestGroupMember(groupId, subjectProfile.id, "member")
        await setVisibility(groupId, subjectProfile.id, subjectVisibility)

        const mayRecord = await canLogFor({
          groupId,
          subjectProfileId: subjectProfile.id,
          loggerProfileId: loggerProfile.id,
        })

        const members = await resolveVisibleMembers({
          groupId,
          viewerProfileId: ownerProfile.id,
        })
        const subjectView = members.find((member) => member.profileId === subjectProfile.id)

        const roleAllowsRecording = loggerRole === "owner" || loggerRole === "logger"
        expect(mayRecord).toBe(roleAllowsRecording)

        const visibilityAllowsWeight =
          subjectVisibility === "weight_trend" || subjectVisibility === "latest_only"
        expect(subjectView?.canViewWeight).toBe(visibilityAllowsWeight)
        expect(subjectView?.canViewTrend).toBe(subjectVisibility === "weight_trend")
      }
    }
  })

  it("lets a Logger record a private member without letting them read that member's history", async () => {
    const owner = await createTestUser()
    const logger = await createTestUser()
    const subject = await createTestUser()
    createdUsers.push(owner, logger, subject)

    const ownerProfile = await createTestProfile(owner)
    const loggerProfile = await createTestProfile(logger)
    const subjectProfile = await createTestProfile(subject, { displayName: "Sofía" })

    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, loggerProfile.id, "logger")
    await addTestGroupMember(groupId, subjectProfile.id, "member")
    await setVisibility(groupId, subjectProfile.id, "private")

    const mayRecord = await canLogFor({
      groupId,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: loggerProfile.id,
    })

    const seenByLogger = await resolveVisibleMembers({
      groupId,
      viewerProfileId: loggerProfile.id,
    })
    const subjectView = seenByLogger.find((member) => member.profileId === subjectProfile.id)

    expect(mayRecord).toBe(true)
    expect(subjectView?.displayName).toBe("Privado")
    expect(subjectView?.canViewWeight).toBe(false)
    expect(subjectView?.canViewTrend).toBe(false)
  })
})

describe("the role matrix", () => {
  it("holds a self row for every member and no more for a plain member", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)

    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const rows = await db
      .select()
      .from(canLogForRows)
      .where(eq(canLogForRows.groupId, groupId))

    const memberRows = rows.filter((row) => row.loggerProfileId === memberProfile.id)

    expect(memberRows).toHaveLength(1)
    expect(memberRows[0]?.subjectProfileId).toBe(memberProfile.id)
    expect(rows.every((row) => row.source === "role")).toBe(true)
  })
})
