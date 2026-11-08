import { afterEach, describe, expect, it } from "vitest"

import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { awardClaims } from "@/db/schema"
import { createEntry } from "@/features/entries/server/entry-writes"
import { currentMonthPeriod } from "@/features/awards/period"
import { instantWithNowTimeOfDay } from "@/features/entries/entry-format"
import { POST } from "./route"
import {
  addTestGroupMember,
  createTestGroup,
  createTestManagedProfile,
  createTestProfile,
  createTestSession,
  createTestUser,
  deleteTestGroup,
  deleteTestUser,
  type TestUser,
} from "@/test/database"
import { createSessionCookieHeader } from "@/test/session-cookie"

const createdUsers: TestUser[] = []
const createdGroups: string[] = []

afterEach(async () => {
  await Promise.all(createdGroups.splice(0).map((groupId) => deleteTestGroup(groupId)))
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

/** Same translation the group writes use: the group's timezone is the host's. */
const hostTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

async function createRouteFixture(): Promise<{
  readonly groupId: string
  readonly otherGroupId: string
  readonly sessionCookie: Headers
}> {
  const callerUser = await createTestUser("Dueña")
  const strangerUser = await createTestUser("Ajena")
  createdUsers.push(callerUser, strangerUser)
  const callerProfile = await createTestProfile(callerUser, { displayName: "Ana" })

  const groupId = await createTestGroup(callerUser, callerProfile)
  createdGroups.push(groupId)
  const otherGroupId = await createTestGroup(strangerUser, callerProfile)
  createdGroups.push(otherGroupId)

  const sharedUser = await createTestUser("Familiar de prueba")
  createdUsers.push(sharedUser)
  const nina = await createTestManagedProfile(sharedUser, { displayName: "Nina" })
  await addTestGroupMember(groupId, nina.id, "member")

  const period = currentMonthPeriod(hostTimeZone)

  for (const seed of [
    { weightKg: 70, daysBack: 8 },
    { weightKg: 80.5, daysBack: 3 },
  ]) {
    const pastDayKey = new Date(Date.now() - seed.daysBack * 86_400_000).toISOString().slice(0, 10)
    const clampedDayKey = pastDayKey < period.periodStart ? period.periodStart : pastDayKey
    const result = await createEntry({
      groupId,
      subjectProfileId: nina.id,
      loggerProfileId: callerProfile.id,
      actingUserId: callerUser.id,
      entryId: randomUUID(),
      weightKg: seed.weightKg,
      measuredAt: instantWithNowTimeOfDay(clampedDayKey, hostTimeZone),
      recordedAt: new Date(),
    })

    if (!result.ok) {
      throw new Error(`Seeded entry failed: ${result.errorMessage}`)
    }
  }

  const callerSession = await createTestSession(callerUser)
  const strangerSession = await createTestSession(strangerUser)
  void strangerSession

  return { groupId, otherGroupId, sessionCookie: await createSessionCookieHeader(callerSession.token) }
}

describe("POST /api/awards/compute", () => {
  it("refuses an unauthenticated call", async () => {
    const response = await POST(
      new Request("http://localhost:3015/api/awards/compute", {
        method: "POST",
        body: JSON.stringify({ groupId: randomUUID() }),
      }),
    )

    expect(response.status).toBe(401)
    expect(((await response.json()) as { ok: boolean })).toEqual(expect.objectContaining({ ok: false }))
  })

  it("computes the caller's group when called by one of its members", async () => {
    const fixture = await createRouteFixture()
    const period = currentMonthPeriod(hostTimeZone)

    const response = await POST(
      new Request("http://localhost:3015/api/awards/compute", {
        method: "POST",
        headers: Object.fromEntries(fixture.sessionCookie.entries()),
        body: JSON.stringify({ groupId: fixture.groupId }),
      }),
    )

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      ok: boolean
      data: { computedPeriod: { periodStart: string; periodEnd: string } }
    }

    expect(body.ok).toBe(true)
    expect(body.data.computedPeriod).toEqual(expect.objectContaining({ periodStart: period.periodStart }))

    const claims = await db
      .select()
      .from(awardClaims)
      .where(
        and(eq(awardClaims.groupId, fixture.groupId), eq(awardClaims.periodStart, period.periodStart)),
      )

    expect(claims.length).toBeGreaterThanOrEqual(1)
  })

  it("refuses the compute for a group the caller does not belong to", async () => {
    const fixture = await createRouteFixture()
    const strangerUser = await createTestUser("Voyeur")
    createdUsers.push(strangerUser)
    const strangerProfile = await createTestProfile(strangerUser, { displayName: "Espía" })
    const strangerSession = await createTestSession(strangerUser)
    const strangerCookie = await createSessionCookieHeader(strangerSession.token)
    void strangerProfile

    const response = await POST(
      new Request("http://localhost:3015/api/awards/compute", {
        method: "POST",
        headers: Object.fromEntries(strangerCookie.entries()),
        body: JSON.stringify({ groupId: fixture.groupId }),
      }),
    )

    expect(response.status).toBe(403)
  })
})
