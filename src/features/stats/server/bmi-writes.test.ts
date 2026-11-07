import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, profileManagers, profiles } from "@/db/schema"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { createEntry } from "@/features/entries/server/entry-writes"
import { saveBmiReference } from "@/features/stats/server/bmi-writes"
import { composeTrend } from "@/features/stats/compose-trend"
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
const createdGroupIds: string[] = []
const createdProfileIds: string[] = []

afterEach(async () => {
  for (const groupId of createdGroupIds.splice(0)) {
    await deleteTestGroup(groupId)
  }

  for (const profileId of createdProfileIds.splice(0)) {
    await deleteTestProfile(profileId)
  }

  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

const FIRST_DAY = Date.parse("2026-01-01T00:00:00Z")
const MILLISECONDS_PER_DAY = 86_400_000

type BmiFixture = {
  readonly groupId: string
  readonly ownerUserId: string
  readonly ownerProfileId: string
  readonly subject: TestUser
  readonly subjectProfileId: string
}

/** Owner, subject and one weigh-in recorded by the owner into a shared group. */
async function createBmiFixture(): Promise<BmiFixture> {
  const owner = await createTestUser("Dueña")
  const subject = await createTestUser("Pesada")
  createdUsers.push(owner, subject)

  const ownerProfile = await createTestProfile(owner, { displayName: "Nina" })
  const subjectProfile = await createTestProfile(subject, { displayName: "Luis" })
  createdProfileIds.push(ownerProfile.id, subjectProfile.id)

  const groupId = await createTestGroup(owner, ownerProfile)
  createdGroupIds.push(groupId)
  await addTestGroupMember(groupId, subjectProfile.id, "member")

  await createEntry({
    groupId,
    subjectProfileId: subjectProfile.id,
    loggerProfileId: ownerProfile.id,
    actingUserId: owner.id,
    entryId: "00000000-0000-4000-8000-0000000001f0",
    weightKg: 78,
    measuredAt: new Date(FIRST_DAY + 28 * MILLISECONDS_PER_DAY),
    recordedAt: new Date(FIRST_DAY + 28 * MILLISECONDS_PER_DAY + 6 * 3600_000),
  })

  return {
    groupId,
    ownerUserId: owner.id,
    ownerProfileId: ownerProfile.id,
    subject,
    subjectProfileId: subjectProfile.id,
  }
}

type ManagerFixture = {
  readonly user: TestUser
  readonly ownProfileId: string
  readonly managedProfileId: string
  readonly dependentProfileId: string
}

/** A login with its own profile plus one standalone and one dependent managed profile. */
async function createManagerFixture(): Promise<ManagerFixture> {
  const user = await createTestUser("Nina")
  createdUsers.push(user)

  const ownProfile = await createTestProfile(user, { displayName: "Nina" })
  const managedProfile = await createTestManagedProfile(user, { displayName: "Ana" })
  const dependentProfile = await createTestManagedProfile(user, {
    displayName: "Lolo",
    isDependent: true,
  })
  createdProfileIds.push(ownProfile.id, managedProfile.id, dependentProfile.id)

  return {
    user,
    ownProfileId: ownProfile.id,
    managedProfileId: managedProfile.id,
    dependentProfileId: dependentProfile.id,
  }
}

async function storedProfile(profileId: string) {
  const [stored] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1)

  return stored ?? null
}

describe("saveBmiReference keeps BMI off until someone opts in (G4)", () => {
  it("stores no height and keeps the flag off for a new profile", async () => {
    const fixture = await createManagerFixture()

    const stored = await storedProfile(fixture.managedProfileId)

    expect(stored?.bmiEnabled).toBe(false)
    expect(stored?.heightCm).toBeNull()
  })

  it("stores the opt-in with the height for the login owner", async () => {
    const fixture = await createManagerFixture()

    const result = await saveBmiReference(fixture.user.id, fixture.ownProfileId, {
      bmiEnabled: true,
      heightCm: "170",
    })

    expect(result.ok).toBe(true)

    const stored = await storedProfile(fixture.ownProfileId)

    expect(stored?.bmiEnabled).toBe(true)
    expect(stored?.heightCm).toBe(170)
  })

  it("lets a manager toggle a profile without a login", async () => {
    const fixture = await createManagerFixture()

    const result = await saveBmiReference(fixture.user.id, fixture.managedProfileId, {
      bmiEnabled: true,
      heightCm: "165",
    })

    expect(result.ok).toBe(true)
  })
})

describe("saveBmiReference refuses what must not exist (G4, G9)", () => {
  it("refuses dependents altogether", async () => {
    const fixture = await createManagerFixture()

    const result = await saveBmiReference(fixture.user.id, fixture.dependentProfileId, {
      bmiEnabled: true,
      heightCm: "130",
    })

    expect(result).toEqual({
      ok: false,
      code: "dependent_profile",
      errorMessage: "Una persona a cargo no lleva referencia de IMC.",
    })
  })

  it("never lets a manager decide the BMI of a profile with a login", async () => {
    const fixture = await createManagerFixture()
    const outsider = await createTestUser("Ajena")
    createdUsers.push(outsider)

    await db
      .insert(profileManagers)
      .values({ profileId: fixture.ownProfileId, userId: outsider.id })

    const result = await saveBmiReference(outsider.id, fixture.ownProfileId, {
      bmiEnabled: true,
      heightCm: "170",
    })

    expect(result).toEqual({
      ok: false,
      code: "not_own_login",
      errorMessage: "Sólo la persona dueña del login puede cambiar este IMC.",
    })
  })

  it("refuses heights that are not positive integers up to 250", async () => {
    const fixture = await createManagerFixture()

    for (const heightCm of ["0", "-4", "300", "172.5", "abc"]) {
      const result = await saveBmiReference(fixture.user.id, fixture.ownProfileId, {
        bmiEnabled: true,
        heightCm,
      })

      expect(result.ok).toBe(false)
      expect(result.ok === false ? result.errorMessage : "").not.toBe("")
    }
  })

  it("refuses an opt-in without the height the value needs", async () => {
    const fixture = await createManagerFixture()

    const result = await saveBmiReference(fixture.user.id, fixture.ownProfileId, {
      bmiEnabled: true,
      heightCm: "",
    })

    expect(result).toMatchObject({ ok: false, code: "invalid_input" })
  })

  it("refuses a profile the caller does not manage", async () => {
    const stranger = await createTestUser("Ajena")
    createdUsers.push(stranger)
    const fixture = await createManagerFixture()

    const result = await saveBmiReference(stranger.id, fixture.ownProfileId, {
      bmiEnabled: true,
      heightCm: "170",
    })

    expect(result).toMatchObject({ ok: false, code: "not_managed" })
  })
})

describe("saveBmiReference opt-out", () => {
  it("hides the value at once and keeps the stored data private", async () => {
    const fixture = await createManagerFixture()

    await saveBmiReference(fixture.user.id, fixture.ownProfileId, {
      bmiEnabled: true,
      heightCm: "170",
    })

    const turnedOff = await saveBmiReference(fixture.user.id, fixture.ownProfileId, {
      bmiEnabled: false,
      heightCm: "",
    })

    expect(turnedOff.ok).toBe(true)

    const stored = await storedProfile(fixture.ownProfileId)

    expect(stored?.bmiEnabled).toBe(false)
    expect(stored?.heightCm).toBe(170)
  })
})

describe("the BMI toggle only changes what the member opted into", () => {
  it("stops composing the value once it is turned off", async () => {
    const fixture = await createBmiFixture()

    const optedIn = await saveBmiReference(fixture.subject.id, fixture.subjectProfileId, {
      bmiEnabled: true,
      heightCm: "170",
    })

    expect(optedIn.ok).toBe(true)

    const enabledProfile = await storedProfile(fixture.subjectProfileId)

    const views = await listEntriesForViewer({
      viewerProfileId: fixture.subjectProfileId,
      viewerUserId: fixture.subject.id,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(
      composeTrend({
        views,
        goal: null,
        timeZone: "UTC",
        bmiEnabled: enabledProfile?.bmiEnabled ?? false,
        heightCm: enabledProfile?.heightCm ?? null,
      }).bmi,
    ).not.toBeNull()

    const turnedOff = await saveBmiReference(fixture.subject.id, fixture.subjectProfileId, {
      bmiEnabled: false,
      heightCm: "",
    })

    expect(turnedOff.ok).toBe(true)

    const disabledProfile = await storedProfile(fixture.subjectProfileId)

    expect(
      composeTrend({
        views,
        goal: null,
        timeZone: "UTC",
        bmiEnabled: disabledProfile?.bmiEnabled ?? false,
        heightCm: disabledProfile?.heightCm ?? null,
      }).bmi,
    ).toBeNull()
  })

  it("never grants the toggle another read of any kind", async () => {
    const fixture = await createBmiFixture()

    await db
      .update(groupMemberships)
      .set({ visibility: "private" })
      .where(eq(groupMemberships.groupId, fixture.groupId))

    const enabled = await saveBmiReference(fixture.subject.id, fixture.subjectProfileId, {
      bmiEnabled: true,
      heightCm: "170",
    })

    expect(enabled.ok).toBe(true)

    const viewerViews = await listEntriesForViewer({
      viewerProfileId: fixture.ownerProfileId,
      viewerUserId: fixture.ownerUserId,
      subjectProfileId: fixture.subjectProfileId,
    })

    expect(viewerViews).toHaveLength(0)
  })
})
