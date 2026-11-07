import { afterEach, describe, expect, it } from "vitest"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, user } from "@/db/schema"
import { GROUP_VISIBILITIES, type GroupVisibility } from "@/features/groups/visibility"
import { createEntry, deleteEntry } from "./entry-writes"
import { listEntriesForViewer } from "./entry-access"
import {
  addTestGroupMember,
  createTestGroup,
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

type AssemblerFixture = {
  readonly groupId: string
  readonly ownerUserId: string
  readonly ownerProfileId: string
  readonly loggerUserId: string
  readonly loggerProfileId: string
  readonly subjectUserId: string
  readonly subjectProfileId: string
}

/** Owner + Logger + Subject, so every visibility level can be exercised on one subject. */
async function createAssemblerFixture(visibility: GroupVisibility): Promise<AssemblerFixture> {
  const owner = await createTestUser("Dueña")
  const logger = await createTestUser("Registradora")
  const subject = await createTestUser("Pesada")
  createdUsers.push(owner, logger, subject)

  const ownerProfile = await createTestProfile(owner, { displayName: "Nina" })
  const loggerProfile = await createTestProfile(logger, { displayName: "Ana" })
  const subjectProfile = await createTestProfile(subject, { displayName: "Luis" })
  createdProfileIds.push(ownerProfile.id, loggerProfile.id, subjectProfile.id)

  const groupId = await createTestGroup(owner, ownerProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, loggerProfile.id, "logger")
  await addTestGroupMember(groupId, subjectProfile.id, "member")
  await setVisibility(groupId, subjectProfile.id, visibility)

  await createEntry({
    groupId,
    subjectProfileId: subjectProfile.id,
    loggerProfileId: loggerProfile.id,
    actingUserId: logger.id,
    entryId: "00000000-0000-4000-8000-000000000101",
    weightKg: 81.3,
    measuredAt: new Date("2026-11-06T03:00:00Z"),
    recordedAt: new Date("2026-11-06T09:30:00Z"),
    note: "Turno de las ocho.",
  })

  return {
    groupId,
    ownerUserId: owner.id,
    ownerProfileId: ownerProfile.id,
    loggerUserId: logger.id,
    loggerProfileId: loggerProfile.id,
    subjectUserId: subject.id,
    subjectProfileId: subjectProfile.id,
  }
}

describe("listEntriesForViewer obeys every visibility level", () => {
  it("shows weight, both timestamps and the recorder for weight-bearing visibilities", async () => {
    for (const visibility of ["weight_trend", "latest_only"] as const) {
      const fixture = await createAssemblerFixture(visibility)

      const views = await listEntriesForViewer({
        viewerProfileId: fixture.ownerProfileId,
        viewerUserId: fixture.ownerUserId,
        subjectProfileId: fixture.subjectProfileId,
      })

      expect(views).toHaveLength(1)
      expect(views[0].weightVisible).toBe(true)
      expect(views[0].weightKg).toBe(81.3)
      expect(views[0].measuredAt).toEqual(new Date("2026-11-06T03:00:00Z"))
      expect(views[0].recordedAt).toEqual(new Date("2026-11-06T09:30:00Z"))
      expect(views[0].recordedByName).toBe("Ana")
      expect(views[0].note).toBeNull()
    }
  })

  it("shows the day and the recorder but never the number for name_only", async () => {
    const fixture = await createAssemblerFixture("name_only")

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(views).toHaveLength(1)
    expect(views[0].weightVisible).toBe(false)
    expect(views[0].weightKg).toBeNull()
    expect(views[0].measuredAt).toEqual(new Date("2026-11-06T03:00:00Z"))
    expect(views[0].recordedByName).toBe("Ana")
  })

  it("shows nothing at all about a private subject to their group", async () => {
    const fixture = await createAssemblerFixture("private")

    const ownerViews = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })
    expect(ownerViews).toHaveLength(0)

    const groupOverview = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      groupId: fixture.groupId,
    })
    expect(groupOverview.some((view) => view.profileId === fixture.subjectProfileId)).toBe(false)
  })

  it("strips the private note of another author at every visibility level", async () => {
    for (const visibility of GROUP_VISIBILITIES) {
      const fixture = await createAssemblerFixture(visibility)

      for (const [viewerProfileId, viewerUserId] of [
        [fixture.ownerProfileId, fixture.ownerUserId],
        [fixture.subjectProfileId, fixture.subjectUserId],
      ] as const) {
        const views = await listEntriesForViewer({
          viewerProfileId,
          viewerUserId,
          subjectProfileId: fixture.subjectProfileId,
        })

        expect(views.every((view) => view.note === null)).toBe(true)
      }
    }
  })

  it("renders the note only for the author, even with lower visibility", async () => {
    const fixture = await createAssemblerFixture("weight_trend")

    const authorViews = await listEntriesForViewer({
      viewerProfileId: fixture.loggerProfileId,
      viewerUserId: fixture.loggerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(authorViews).toHaveLength(1)
    expect(authorViews[0].note).toBe("Turno de las ocho.")
  })

  it("shows the subject their whole history with the weight, whoever recorded it", async () => {
    const fixture = await createAssemblerFixture("weight_trend")

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.subjectProfileId,
      viewerUserId: fixture.subjectUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(views).toHaveLength(1)
    expect(views[0].weightKg).toBe(81.3)
    expect(views[0].recordedByName).toBe("Ana")
    expect(views[0].note).toBeNull()
  })

  it("never grants a read through the write: a recorder of a hidden subject reads nothing", async () => {
    const fixture = await createAssemblerFixture("private")

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.loggerProfileId,
      viewerUserId: fixture.loggerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(views).toHaveLength(0)
  })

  it("applies each group's own visibility when a subject belongs to several groups", async () => {
    const owner = await createTestUser("Dueña")
    const subject = await createTestUser("Pezadora")
    createdUsers.push(owner, subject)

    const ownerProfile = await createTestProfile(owner, { displayName: "Nina" })
    const subjectProfile = await createTestProfile(subject, { displayName: "Luis" })
    createdProfileIds.push(ownerProfile.id, subjectProfile.id)

    const groupVisible = await createTestGroup(owner, ownerProfile, "Casa")
    const groupHidden = await createTestGroup(owner, ownerProfile, "Trabajo")
    createdGroups.push(groupVisible, groupHidden)
    await addTestGroupMember(groupVisible, subjectProfile.id, "member")
    await addTestGroupMember(groupHidden, subjectProfile.id, "member")
    await setVisibility(groupHidden, subjectProfile.id, "private")

    await createEntry({
      groupId: groupVisible,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: ownerProfile.id,
      actingUserId: owner.id,
      entryId: "00000000-0000-4000-8000-000000000103",
      weightKg: 80,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    })

    await createEntry({
      groupId: groupHidden,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: ownerProfile.id,
      actingUserId: owner.id,
      entryId: "00000000-0000-4000-8000-000000000104",
      weightKg: 81,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    })

    const views = await listEntriesForViewer({
      viewerProfileId: ownerProfile.id,
      viewerUserId: owner.id,
    })

    expect(views).toHaveLength(1)
    expect(views.every((view) => view.profileId === subjectProfile.id)).toBe(true)

    const hiddenGroupViews = await listEntriesForViewer({
      viewerProfileId: ownerProfile.id,
      viewerUserId: owner.id,
      groupId: groupHidden,
    })

    expect(hiddenGroupViews).toHaveLength(0)
  })

  it("orders by measured day, newest first", async () => {
    const fixture = await createAssemblerFixture("weight_trend")

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.subjectProfileId,
      loggerProfileId: fixture.ownerProfileId,
      actingUserId: fixture.ownerUserId,
      entryId: "00000000-0000-4000-8000-000000000105",
      weightKg: 82,
      measuredAt: new Date("2026-11-05T03:00:00Z"),
      recordedAt: new Date("2026-11-05T09:30:00Z"),
    })

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(views).toHaveLength(2)
    expect(views[0].weightKg).toBe(81.3)
    expect(views[1].weightKg).toBe(82)
  })

  it("never shows one group's entries to a viewer from another group", async () => {
    const outsideOwner = await createTestUser("Otra dueña")
    const outsideMember = await createTestUser("Miembro ajeno")
    createdUsers.push(outsideOwner, outsideMember)
    const fixture = await createAssemblerFixture("weight_trend")

    const outsideProfile = await createTestProfile(outsideOwner)
    const outsiderProfile = await createTestProfile(outsideMember)
    createdProfileIds.push(outsideProfile.id, outsiderProfile.id)
    const outsideGroup = await createTestGroup(outsideOwner, outsideProfile, "Otra casa")
    createdGroups.push(outsideGroup)
    await addTestGroupMember(outsideGroup, outsiderProfile.id, "member")

    await createEntry({
      groupId: outsideGroup,
      subjectProfileId: outsiderProfile.id,
      loggerProfileId: outsiderProfile.id,
      actingUserId: outsideMember.id,
      entryId: "00000000-0000-4000-8000-000000000106",
      weightKg: 70,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    })

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
    })

    expect(views.every((view) => view.profileId !== outsiderProfile.id)).toBe(true)
  })
})

describe("listEntriesForViewer day scoping", () => {
  it("scopes the sheet overview to the measured day in the group's timezone", async () => {
    const fixture = await createAssemblerFixture("weight_trend")

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.subjectProfileId,
      loggerProfileId: fixture.ownerProfileId,
      actingUserId: fixture.ownerUserId,
      entryId: "00000000-0000-4000-8000-000000000107",
      weightKg: 82,
      measuredAt: new Date("2026-11-05T03:00:00Z"),
      recordedAt: new Date("2026-11-05T09:30:00Z"),
    })

    const todayViews = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      groupId: fixture.groupId,
      measuredOn: "2026-11-06",
      measuredOnTimeZone: "UTC",
    })

    expect(todayViews).toHaveLength(1)
    expect(todayViews[0].weightKg).toBe(81.3)
  })

  it("excludes deleted entries and leaves no placeholder behind", async () => {
    const fixture = await createAssemblerFixture("weight_trend")

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.subjectProfileId,
      loggerProfileId: fixture.ownerProfileId,
      actingUserId: fixture.ownerUserId,
      entryId: "00000000-0000-4000-8000-000000000108",
      weightKg: 82,
      measuredAt: new Date("2026-11-05T03:00:00Z"),
      recordedAt: new Date("2026-11-05T09:30:00Z"),
    })

    const deleteResult = await deleteEntry({
      entryId: "00000000-0000-4000-8000-000000000108",
      actingUserId: fixture.ownerUserId,
      actingProfileId: fixture.ownerProfileId,
    })

    expect(deleteResult.ok).toBe(true)

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(views).toHaveLength(1)
    expect(views.some((view) => view.id === "00000000-0000-4000-8000-000000000108")).toBe(false)
  })

  it("names a recorder whose login was deleted, flagged as legacy", async () => {
    const fixture = await createAssemblerFixture("weight_trend")

    await deleteTestUserById(fixture.loggerUserId)

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(views).toHaveLength(1)
    expect(views[0].recordedByName).toBe("Ana")
    expect(views[0].recordedByIsLegacy).toBe(true)
  })
})

async function deleteTestUserById(userId: string): Promise<void> {
  const createdIndex = createdUsers.findIndex((testUser) => testUser.id === userId)

  if (createdIndex >= 0) {
    createdUsers.splice(createdIndex, 1)
  }

  await db.delete(user).where(eq(user.id, userId))
}
