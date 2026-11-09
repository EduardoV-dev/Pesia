import { afterEach, describe, expect, it } from "vitest"

import { readFileSync, readdirSync, statSync } from "node:fs"
import { randomUUID } from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, groupSettings, profiles } from "@/db/schema"
import { assembleGroupBoard } from "@/features/board/server/assemble-board"
import { currentMonthPeriod, previousMonthPeriod } from "@/features/awards/period"
import { computeGroupAwardClaims } from "@/features/awards/server/award-compute"
import { listAwardClaimsForPeriod } from "@/features/awards/server/award-reads"
import { saveAwardClaims } from "@/features/awards/server/award-writes"
import { createEntry } from "@/features/entries/server/entry-writes"
import { instantWithNowTimeOfDay } from "@/features/entries/entry-format"
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

const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000)

async function setVisibility(
  groupId: string,
  profileId: string,
  visibility: "weight_trend" | "latest_only" | "name_only" | "private",
): Promise<void> {
  await db
    .update(groupMemberships)
    .set({ visibility })
    .where(
      and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, profileId)),
    )
}

async function resetCadence(groupId: string, profileId: string, cadenceDays: number | null): Promise<void> {
  await db
    .update(groupMemberships)
    .set({ cadenceDays })
    .where(
      and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, profileId)),
    )
}

async function setProfileDependent(profileId: string): Promise<void> {
  await db.update(profiles).set({ isDependent: true }).where(eq(profiles.id, profileId))
}

async function recordEntry(params: {
  readonly groupId: string
  readonly subjectProfileId: string
  readonly loggerProfileId: string
  readonly actingUserId: string
  readonly weightKg: number
  readonly measuredAt: Date
}): Promise<void> {
  const result = await createEntry({
    groupId: params.groupId,
    subjectProfileId: params.subjectProfileId,
    loggerProfileId: params.loggerProfileId,
    actingUserId: params.actingUserId,
    entryId: randomUUID(),
    weightKg: params.weightKg,
    measuredAt: params.measuredAt,
    recordedAt: new Date(),
  })

  if (!result.ok) {
    throw new Error(`Seeded entry failed: ${result.errorMessage}`)
  }
}

/** A family with one stale entry per subject: ten days old against a weekly rhythm. */
const STALE_AGE_DAYS = 10
const STALE_WEIGHT_KG = 64

type StaleFixture = {
  readonly groupId: string
  owner: { readonly userId: string; readonly profileId: string }
  readonly subjects: {
    readonly named: string
    readonly privateMember: string
    readonly dependent: string
    readonly optedOut: string
    readonly cadenceless: string
  }
}

async function createStaleFixture(removeSettings: boolean): Promise<StaleFixture> {
  const ownerUser = await createTestUser("Dueña")
  createdUsers.push(ownerUser)
  const ownerProfile = await createTestProfile(ownerUser, { displayName: "Ana" })

  const groupId = await createTestGroup(ownerUser, ownerProfile)
  createdGroups.push(groupId)

  if (removeSettings) {
    await db.delete(groupSettings).where(eq(groupSettings.groupId, groupId))
  }

  const sharedUser = await createTestUser("Familiar de prueba")
  createdUsers.push(sharedUser)
  const named = await createTestManagedProfile(sharedUser, { displayName: "Belu" })
  const privateMember = await createTestManagedProfile(sharedUser, { displayName: "Misú" })
  const dependent = await createTestManagedProfile(sharedUser, { displayName: "Depu" })
  const optedOut = await createTestManagedProfile(sharedUser, { displayName: "Rosina" })
  const cadenceless = await createTestManagedProfile(sharedUser, { displayName: "Noiri" })

  for (const subject of [named, privateMember, dependent, optedOut, cadenceless]) {
    await addTestGroupMember(groupId, subject.id, "member")
    await recordEntry({
      groupId,
      subjectProfileId: subject.id,
      loggerProfileId: ownerProfile.id,
      actingUserId: ownerUser.id,
      weightKg: STALE_WEIGHT_KG,
      measuredAt: daysAgo(STALE_AGE_DAYS),
    })
  }

  await setVisibility(groupId, privateMember.id, "private")
  await setProfileDependent(dependent.id)
  await db
    .update(groupMemberships)
    .set({ rankingOptOut: true })
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, optedOut.id)))
  if (!removeSettings) {
    await resetCadence(groupId, named.id, 7)
    await resetCadence(groupId, privateMember.id, 7)
    await resetCadence(groupId, dependent.id, 7)
    await resetCadence(groupId, optedOut.id, 7)
  }

  return {
    groupId,
    owner: { userId: ownerUser.id, profileId: ownerProfile.id },
    subjects: {
      named: named.id,
      privateMember: privateMember.id,
      dependent: dependent.id,
      optedOut: optedOut.id,
      cadenceless: cadenceless.id,
    },
  }
}

function cardsOf(payload: Awaited<ReturnType<typeof assembleGroupBoard>>) {
  return new Map(
    (payload?.members ?? []).flatMap((card) =>
      "profileId" in card ? [[card.profileId, card] as const] : [],
    ),
  )
}

describe("assembleGroupBoard due state rules (G7/G8)", () => {
  it("a private member and a dependent never carry a due state, while hidden members are omitted", async () => {
    const fixture = await createStaleFixture(false)
    const payload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })

    const cards = cardsOf(payload)

    // The named member's turn is due and honest.
    expect((cards.get(fixture.subjects.named) as { isDue: boolean }).isDue).toBe(true)
    expect(
      (cards.get(fixture.subjects.optedOut) as { isDue: boolean; rankingOptOut: boolean }),
    ).toEqual(
      expect.objectContaining({ isDue: true, rankingOptOut: true }),
    )

    // Dependents never self-report a turn (G7/G9).
    expect("isDue" in (cards.get(fixture.subjects.dependent) ?? {})).toBe(false)

    // The private member owns no card at all, in no payload (G8).
    expect(cards.has(fixture.subjects.privateMember)).toBe(false)
    expect((payload?.members ?? []).filter((card) => card.kind === "private")).toHaveLength(1)
  })

  it("an undetectable cadence never marks anyone due", async () => {
    const fixture = await createStaleFixture(true)
    const payload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })

    const cards = cardsOf(payload)

    expect((cards.get(fixture.subjects.named) as { isDue: boolean }).isDue).toBe(false)
    expect((cards.get(fixture.subjects.cadenceless) as { isDue: boolean }).isDue).toBe(false)
  })
})

/** Translates the fixture's real group timezone, matching `createGroup`'s seed. */
const hostTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

describe("assembleGroupBoard payload shape (G1/US-6.10)", () => {
  it("the payload carries no ordinal field nor cross-member magnitude comparison", async () => {
    const fixture = await createStaleFixture(false)
    const currentPeriod = currentMonthPeriod(hostTimeZone)

    await saveAwardClaims({
      groupId: fixture.groupId,
      profileId: fixture.subjects.named,
      types: ["most_consistent"],
      ...currentPeriod,
    })

    const payload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })

    expect(payload).not.toBeNull()
    const serialized = JSON.stringify(payload)
    const forbiddenKeys = ["rank", "rankPosition", "ordinal", "position", "place", "percentile"]
    const payloadKeys = new Set(payload?.members.map((card) => Object.keys(card)).flat() ?? [])

    for (const forbiddenKey of forbiddenKeys) {
      expect(payloadKeys.has(forbiddenKey), `payload field ${forbiddenKey} exists`).toBe(false)
    }

    for (const card of payload?.members ?? []) {
      expect(Object.keys(card)).not.toContain("isBest")
      expect(Object.keys(card)).not.toContain("mostMoved")
    }

    // The consistency strip is behaviour-only data.
    expect(payload?.consistencyStrip).toHaveLength(1)
    expect(payload?.consistencyStrip[0]).toHaveProperty("profileId")
    expect(payload?.consistencyStrip[0]?.awardTypes).toEqual(["most_consistent"])
    expect(serialized).not.toContain("biggest_change")
  })

  it("strip order runs awarded members first and never puts progress into an order", async () => {
    const fixture = await createStaleFixture(false)
    const currentPeriod = currentMonthPeriod(hostTimeZone)

    await saveAwardClaims({
      groupId: fixture.groupId,
      profileId: fixture.subjects.dependent,
      types: ["perfect_month"],
      ...currentPeriod,
    })
    await saveAwardClaims({
      groupId: fixture.groupId,
      profileId: fixture.subjects.named,
      types: ["comeback_kid"],
      ...currentPeriod,
    })

    const payload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })

    const cardByProfileId = cardsOf(payload)
    const orderedProfileIds = (payload?.members ?? [])
      .flatMap((card) => ("profileId" in card ? [card.profileId] : []))
      .filter((profileId) => profileId === fixture.subjects.named || profileId === fixture.subjects.dependent)

    // The dependent never enters the strip (G9); the named member does.
    expect(payload?.consistencyStrip.map((row) => row.profileId)).toEqual([fixture.subjects.named])
    expect(orderedProfileIds[0]).toBe(fixture.subjects.named)
    expect(cardByProfileId.get(fixture.subjects.dependent)?.kind).toBe("dependent")
  })
})

describe("board payload privacy keys (G4/G9 — epic 8 audit)", () => {
  it("no card carries BMI for a member who opted in, and a dependent card carries no target, progress or rank", async () => {
    const fixture = await createStaleFixture(false)

    // The dependent's BMI is on and their height stored: even so, no board
    // response may carry BMI for them or for anyone (G4).
    await db
      .update(profiles)
      .set({ bmiEnabled: true, heightCm: 120 })
      .where(eq(profiles.id, fixture.subjects.dependent))
    await db
      .update(profiles)
      .set({ bmiEnabled: true, heightCm: 170 })
      .where(eq(profiles.id, fixture.subjects.named))

    const payload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })

    expect(payload).not.toBeNull()
    const serialized = JSON.stringify(payload)
    const forbiddenKeys = ["bmi", "bmiValue", "heightCm", "target", "targetWeightKg", "progressPercentage"]

    for (const forbiddenKey of forbiddenKeys) {
      expect(serialized).not.toContain(`"${forbiddenKey}"`)
    }

    const dependentCard = cardsOf(payload).get(fixture.subjects.dependent)

    expect(dependentCard?.kind).toBe("dependent")

    for (const forbiddenKey of ["progress", "sparkline", "awardTypes", "isDue", "rankingOptOut"]) {
      expect(Object.keys(dependentCard ?? {})).not.toContain(forbiddenKey)
    }
  })
})

describe("board modules architecture (task 2.7)", () => {  const boardRoot = fileURLToPath(new URL("..", import.meta.url))

  const listFiles = (directory: string): string[] =>
    readdirSync(directory)
      .filter((entry) => !entry.startsWith(".") && entry !== "node_modules")
      .flatMap((entry) => {
        const full = path.join(directory, entry)

        return statSync(full).isDirectory() ? listFiles(full) : full
      })

  it("every board module reading entries or the database imports server-only", () => {
    const files = listFiles(boardRoot).filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))

    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const text = readFileSync(file, "utf8")
      const readsEntryData =
        text.includes(`from "@/db/client"`) ||
        text.includes(`from "@/features/entries/server/entry-access"`)

      if (readsEntryData) {
        expect(text.includes(`import "server-only"`), `${file} reads data without server-only`).toBe(true)
      }
    }
  })

  it("the assembler is the only board module wired to the filtered entries read", () => {
    const assemblerPath = path.join(boardRoot, "server", "assemble-board.ts")
    const assembler = readFileSync(assemblerPath, "utf8")

    expect(assembler.includes(`import "server-only"`)).toBe(true)
    expect(
      filesIn(boardRoot).filter(
        (file) =>
          file.endsWith(".ts") &&
          !file.endsWith(".test.ts") &&
          readFileSync(file, "utf8").includes(`from "@/features/entries/server/entry-access"`),
      ),
    ).toEqual([assemblerPath])

    const payloadPath = path.join(boardRoot, "board-payload.ts")
    const payloadTypes = readFileSync(payloadPath, "utf8")

    expect(payloadTypes.includes(`@/db/`)).toBe(false)
    expect(payloadTypes.includes(`@/features/entries/server/`)).toBe(false)
  })
})

describe("lazy award catch-up on board read (task 3.4)", () => {
  /** Same translation the group writes use: the group's timezone is the host's. */
  const hostTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

  async function createCatchUpFixture(): Promise<{
    readonly groupId: string
    readonly owner: { readonly userId: string; readonly profileId: string }
    readonly previousPeriod: ReturnType<typeof previousMonthPeriod>
  }> {
    const ownerUser = await createTestUser("Dueña")
    createdUsers.push(ownerUser)
    const ownerProfile = await createTestProfile(ownerUser, { displayName: "Ana" })
    const groupId = await createTestGroup(ownerUser, ownerProfile)
    createdGroups.push(groupId)

    const previousPeriod = previousMonthPeriod(hostTimeZone)

    // Weigh-ins from the previous month, before any board read happens.
    for (const dayOffset of [3, 10]) {
      const dayKey = new Date(
        Date.parse(`${previousPeriod.periodStart}T00:00:00Z`) + dayOffset * 86_400_000,
      )
        .toISOString()
        .slice(0, 10)
      const result = await createEntry({
        groupId,
        subjectProfileId: ownerProfile.id,
        loggerProfileId: ownerProfile.id,
        actingUserId: ownerUser.id,
        entryId: randomUUID(),
        weightKg: 60 + dayOffset,
        measuredAt: instantWithNowTimeOfDay(dayKey, hostTimeZone),
        recordedAt: new Date(),
      })

      if (!result.ok) {
        throw new Error(`Seeded entry failed: ${result.errorMessage}`)
      }
    }

    return { groupId, owner: { userId: ownerUser.id, profileId: ownerProfile.id }, previousPeriod }
  }

  async function assembleFor(fixture: Awaited<ReturnType<typeof createCatchUpFixture>>) {
    return assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })
  }

  it("a previous month nobody computed is computed once the board opens", async () => {
    const fixture = await createCatchUpFixture()

    await assembleFor(fixture)

    const claims = await listAwardClaimsForPeriod(fixture.groupId, fixture.previousPeriod.periodStart)

    expect(claims.length).toBeGreaterThanOrEqual(1)
  })

  it("a previous month with claims is left untouched by the board read", async () => {
    const fixture = await createCatchUpFixture()

    await computeGroupAwardClaims({
      groupId: fixture.groupId,
      periodStart: fixture.previousPeriod.periodStart,
      periodEnd: fixture.previousPeriod.periodEnd,
      computedByUserId: fixture.owner.userId,
    })

    const claimsBefore = await listAwardClaimsForPeriod(fixture.groupId, fixture.previousPeriod.periodStart)

    await assembleFor(fixture)

    const claimsAfter = await listAwardClaimsForPeriod(fixture.groupId, fixture.previousPeriod.periodStart)

    expect(claimsAfter.map((claim) => claim.id).sort()).toEqual(
      claimsBefore.map((claim) => claim.id).sort(),
    )
  })
})

function filesIn(directory: string): string[] {
  return readdirSync(directory)
    .filter((entry) => !entry.startsWith(".") && entry !== "node_modules")
    .flatMap((entry) => {
      const full = path.join(directory, entry)

      return statSync(full).isDirectory() ? filesIn(full) : full
    })
}
