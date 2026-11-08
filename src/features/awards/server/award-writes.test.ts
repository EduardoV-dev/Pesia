import { afterEach, describe, expect, it } from "vitest"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { awardClaims } from "@/db/schema"
import { saveAwardClaims } from "@/features/awards/server/award-writes"
import {
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

async function setup() {
  const testUser = await createTestUser()
  createdUsers.push(testUser)
  const profile = await createTestProfile(testUser)
  const groupId = await createTestGroup(testUser, profile)
  createdGroups.push(groupId)

  return { profile, groupId }
}

const PERIOD = { periodStart: "2026-01-01", periodEnd: "2026-01-31" }

describe("saveAwardClaims", () => {
  it("a repeated recompute does not duplicate claims for the same unique key", async () => {
    const { profile, groupId } = await setup()

    await saveAwardClaims({
      groupId,
      profileId: profile.id,
      types: ["most_consistent", "perfect_month"],
      ...PERIOD,
    })
    await saveAwardClaims({
      groupId,
      profileId: profile.id,
      types: ["most_consistent", "perfect_month"],
      ...PERIOD,
    })

    const claims = await db.select().from(awardClaims).where(eq(awardClaims.profileId, profile.id))

    expect(claims).toHaveLength(2)
    expect(new Set(claims.map((claim) => claim.awardType))).toEqual(
      new Set(["most_consistent", "perfect_month"]),
    )
  })

  it("a recompute adds the newly earned type and leaves members' publication choice untouched", async () => {
    const { profile, groupId } = await setup()

    await saveAwardClaims({
      groupId,
      profileId: profile.id,
      types: ["most_consistent"],
      ...PERIOD,
    })
    await db
      .update(awardClaims)
      .set({ sharedPublic: true })
      .where(and(eq(awardClaims.profileId, profile.id), eq(awardClaims.awardType, "most_consistent")))

    await saveAwardClaims({
      groupId,
      profileId: profile.id,
      types: ["most_consistent", "best_streak"],
      ...PERIOD,
    })

    const claims = await db.select().from(awardClaims).where(eq(awardClaims.profileId, profile.id))

    expect(claims).toHaveLength(2)
    expect(claims.map((claim) => claim.awardType).sort()).toEqual(["best_streak", "most_consistent"])
    const published = claims.find((claim) => claim.awardType === "most_consistent")

    expect(published?.sharedPublic).toBe(true)
  })

  it("a different period keeps every claim separable in the same member", async () => {
    const { profile, groupId } = await setup()
    const secondPeriod = { periodStart: "2026-02-01", periodEnd: "2026-02-28" }

    await saveAwardClaims({
      groupId,
      profileId: profile.id,
      types: ["most_consistent"],
      ...PERIOD,
    })
    await saveAwardClaims({ groupId, profileId: profile.id, types: ["most_consistent"], ...secondPeriod })

    const claims = await db.select().from(awardClaims).where(eq(awardClaims.profileId, profile.id))

    expect(claims).toHaveLength(2)
    expect(new Set(claims.map((claim) => claim.periodStart))).toEqual(
      new Set([PERIOD.periodStart, secondPeriod.periodStart]),
    )
  })

  it("an empty type list writes nothing", async () => {
    const { profile, groupId } = await setup()

    await saveAwardClaims({ groupId, profileId: profile.id, types: [], ...PERIOD })

    const claims = await db.select().from(awardClaims).where(eq(awardClaims.profileId, profile.id))

    expect(claims).toHaveLength(0)
  })
})
