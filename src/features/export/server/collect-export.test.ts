import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/db/client"
import { canLogFor, goals, pushOptIns } from "@/db/schema"
import { createEntry, deleteEntry } from "@/features/entries/server/entry-writes"
import { collectMemberExport } from "./collect-export"
import { buildCsvRows, renderEntriesCsv } from "../csv"
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

type ExportFixture = {
  readonly groupId: string
  readonly sofia: TestUser
  readonly sofiaProfileId: string
  readonly maraProfileId: string
  readonly ana: TestUser
  readonly anaProfileId: string
}

/**
 * Sofía (member + guardian of the dependent Mara) shares a group with Ana, who
 * records the family's weigh-ins. One entry about each profile, plus one entry
 * Sofía records about Ana via an explicit grant — that one must stay out.
 */
async function createExportFixture(): Promise<ExportFixture> {
  const sofia = await createTestUser("Sofía")
  const ana = await createTestUser("Ana")
  createdUsers.push(sofia, ana)

  const sofiaProfile = await createTestProfile(sofia, { displayName: "Sofía" })
  const maraProfile = await createTestManagedProfile(sofia, {
    displayName: "Mara",
    isDependent: true,
  })
  const anaProfile = await createTestProfile(ana, { displayName: "Ana" })
  createdProfileIds.push(sofiaProfile.id, maraProfile.id, anaProfile.id)

  const groupId = await createTestGroup(ana, anaProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, sofiaProfile.id, "member")
  await addTestGroupMember(groupId, maraProfile.id, "member")

  await db
    .insert(canLogFor)
    .values({
      groupId,
      subjectProfileId: anaProfile.id,
      loggerProfileId: sofiaProfile.id,
      grantedByUserId: ana.id,
      source: "explicit",
    })
    .onConflictDoNothing()

  await createEntry({
    groupId,
    subjectProfileId: sofiaProfile.id,
    loggerProfileId: anaProfile.id,
    actingUserId: ana.id,
    entryId: "00000000-0000-4000-8000-000000000301",
    weightKg: 70.2,
    measuredAt: new Date("2026-11-08T03:00:00Z"),
    recordedAt: new Date("2026-11-08T09:30:00Z"),
    note: "Nota privada de Ana.",
  })

  await createEntry({
    groupId,
    subjectProfileId: maraProfile.id,
    loggerProfileId: anaProfile.id,
    actingUserId: ana.id,
    entryId: "00000000-0000-4000-8000-000000000302",
    weightKg: 22.5,
    measuredAt: new Date("2026-11-08T03:05:00Z"),
    recordedAt: new Date("2026-11-08T09:31:00Z"),
    note: "Nota de Ana sobre Mara.",
  })

  await createEntry({
    groupId,
    subjectProfileId: sofiaProfile.id,
    loggerProfileId: sofiaProfile.id,
    actingUserId: sofia.id,
    entryId: "00000000-0000-4000-8000-000000000303",
    weightKg: 70.8,
    measuredAt: new Date("2026-11-09T03:00:00Z"),
    recordedAt: new Date("2026-11-09T09:00:00Z"),
    note: "Mi nota.",
  })

  await createEntry({
    groupId,
    subjectProfileId: anaProfile.id,
    loggerProfileId: sofiaProfile.id,
    actingUserId: sofia.id,
    entryId: "00000000-0000-4000-8000-000000000304",
    weightKg: 64.0,
    measuredAt: new Date("2026-11-09T03:10:00Z"),
    recordedAt: new Date("2026-11-09T09:05:00Z"),
  })

  await db.insert(goals).values({
    profileId: sofiaProfile.id,
    direction: "lose",
    targetWeightKg: 66,
    baselineWeightKg: 71,
    baselineAt: new Date("2026-11-01T03:00:00Z"),
  })

  await db.insert(pushOptIns).values({ userId: sofia.id, groupId, enabled: true })

  return {
    groupId,
    sofia,
    sofiaProfileId: sofiaProfile.id,
    maraProfileId: maraProfile.id,
    ana,
    anaProfileId: anaProfile.id,
  }
}

describe("collectMemberExport", () => {
  it("collects every section about the member's managed profiles", async () => {
    const fixture = await createExportFixture()

    const exportData = await collectMemberExport({ userId: fixture.sofia.id })

    expect(exportData.profiles.map((profile) => profile.id).sort()).toEqual(
      [fixture.sofiaProfileId, fixture.maraProfileId].sort(),
    )
    expect(exportData.goals).toHaveLength(1)
    expect(exportData.goals[0].profileId).toBe(fixture.sofiaProfileId)
    expect(exportData.entries).toHaveLength(3)
    expect(exportData.memberships).toHaveLength(2)
    expect(exportData.pushOptIns).toHaveLength(1)

    // Role rows naming her profiles (self + Ana's recorder rows) plus the explicit grant.
    expect(exportData.permissions).toHaveLength(5)
    expect(
      exportData.permissions.some(
        (permission) =>
          permission.source === "explicit" &&
          permission.loggerProfileId === fixture.sofiaProfileId &&
          permission.subjectProfileId === fixture.anaProfileId,
      ),
    ).toBe(true)
  })

  it("includes entries recorded by others about the managed profiles", async () => {
    const fixture = await createExportFixture()

    const exportData = await collectMemberExport({ userId: fixture.sofia.id })

    const entryIds = exportData.entries.map((entry) => entry.id)
    expect(entryIds).toContain("00000000-0000-4000-8000-000000000301")
    expect(entryIds).toContain("00000000-0000-4000-8000-000000000302")
    expect(exportData.entries.find((entry) => entry.id === "00000000-0000-4000-8000-000000000301")?.recordedByName).toBe("Ana")
  })

  it("excludes entries the member recorded about people they do not manage", async () => {
    const fixture = await createExportFixture()

    const exportData = await collectMemberExport({ userId: fixture.sofia.id })

    expect(exportData.entries.map((entry) => entry.id)).not.toContain(
      "00000000-0000-4000-8000-000000000304",
    )
  })

  it("withholds other recorders' notes and keeps the member's own", async () => {
    const fixture = await createExportFixture()

    const exportData = await collectMemberExport({ userId: fixture.sofia.id })

    const entryByAna = exportData.entries.find(
      (entry) => entry.id === "00000000-0000-4000-8000-000000000301",
    )
    const ownEntry = exportData.entries.find(
      (entry) => entry.id === "00000000-0000-4000-8000-000000000303",
    )

    expect(entryByAna?.note).toBeNull()
    expect(ownEntry?.note).toBe("Mi nota.")
  })

  it("omits deleted entries", async () => {
    const fixture = await createExportFixture()

    await deleteEntry({
      entryId: "00000000-0000-4000-8000-000000000302",
      actingProfileId: fixture.maraProfileId,
      actingUserId: fixture.sofia.id,
    })

    const exportData = await collectMemberExport({ userId: fixture.sofia.id })

    expect(exportData.entries.map((entry) => entry.id)).not.toContain(
      "00000000-0000-4000-8000-000000000302",
    )
  })

  it("renders a CSV with one row per entry and quoted values", async () => {
    const fixture = await createExportFixture()

    const exportData = await collectMemberExport({ userId: fixture.sofia.id })
    const csv = renderEntriesCsv(buildCsvRows(exportData))
    const lines = csv.split("\r\n")

    expect(lines[0]).toBe("perfil,día de la pesada,día del registro,peso (kg),registrada por")
    expect(lines).toHaveLength(4)
    expect(csv).toContain("Sofía")
    expect(csv).toContain("Mara")
    expect(csv).not.toContain("Ana,64")
  })
})

describe("renderEntriesCsv escaping", () => {
  it("quotes values containing separators, quotes or newlines", () => {
    const csv = renderEntriesCsv([
      {
        profileName: 'Ana, "la mayor"',
        measuredAt: "2026-11-09T03:00:00.000Z",
        recordedAt: "2026-11-09T09:00:00.000Z",
        weightKg: 64,
        recordedByName: "Ana",
      },
    ])

    expect(csv).toContain('"Ana, ""la mayor"""')
  })
})
