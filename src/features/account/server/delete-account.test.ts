import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { entries, groupMemberships, profiles, session, user } from "@/db/schema"
import { createEntry } from "@/features/entries/server/entry-writes"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { deleteAccount } from "./delete-account"
import {
  addTestGroupMember,
  createTestGroup,
  createTestProfile,
  createTestSession,
  createTestUser,
  deleteTestGroup,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

const createdUsers: TestUser[] = []
const createdGroups: string[] = []

afterEach(async () => {
  for (const groupId of createdGroups.splice(0)) {
    await deleteTestGroup(groupId)
  }

  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

type DeletionFixture = {
  readonly groupId: string
  readonly leaver: TestUser
  readonly leaverProfileId: string
  readonly ana: TestUser
  readonly anaProfileId: string
  readonly entryAboutAnaId: string
  readonly entryAboutLeaverId: string
}

/** Leaver + Ana share a group. The leaver recorded about Ana; Ana about the leaver. */
async function createDeletionFixture(): Promise<DeletionFixture> {
  const leaver = await createTestUser("Se Va")
  const ana = await createTestUser("Ana")
  createdUsers.push(leaver, ana)

  const leaverProfile = await createTestProfile(leaver, { displayName: "Se Va" })
  const anaProfile = await createTestProfile(ana, { displayName: "Ana" })

  const groupId = await createTestGroup(ana, anaProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, leaverProfile.id, "logger")

  const entryAboutAnaId = "00000000-0000-4000-8000-000000000501"
  const entryAboutLeaverId = "00000000-0000-4000-8000-000000000502"

  const entryAboutAnaResult = await createEntry({
    groupId,
    subjectProfileId: anaProfile.id,
    loggerProfileId: leaverProfile.id,
    actingUserId: leaver.id,
    entryId: entryAboutAnaId,
    weightKg: 64,
    measuredAt: new Date("2026-11-08T03:00:00Z"),
    recordedAt: new Date("2026-11-08T09:00:00Z"),
  })

  if (!entryAboutAnaResult.ok) {
    throw new Error(`Seeded entry failed: ${entryAboutAnaResult.errorMessage}`)
  }

  const entryAboutLeaverResult = await createEntry({
    groupId,
    subjectProfileId: leaverProfile.id,
    loggerProfileId: anaProfile.id,
    actingUserId: ana.id,
    entryId: entryAboutLeaverId,
    weightKg: 70.5,
    measuredAt: new Date("2026-11-08T03:10:00Z"),
    recordedAt: new Date("2026-11-08T09:10:00Z"),
  })

  if (!entryAboutLeaverResult.ok) {
    throw new Error(`Seeded entry failed: ${entryAboutLeaverResult.errorMessage}`)
  }

  return {
    groupId,
    leaver,
    leaverProfileId: leaverProfile.id,
    ana,
    anaProfileId: anaProfile.id,
    entryAboutAnaId,
    entryAboutLeaverId,
  }
}

describe("deleteAccount", () => {
  it("destroys the login, sessions and the profile recorded about them", async () => {
    const fixture = await createDeletionFixture()
    await createTestSession(fixture.leaver)

    await deleteAccount(fixture.leaver.id)

    expect(await db.select().from(user).where(eq(user.id, fixture.leaver.id))).toHaveLength(0)
    expect(await db.select().from(session).where(eq(session.userId, fixture.leaver.id))).toHaveLength(0)
    expect(await db.select().from(profiles).where(eq(profiles.id, fixture.leaverProfileId))).toHaveLength(0)
  })

  it("deletes the entries recorded about the leaver but keeps the leaver's entries about others", async () => {
    const fixture = await createDeletionFixture()

    await deleteAccount(fixture.leaver.id)

    const remainingEntries = await db
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.groupId, fixture.groupId))

    expect(remainingEntries.map((entry) => entry.id)).toEqual([fixture.entryAboutAnaId])
  })

  it("keeps the departed member's attribution readable as a legacy author", async () => {
    const fixture = await createDeletionFixture()

    await deleteAccount(fixture.leaver.id)

    const anaHistory = await listEntriesForViewer({
      viewerProfileId: fixture.anaProfileId,
      viewerUserId: fixture.ana.id,
      subjectProfileId: fixture.anaProfileId,
      groupId: fixture.groupId,
    })

    expect(anaHistory).toHaveLength(1)
    expect(anaHistory[0].recordedByName).toBe("Se Va")
    expect(anaHistory[0].recordedByIsLegacy).toBe(true)
  })

  it("removes the leaver's memberships with the profile cascade", async () => {
    const fixture = await createDeletionFixture()

    await deleteAccount(fixture.leaver.id)

    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.profileId, fixture.leaverProfileId))

    expect(memberships).toHaveLength(0)
  })
})
