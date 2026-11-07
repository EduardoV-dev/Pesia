import { afterEach, describe, expect, it } from "vitest"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, invites } from "@/db/schema"
import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from "@/features/groups/invite"
import {
  acceptInvite,
  createInvite,
  findUsableInvite,
  joinGroupWithCode,
  revokeInvite,
} from "@/features/groups/server/invite-writes"
import {
  addTestGroupMember,
  createTestGroup,
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

describe("createInvite", () => {
  it("gives a link a long token and a code six unambiguous characters", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const link = await createInvite(owner.id, ownerProfile.id, groupId, "link")
    const code = await createInvite(owner.id, ownerProfile.id, groupId, "code")

    expect(link.ok).toBe(true)
    expect(code.ok).toBe(true)
    if (!link.ok || !code.ok) return

    expect(link.invite.token.length).toBeGreaterThan(20)
    expect(code.invite.token).toHaveLength(INVITE_CODE_LENGTH)
    expect([...code.invite.token].every((character) => INVITE_CODE_ALPHABET.includes(character))).toBe(
      true,
    )
    expect(code.invite.token).not.toMatch(/[01OIL]/)
  })

  it("expires a code and leaves a link alive", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const link = await createInvite(owner.id, ownerProfile.id, groupId, "link")
    const code = await createInvite(owner.id, ownerProfile.id, groupId, "code")
    if (!link.ok || !code.ok) return

    expect(link.invite.expiresAt).toBeNull()
    expect(code.invite.expiresAt).not.toBeNull()
  })

  it("refuses an invitation from anybody who is not the Owner", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const result = await createInvite(member.id, memberProfile.id, groupId, "link")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_an_owner")
  })
})

describe("acceptInvite", () => {
  it("adds the member to that group and to no other", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    const otherGroupId = await createTestGroup(owner, ownerProfile, "Otro grupo")
    createdGroups.push(groupId, otherGroupId)

    const invite = await createInvite(owner.id, ownerProfile.id, groupId, "link")
    if (!invite.ok) return

    const result = await acceptInvite(member.id, memberProfile.id, invite.invite.token)

    expect(result.ok).toBe(true)

    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.profileId, memberProfile.id))

    expect(memberships).toHaveLength(1)
    expect(memberships[0]?.groupId).toBe(groupId)
    expect(memberships[0]?.role).toBe("member")
    expect(memberships[0]?.visibility).toBe("weight_trend")
  })

  it("changes nothing for somebody who is already in the group", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const invite = await createInvite(owner.id, ownerProfile.id, groupId, "link")
    if (!invite.ok) return

    const result = await acceptInvite(owner.id, ownerProfile.id, invite.invite.token)

    expect(result.ok).toBe(true)

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

  it("adds nobody for an invitation that does not work", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const result = await acceptInvite(member.id, memberProfile.id, "un-token-inventado")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_found")

    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.profileId, memberProfile.id))

    expect(memberships).toHaveLength(0)
  })

  it("spends a code the moment it works", async () => {
    const owner = await createTestUser()
    const first = await createTestUser()
    const second = await createTestUser()
    createdUsers.push(owner, first, second)
    const ownerProfile = await createTestProfile(owner)
    const firstProfile = await createTestProfile(first)
    const secondProfile = await createTestProfile(second)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const invite = await createInvite(owner.id, ownerProfile.id, groupId, "code")
    if (!invite.ok) return

    const firstJoin = await joinGroupWithCode(first.id, firstProfile.id, invite.invite.token)
    const secondJoin = await joinGroupWithCode(second.id, secondProfile.id, invite.invite.token)

    expect(firstJoin.ok).toBe(true)
    expect(secondJoin.ok).toBe(false)
  })

  it("reads a code the way it is written down", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const invite = await createInvite(owner.id, ownerProfile.id, groupId, "code")
    if (!invite.ok) return

    const result = await joinGroupWithCode(
      member.id,
      memberProfile.id,
      invite.invite.token.toLowerCase(),
    )

    expect(result.ok).toBe(true)
  })
})

describe("revokeInvite", () => {
  it("makes the invitation unusable at once and keeps the members who joined", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const invite = await createInvite(owner.id, ownerProfile.id, groupId, "link")
    if (!invite.ok) return

    await acceptInvite(member.id, memberProfile.id, invite.invite.token)
    const revocation = await revokeInvite(owner.id, ownerProfile.id, groupId, invite.invite.id)

    expect(revocation.ok).toBe(true)

    const usable = await findUsableInvite(invite.invite.token)
    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.profileId, memberProfile.id))

    expect(usable).toBeNull()
    expect(memberships).toHaveLength(1)
  })

  it("refuses a revocation from anybody who is not the Owner", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const invite = await createInvite(owner.id, ownerProfile.id, groupId, "link")
    if (!invite.ok) return

    const revocation = await revokeInvite(member.id, memberProfile.id, groupId, invite.invite.id)

    expect(revocation.ok).toBe(false)
    if (revocation.ok) return
    expect(revocation.code).toBe("not_an_owner")
  })

  it("lets the Owner issue a replacement", async () => {
    const owner = await createTestUser()
    createdUsers.push(owner)
    const ownerProfile = await createTestProfile(owner)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const first = await createInvite(owner.id, ownerProfile.id, groupId, "link")
    if (!first.ok) return

    await revokeInvite(owner.id, ownerProfile.id, groupId, first.invite.id)
    const replacement = await createInvite(owner.id, ownerProfile.id, groupId, "link")

    expect(replacement.ok).toBe(true)
    if (!replacement.ok) return
    expect(replacement.invite.token).not.toBe(first.invite.token)
    expect(await findUsableInvite(replacement.invite.token)).not.toBeNull()
  })
})

describe("an expired invitation", () => {
  it("adds nobody", async () => {
    const owner = await createTestUser()
    const member = await createTestUser()
    createdUsers.push(owner, member)
    const ownerProfile = await createTestProfile(owner)
    const memberProfile = await createTestProfile(member)
    const groupId = await createTestGroup(owner, ownerProfile)
    createdGroups.push(groupId)

    const invite = await createInvite(owner.id, ownerProfile.id, groupId, "code")
    if (!invite.ok) return

    await db
      .update(invites)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invites.id, invite.invite.id))

    const result = await joinGroupWithCode(member.id, memberProfile.id, invite.invite.token)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_found")
  })
})
