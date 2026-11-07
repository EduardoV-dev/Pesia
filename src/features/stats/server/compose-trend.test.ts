import { afterEach, describe, expect, it } from "vitest"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships } from "@/db/schema"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { createEntry } from "@/features/entries/server/entry-writes"
import { composeTrend } from "../compose-trend"
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

const FIRST_DAY = Date.parse("2026-01-01T00:00:00Z")
const MILLISECONDS_PER_DAY = 86_400_000

type CompositionFixture = {
  readonly groupId: string
  readonly ownerUserId: string
  readonly ownerProfileId: string
  readonly subjectUserId: string
  readonly subjectProfileId: string
}

/** Two weigh-ins a month apart, enough to draw a line on the trend. */
async function createCompositionFixture(
  subjectVisibility: "weight_trend" | "private",
): Promise<CompositionFixture> {
  const owner = await createTestUser("Dueña")
  const subject = await createTestUser("Pesada")
  createdUsers.push(owner, subject)

  const ownerProfile = await createTestProfile(owner, { displayName: "Nina" })
  const subjectProfile = await createTestProfile(subject, { displayName: "Luis" })
  createdProfileIds.push(ownerProfile.id, subjectProfile.id)

  const groupId = await createTestGroup(owner, ownerProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, subjectProfile.id, "member")
  await setVisibility(groupId, subjectProfile.id, subjectVisibility)

  for (const [day, weightKg] of [
    [0, 80],
    [28, 78],
  ] as const) {
    await createEntry({
      groupId,
      subjectProfileId: subjectProfile.id,
      loggerProfileId: ownerProfile.id,
      actingUserId: owner.id,
      entryId: `00000000-0000-4000-8000-0000000001${String(day).padStart(2, "0")}`,
      weightKg,
      measuredAt: new Date(FIRST_DAY + day * MILLISECONDS_PER_DAY),
      recordedAt: new Date(FIRST_DAY + day * MILLISECONDS_PER_DAY + 6 * 3600_000),
    })
  }

  return {
    groupId,
    ownerUserId: owner.id,
    ownerProfileId: ownerProfile.id,
    subjectUserId: subject.id,
    subjectProfileId: subjectProfile.id,
  }
}

async function setVisibility(
  groupId: string,
  profileId: string,
  visibility: "weight_trend" | "private",
): Promise<void> {
  await db
    .update(groupMemberships)
    .set({ visibility })
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, profileId)))
}

describe("composeTrend over the server-side assembler", () => {
  it("composes the member's own trend from the filtered read (G10)", async () => {
    const fixture = await createCompositionFixture("weight_trend")

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.subjectProfileId,
      viewerUserId: fixture.subjectUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    const trend = composeTrend({
      views,
      goal: null,
      timeZone: "UTC",
      bmiEnabled: false,
      heightCm: null,
    })

    expect(trend.readings).toHaveLength(2)
    expect(trend.pctChange).not.toBeNull()
    expect(trend.readings.map((reading) => reading.weightKg)).toEqual([80, 78])
  })

  it("answers a viewer with no standing with an empty trend, never with weights", async () => {
    const fixture = await createCompositionFixture("private")

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    const trend = composeTrend({
      views,
      goal: null,
      timeZone: "UTC",
      bmiEnabled: true,
      heightCm: 170,
    })

    expect(trend.readings).toHaveLength(0)
    expect(trend.pctChange).toBeNull()
    expect(trend.baselineKg).toBeNull()
    expect(trend.bmi).toBeNull()
  })

  it("keeps goal math, progress and BMI out of every EntryView (G10)", async () => {
    const fixture = await createCompositionFixture("weight_trend")

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.subjectProfileId,
      viewerUserId: fixture.subjectUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(views.length).toBeGreaterThan(0)

    for (const view of views) {
      expect("progress" in view).toBe(false)
      expect("goal" in view).toBe(false)
      expect("bmi" in view).toBe(false)
      expect("direction" in view).toBe(false)
    }
  })
})
