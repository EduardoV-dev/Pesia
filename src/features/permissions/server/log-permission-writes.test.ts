import { afterEach, describe, expect, it } from "vitest"

import { changeMemberRole } from "@/features/groups/server/membership-writes"
import { canLogFor } from "@/features/permissions/server/log-permissions"
import {
  grantLogPermission,
  revokeLogPermission,
} from "@/features/permissions/server/log-permission-writes"
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


describe("grantLogPermission", () => {
  it("lets the granted person record the subject's weight in that group only", async () => {
    const owner = await createTestUser()
    const subject = await createTestUser()
    const logger = await createTestUser()
    createdUsers.push(owner, subject, logger)

    const ownerProfile = await createTestProfile(owner)
    const subjectProfile = await createTestProfile(subject)
    const loggerProfile = await createTestProfile(logger)

    const groupId = await createTestGroup(owner, ownerProfile)
    const otherGroupId = await createTestGroup(owner, ownerProfile, "Otro grupo")
    await addTestGroupMember(groupId, subjectProfile.id, "member")
    await addTestGroupMember(groupId, loggerProfile.id, "member")
    await addTestGroupMember(otherGroupId, subjectProfile.id, "member")
    await addTestGroupMember(otherGroupId, loggerProfile.id, "member")

    const result = await grantLogPermission(subject.id, subjectProfile.id, {
      groupId,
      loggerProfileId: loggerProfile.id,
    })

    expect(result.ok).toBe(true)

    const inGroup = await canLogFor({
      groupId,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: loggerProfile.id,
    })
    const inOtherGroup = await canLogFor({
      groupId: otherGroupId,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: loggerProfile.id,
    })

    expect(inGroup).toBe(true)
    expect(inOtherGroup).toBe(false)
  })

  it("refuses a grant from somebody who does not manage the subject", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)

    const ownerProfile = await createTestProfile(owner)
    const otherProfile = await createTestProfile(other)
    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, otherProfile.id, "member")

    const result = await grantLogPermission(other.id, ownerProfile.id, {
      groupId,
      loggerProfileId: otherProfile.id,
    })

    expect(result.ok).toBe(false)
  })

  it("keeps an explicit grant through a promotion and a demotion", async () => {
    const owner = await createTestUser()
    const subject = await createTestUser()
    const logger = await createTestUser()
    createdUsers.push(owner, subject, logger)

    const ownerProfile = await createTestProfile(owner)
    const subjectProfile = await createTestProfile(subject)
    const loggerProfile = await createTestProfile(logger)

    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, subjectProfile.id, "member")
    await addTestGroupMember(groupId, loggerProfile.id, "member")

    await grantLogPermission(subject.id, subjectProfile.id, {
      groupId,
      loggerProfileId: loggerProfile.id,
    })

    await changeMemberRole(owner.id, ownerProfile.id, groupId, loggerProfile.id, { role: "logger" })
    await changeMemberRole(owner.id, ownerProfile.id, groupId, loggerProfile.id, { role: "member" })

    const stillAllowed = await canLogFor({
      groupId,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: loggerProfile.id,
    })

    expect(stillAllowed).toBe(true)
  })
})

describe("revokeLogPermission", () => {
  it("takes effect at once and leaves the subject's own ability alone", async () => {
    const owner = await createTestUser()
    const subject = await createTestUser()
    const logger = await createTestUser()
    createdUsers.push(owner, subject, logger)

    const ownerProfile = await createTestProfile(owner)
    const subjectProfile = await createTestProfile(subject)
    const loggerProfile = await createTestProfile(logger)

    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, subjectProfile.id, "member")
    await addTestGroupMember(groupId, loggerProfile.id, "member")

    await grantLogPermission(subject.id, subjectProfile.id, {
      groupId,
      loggerProfileId: loggerProfile.id,
    })

    const result = await revokeLogPermission(subject.id, subjectProfile.id, {
      groupId,
      loggerProfileId: loggerProfile.id,
    })

    expect(result.ok).toBe(true)

    const revoked = await canLogFor({
      groupId,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: loggerProfile.id,
    })
    const ownRight = await canLogFor({
      groupId,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: subjectProfile.id,
    })

    expect(revoked).toBe(false)
    expect(ownRight).toBe(true)
  })

  it("refuses to revoke a permission that comes from the role", async () => {
    const owner = await createTestUser()
    const subject = await createTestUser()
    const logger = await createTestUser()
    createdUsers.push(owner, subject, logger)

    const ownerProfile = await createTestProfile(owner)
    const subjectProfile = await createTestProfile(subject)
    const loggerProfile = await createTestProfile(logger)

    const groupId = await createTestGroup(owner, ownerProfile)
    await addTestGroupMember(groupId, subjectProfile.id, "member")
    await addTestGroupMember(groupId, loggerProfile.id, "logger")

    const result = await revokeLogPermission(subject.id, subjectProfile.id, {
      groupId,
      loggerProfileId: loggerProfile.id,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errorMessage).toContain("rol")
  })
})
