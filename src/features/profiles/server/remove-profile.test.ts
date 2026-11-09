import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { createEntry, deleteEntry } from "@/features/entries/server/entry-writes"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { listGroupMembers } from "@/features/groups/server/group-access"
import { removeProfile } from "./remove-profile"
import {
  addTestGroupMember,
  createTestGroup,
  createTestManagedProfile,
  createTestProfile,
  createTestUser,
  deleteTestGroup,
  deleteTestProfile,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

const createdUsers: TestUser[] = []
const createdGroups: string[] = []
const createdProfileIds: string[] = []

afterEach(async () => {
  for (const groupId of createdGroups.splice(0)) {
    await deleteTestGroup(groupId)
  }

  for (const profileId of createdProfileIds.splice(0)) {
    await deleteTestProfile(profileId)
  }

  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

type RemovalFixture = {
  readonly groupId: string
  readonly guardian: TestUser
  readonly guardianProfileId: string
  readonly maraProfileId: string
  readonly ana: TestUser
  readonly anaProfileId: string
  readonly maraEntryId: string
}

/** Guardian Sofía manages the dependent Mara; both share a group with Ana. */
async function createRemovalFixture(): Promise<RemovalFixture> {
  const guardian = await createTestUser("Sofía")
  const ana = await createTestUser("Ana")
  createdUsers.push(guardian, ana)

  const guardianProfile = await createTestProfile(guardian, { displayName: "Sofía" })
  const maraProfile = await createTestManagedProfile(guardian, {
    displayName: "Mara",
    isDependent: true,
  })
  const anaProfile = await createTestProfile(ana, { displayName: "Ana" })
  createdProfileIds.push(guardianProfile.id, maraProfile.id, anaProfile.id)

  const groupId = await createTestGroup(ana, anaProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, guardianProfile.id, "member")
  await addTestGroupMember(groupId, maraProfile.id, "member")

  const maraEntryId = "00000000-0000-4000-8000-000000000401"

  const entryResult = await createEntry({
    groupId,
    subjectProfileId: maraProfile.id,
    loggerProfileId: anaProfile.id,
    actingUserId: ana.id,
    entryId: maraEntryId,
    weightKg: 22.5,
    measuredAt: new Date("2026-11-08T03:00:00Z"),
    recordedAt: new Date("2026-11-08T09:30:00Z"),
  })

  if (!entryResult.ok) {
    throw new Error(`Seeded entry failed: ${entryResult.errorMessage}`)
  }

  return {
    groupId,
    guardian,
    guardianProfileId: guardianProfile.id,
    maraProfileId: maraProfile.id,
    ana,
    anaProfileId: anaProfile.id,
    maraEntryId,
  }
}

describe("removeProfile", () => {
  it("soft-removes a managed dependent profile", async () => {
    const fixture = await createRemovalFixture()

    const result = await removeProfile(fixture.guardian.id, fixture.maraProfileId)

    expect(result.ok).toBe(true)

    const [profile] = await db
      .select({ removedAt: profiles.removedAt })
      .from(profiles)
      .where(eq(profiles.id, fixture.maraProfileId))

    expect(profile?.removedAt).not.toBeNull()
  })

  it("is a no-op when repeated", async () => {
    const fixture = await createRemovalFixture()

    await removeProfile(fixture.guardian.id, fixture.maraProfileId)
    const secondResult = await removeProfile(fixture.guardian.id, fixture.maraProfileId)

    expect(secondResult.ok).toBe(true)
  })

  it("refuses a profile the caller does not manage", async () => {
    const fixture = await createRemovalFixture()

    const result = await removeProfile(fixture.ana.id, fixture.maraProfileId)

    expect(result).toMatchObject({ ok: false, code: "not_managed" })
  })

  it("refuses a profile attached to a login", async () => {
    const fixture = await createRemovalFixture()

    const result = await removeProfile(fixture.guardian.id, fixture.guardianProfileId)

    expect(result).toMatchObject({ ok: false, code: "has_login" })
  })

  it("keeps the removed profile's history visible to its guardian and to others", async () => {
    const fixture = await createRemovalFixture()
    await removeProfile(fixture.guardian.id, fixture.maraProfileId)

    const guardianHistory = await listEntriesForViewer({
      viewerProfileId: fixture.maraProfileId,
      viewerUserId: fixture.guardian.id,
      subjectProfileId: fixture.maraProfileId,
    })
    const anaHistory = await listEntriesForViewer({
      viewerProfileId: fixture.anaProfileId,
      viewerUserId: fixture.ana.id,
      subjectProfileId: fixture.maraProfileId,
    })

    expect(guardianHistory.map((view) => view.id)).toContain(fixture.maraEntryId)
    expect(anaHistory.map((view) => view.id)).toContain(fixture.maraEntryId)
  })

  it("drops the removed profile from the group's member listing", async () => {
    const fixture = await createRemovalFixture()

    await removeProfile(fixture.guardian.id, fixture.maraProfileId)

    const members = await listGroupMembers(fixture.groupId)

    expect(members.map((member) => member.profile.id)).not.toContain(fixture.maraProfileId)
  })

  it("blocks new entries recorded against the removed profile", async () => {
    const fixture = await createRemovalFixture()
    await removeProfile(fixture.guardian.id, fixture.maraProfileId)

    const result = await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.maraProfileId,
      loggerProfileId: fixture.anaProfileId,
      actingUserId: fixture.ana.id,
      entryId: "00000000-0000-4000-8000-000000000402",
      weightKg: 22.8,
      measuredAt: new Date("2026-11-09T03:00:00Z"),
      recordedAt: new Date("2026-11-09T09:00:00Z"),
    })

    expect(result).toMatchObject({ ok: false, code: "subject_not_in_group" })
  })

  it("still allows correcting an existing entry after removal", async () => {
    const fixture = await createRemovalFixture()
    await removeProfile(fixture.guardian.id, fixture.maraProfileId)

    const editResult = await deleteEntry({
      entryId: fixture.maraEntryId,
      actingUserId: fixture.guardian.id,
      actingProfileId: fixture.maraProfileId,
    })

    expect(editResult.ok).toBe(true)
  })
})
