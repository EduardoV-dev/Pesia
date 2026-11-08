import { afterEach, describe, expect, it } from "vitest"

import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { awardClaims } from "@/db/schema"
import type { BoardMemberCard } from "@/features/board/board-payload"
import { assembleGroupBoard } from "@/features/board/server/assemble-board"
import { createEntry } from "@/features/entries/server/entry-writes"
import { instantWithNowTimeOfDay } from "@/features/entries/entry-format"
import { currentMonthPeriod } from "@/features/awards/period"
import { computeGroupAwardClaims } from "./award-compute"
import { setClaimPublication } from "./award-writes"
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

/** Same translation the group writes use: the group's timezone is the host's. */
const hostTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000)

/** Seeds a weigh-in in its own day key, clamped into the current period, via the real write path. */
async function seedEntry(params: {
  readonly groupId: string
  readonly subjectProfileId: string
  readonly loggerProfileId: string
  readonly actingUserId: string
  readonly weightKg: number
  readonly daysBack: number
}): Promise<void> {
  const period = currentMonthPeriod(hostTimeZone)
  const pastDayKey = daysAgo(params.daysBack).toISOString().slice(0, 10)
  const clampedDayKey = pastDayKey < period.periodStart ? period.periodStart : pastDayKey

  const result = await createEntry({
    groupId: params.groupId,
    subjectProfileId: params.subjectProfileId,
    loggerProfileId: params.loggerProfileId,
    actingUserId: params.actingUserId,
    entryId: randomUUID(),
    weightKg: params.weightKg,
    measuredAt: instantWithNowTimeOfDay(clampedDayKey, hostTimeZone),
    recordedAt: new Date(),
  })

  if (!result.ok) {
    throw new Error(`Seeded entry failed: ${result.errorMessage}`)
  }
}

type ComputeFixture = {
  readonly groupId: string
  readonly owner: { readonly userId: string; readonly profileId: string }
  /** The login that manages the member profiles: the member's "family". */
  readonly manager: { readonly userId: string }
  readonly nina: string
  readonly fede: string
}

async function createAwardFixture(): Promise<ComputeFixture> {
  const ownerUser = await createTestUser("Dueña")
  const sessionUser = await createTestUser("Familiar de prueba")
  createdUsers.push(ownerUser, sessionUser)
  const ownerProfile = await createTestProfile(ownerUser, { displayName: "Ana" })
  const groupId = await createTestGroup(ownerUser, ownerProfile)
  createdGroups.push(groupId)

  const nina = await createTestManagedProfile(sessionUser, { displayName: "Nina" })
  const fede = await createTestManagedProfile(sessionUser, { displayName: "Fede" })
  await addTestGroupMember(groupId, nina.id, "member")
  await addTestGroupMember(groupId, fede.id, "member")

  await Promise.all([
    seedEntry({ groupId, subjectProfileId: nina.id, loggerProfileId: ownerProfile.id, actingUserId: ownerUser.id, weightKg: 70, daysBack: 9 }),
    seedEntry({ groupId, subjectProfileId: nina.id, loggerProfileId: ownerProfile.id, actingUserId: ownerUser.id, weightKg: 80.5, daysBack: 2 }),
    seedEntry({ groupId, subjectProfileId: fede.id, loggerProfileId: ownerProfile.id, actingUserId: ownerUser.id, weightKg: 50, daysBack: 9 }),
    seedEntry({ groupId, subjectProfileId: fede.id, loggerProfileId: ownerProfile.id, actingUserId: ownerUser.id, weightKg: 53, daysBack: 8 }),
  ])

  return { groupId, owner: { userId: ownerUser.id, profileId: ownerProfile.id }, manager: { userId: sessionUser.id }, nina: nina.id, fede: fede.id }
}

async function compute(fixture: ComputeFixture): Promise<void> {
  const period = currentMonthPeriod(hostTimeZone)

  await computeGroupAwardClaims({
    groupId: fixture.groupId,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    computedByUserId: fixture.owner.userId,
  })
}

function cardsOf(payload: Awaited<ReturnType<typeof assembleGroupBoard>>) {
  return new Map(
    (payload?.members ?? []).flatMap((card) =>
      "profileId" in card ? [[card.profileId, card] as const] : [],
    ),
  )
}

const revealOf = (payload: Awaited<ReturnType<typeof assembleGroupBoard>>) => payload?.viewerReveal ?? null

/** Only cards whose grant shows the trend carry chips; anything else has none. */
function awardTypesOf(card: BoardMemberCard | undefined): readonly string[] {
  return card && "awardTypes" in card ? card.awardTypes : []
}

describe("computeGroupAwardClaims", () => {
  it("stores the period's claims through the real write path", async () => {
    const fixture = await createAwardFixture()
    await compute(fixture)

    const period = currentMonthPeriod(hostTimeZone)
    const claims = await db
      .select()
      .from(awardClaims)
      .where(
        and(
          eq(awardClaims.groupId, fixture.groupId),
          eq(awardClaims.profileId, fixture.nina),
          eq(awardClaims.periodStart, period.periodStart),
        ),
      )
    const claimTypes = claims.map((claim) => claim.awardType)

    // The movement reveal is guaranteed by the seeded weights; consistency
    // claims follow the pure engine, whose math has its own suite.
    expect(claimTypes.length).toBeGreaterThanOrEqual(1)
    expect(claimTypes).toContain("biggest_change")
    for (const claimType of claimTypes) {
      expect(claimType).not.toBe(null)
    }
  })

  it("the reveal exists exactly once, for the member it is about (US-6.6)", async () => {
    const fixture = await createAwardFixture()
    await compute(fixture)

    const ninaPayload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.nina,
      viewerUserId: fixture.owner.userId,
    })
    const fedePayload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.fede,
      viewerUserId: fixture.owner.userId,
    })
    const ownerPayload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })

    expect(revealOf(ninaPayload)).toEqual(
      expect.objectContaining({ isPublic: false }),
    )
    expect(revealOf(fedePayload)).toBeNull()
    expect(revealOf(ownerPayload)).toBeNull()

    expect(awardTypesOf(cardsOf(ninaPayload).get(fixture.nina))).not.toContain("biggest_change")
  })

  it("a tie leaves no winner, so no reveal exists for anyone", async () => {
    const fixture = await createAwardFixture()
    await seedEntry({ groupId: fixture.groupId, subjectProfileId: fixture.owner.profileId, loggerProfileId: fixture.owner.profileId, actingUserId: fixture.owner.userId, weightKg: 60, daysBack: 9 })
    await seedEntry({ groupId: fixture.groupId, subjectProfileId: fixture.owner.profileId, loggerProfileId: fixture.owner.profileId, actingUserId: fixture.owner.userId, weightKg: 70.5, daysBack: 2 })
    await compute(fixture)

    const ninaPayload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.nina,
      viewerUserId: fixture.owner.userId,
    })

    // Both moved 10.5: nobody "moved the most", so no claim exists anywhere.
    expect(revealOf(ninaPayload)).toBeNull()
  })

  it("a recompute hands the crown to whoever moved most now, removing the stale claim", async () => {
    const fixture = await createAwardFixture()
    await compute(fixture)
    await seedEntry({ groupId: fixture.groupId, subjectProfileId: fixture.fede, loggerProfileId: fixture.owner.profileId, actingUserId: fixture.owner.userId, weightKg: 53, daysBack: 1 })
    await seedEntry({ groupId: fixture.groupId, subjectProfileId: fixture.fede, loggerProfileId: fixture.owner.profileId, actingUserId: fixture.owner.userId, weightKg: 65, daysBack: 0 })
    await compute(fixture)

    const period = currentMonthPeriod(hostTimeZone)
    const claimsRows = await db
      .select()
      .from(awardClaims)
      .where(
        and(
          eq(awardClaims.groupId, fixture.groupId),
          eq(awardClaims.periodStart, period.periodStart),
          eq(awardClaims.awardType, "biggest_change"),
        ),
      )

    expect(claimsRows).toHaveLength(1)
    expect(claimsRows[0]?.profileId).toBe(fixture.fede)
  })
})

describe("setClaimPublication (US-6.7)", () => {
  it("publishes and unpublishes the member's own reveal, and nobody else's", async () => {
    const fixture = await createAwardFixture()
    await compute(fixture)

    const period = currentMonthPeriod(hostTimeZone)
    const [reveal] = await db
      .select()
      .from(awardClaims)
      .where(
        and(
          eq(awardClaims.groupId, fixture.groupId),
          eq(awardClaims.profileId, fixture.nina),
          eq(awardClaims.periodStart, period.periodStart),
          eq(awardClaims.awardType, "biggest_change"),
        ),
      )

    expect(reveal).toBeDefined()
    const claimId = reveal?.id as string

    const published = await setClaimPublication(fixture.manager.userId, fixture.nina, {
      claimId,
      shared: true,
    })

    expect(published.ok).toBe(true)

    const fedePayload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.fede,
      viewerUserId: fixture.owner.userId,
    })

    // Every viewer who sees her name can see the published badge on her card.
    expect(awardTypesOf(cardsOf(fedePayload).get(fixture.nina))).toContain("biggest_change")

    const unpublished = await setClaimPublication(fixture.manager.userId, fixture.nina, {
      claimId,
      shared: false,
    })

    expect(unpublished.ok).toBe(true)

    const fedePayloadAfterUnpublish = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.fede,
      viewerUserId: fixture.owner.userId,
    })

    expect(awardTypesOf(cardsOf(fedePayloadAfterUnpublish).get(fixture.nina))).not.toContain("biggest_change")

    const stranger = await setClaimPublication(fixture.owner.userId, fixture.fede, {
      claimId,
      shared: true,
    })

    if (stranger.ok) {
      throw new Error("Another profile's claim was published.")
    }

    expect(stranger.code).toBe("not_own_claim")
  })
})
