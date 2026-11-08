import { afterEach, describe, expect, it } from "vitest"

import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { canLogFor, groupMemberships, profiles } from "@/db/schema"
import { assembleGroupBoard } from "@/features/board/server/assemble-board"
import { createEntry } from "@/features/entries/server/entry-writes"
import { GROUP_VISIBILITIES, type GroupVisibility } from "@/features/groups/visibility"
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
  visibility: GroupVisibility,
): Promise<void> {
  await db
    .update(groupMemberships)
    .set({ visibility })
    .where(
      and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.profileId, profileId)),
    )
}

async function setRankingOptOut(
  groupId: string,
  profileId: string,
  isOptedOut: boolean,
): Promise<void> {
  await db
    .update(groupMemberships)
    .set({ rankingOptOut: isOptedOut })
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
  readonly note?: string
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
    note: params.note,
  })

  if (!result.ok) {
    throw new Error(`Seeded entry failed: ${result.errorMessage}`)
  }
}

type BoardMemberFixture = { readonly userId: string; readonly profileId: string }

type BoardGroupFixture = {
  readonly groupId: string
  readonly owner: BoardMemberFixture
  readonly logger: BoardMemberFixture
  readonly member: BoardMemberFixture
  readonly subjectProfileIds: Map<string, string>
}

/** A family group exercising each axis: three viewers, one member per combination. */
async function createMatrixFixture(): Promise<BoardGroupFixture> {
  const ownerUser = await createTestUser("Dueña")
  const loggerUser = await createTestUser("Registradora")
  const viewerUser = await createTestUser("Miradora")
  createdUsers.push(ownerUser, loggerUser, viewerUser)

  const ownerProfile = await createTestProfile(ownerUser, { displayName: "Ana" })
  const loggerProfile = await createTestProfile(loggerUser, { displayName: "Beto" })
  const viewerProfile = await createTestProfile(viewerUser, { displayName: "Coti" })

  const groupId = await createTestGroup(ownerUser, ownerProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, loggerProfile.id, "logger")
  await addTestGroupMember(groupId, viewerProfile.id, "member")

  const subjectProfileIds = new Map<string, string>()

  for (const visibility of GROUP_VISIBILITIES) {
    for (const isDependent of [false, true]) {
      for (const isOptedOut of [false, true]) {
        const comboUser = await createTestUser("Familiar de prueba")
        createdUsers.push(comboUser)
        const displayName = `${visibility}|${isDependent ? "dep" : "per"}|${isOptedOut ? "opt" : "rank"}`
        const profile = await createTestManagedProfile(comboUser, { displayName })
        if (isDependent) {
          await setProfileDependent(profile.id)
        }
        await addTestGroupMember(groupId, profile.id, "member")
        await setVisibility(groupId, profile.id, visibility)
        await setRankingOptOut(groupId, profile.id, isOptedOut)

        for (const weightKg of [60.5, 61.5, 62.5]) {
          await recordEntry({
            groupId,
            subjectProfileId: profile.id,
            loggerProfileId: ownerProfile.id,
            actingUserId: ownerUser.id,
            weightKg,
            measuredAt: daysAgo(62.5 - weightKg),
          })
        }

        subjectProfileIds.set(displayName, profile.id)
      }
    }
  }

  return {
    groupId,
    owner: { userId: ownerUser.id, profileId: ownerProfile.id },
    logger: { userId: loggerUser.id, profileId: loggerProfile.id },
    member: { userId: viewerUser.id, profileId: viewerProfile.id },
    subjectProfileIds,
  }
}

function cardsOf(payload: Awaited<ReturnType<typeof assembleGroupBoard>>) {
  return new Map(
    (payload?.members ?? []).flatMap((card) =>
      "profileId" in card ? [[card.profileId, card] as const] : [],
    ),
  )
}

describe("assembleGroupBoard visibility matrix (G10)", () => {
  for (const viewer of ["owner", "logger", "member"] as const) {
    it(`filters every combination for viewer role ${viewer} × subject visibility × dependent × opt-out`, async () => {
      const fixture = await createMatrixFixture()
      const viewerIds = fixture[viewer]
      const payload = await assembleGroupBoard({
        groupId: fixture.groupId,
        viewerProfileId: viewerIds.profileId,
        viewerUserId: viewerIds.userId,
      })

      expect(payload).not.toBeNull()
      const cards = cardsOf(payload)

      // G8: a private member renders exactly one placeholder, carrying nothing.
      const privateCards = (payload?.members ?? []).filter((card) => card.kind === "private")

      expect(privateCards).toHaveLength(4)

      for (const [displayName, profileId] of fixture.subjectProfileIds) {
        const [visibility, dependentFlag, optOutFlag] = displayName.split("|")
        const card = cards.get(profileId)

        // G10: a private member owns no card at all, so no card data keyed by
        // them exists for any viewer.
        if (visibility === "private") {
          expect(cards.has(profileId)).toBe(false)
          continue
        }

        if (dependentFlag === "dep") {
          const dependentCardType = card as { direction: unknown }

          expect(card?.kind).toBe("dependent")

          if (visibility === "weight_trend") {
            expect(typeof dependentCardType.direction).toBe("string")
          } else {
            expect(dependentCardType.direction).toBeNull()
          }

          expect(
            Object.keys(card ?? {}).filter((key) =>
              ["progress", "awardTypes", "sparkline", "isDue"].includes(key),
            ),
          ).toEqual([])
          continue
        }

        if (visibility === "name_only") {
          expect(card?.kind).toBe("nameOnly")
          expect("latestWeightKg" in (card ?? {})).toBe(false)
          expect((card as { rankingOptOut: boolean }).rankingOptOut).toBe(optOutFlag === "opt")
        } else if (visibility === "latest_only") {
          expect(card?.kind).toBe("latestOnly")
          expect("sparkline" in (card ?? {})).toBe(false)
          expect((card as { latestWeightKg: number | null }).latestWeightKg).not.toBeNull()
          expect((card as { rankingOptOut: boolean }).rankingOptOut).toBe(optOutFlag === "opt")
        } else {
          expect(card?.kind).toBe("full")
          const fullCardType = card as {
            latestWeightKg: number | null
            sparkline: unknown
            direction: unknown
            progress: unknown
            rankingOptOut: boolean
          }

          expect(fullCardType.latestWeightKg).not.toBeNull()
          expect(fullCardType.sparkline).not.toBeNull()
          expect(fullCardType.direction).not.toBeNull()
          expect(fullCardType.progress).toBeNull()
          expect(fullCardType.rankingOptOut).toBe(optOutFlag === "opt")
        }
      }
    })
  }

  it("keeps the viewer's own card full even after their own visibility is private", async () => {
    const fixture = await createMatrixFixture()
    await setVisibility(fixture.groupId, fixture.owner.profileId, "private")

    const payload = await assembleGroupBoard({
      groupId: fixture.groupId,
      viewerProfileId: fixture.owner.profileId,
      viewerUserId: fixture.owner.userId,
    })
    const ownCard = cardsOf(payload).get(fixture.owner.profileId)

    expect(ownCard?.kind).toBe("full")
    expect((ownCard as { displayName: string }).displayName).toBe("Ana")
    expect((ownCard as { isViewer: boolean }).isViewer).toBe(true)
  })
})

describe("assembleGroupBoard note authorship (G10)", () => {
  it("the only note that travels is the viewer's own, at every visibility level", async () => {
    const ownerUser = await createTestUser("Dueña")
    const loggerUser = await createTestUser("Registradora")
    const memberUser = await createTestUser("Miradora")
    createdUsers.push(ownerUser, loggerUser, memberUser)

    const ownerProfile = await createTestProfile(ownerUser, { displayName: "Ana" })
    const loggerProfile = await createTestProfile(loggerUser, { displayName: "Beto" })
    const memberProfile = await createTestProfile(memberUser, { displayName: "Coti" })

    const groupId = await createTestGroup(ownerUser, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, loggerProfile.id, "logger")
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const sharedUser = await createTestUser("Familiar de prueba")
    createdUsers.push(sharedUser)
    const visibleProfile = await createTestManagedProfile(sharedUser, { displayName: "Vera" })
    const hiddenIdProfile = await createTestManagedProfile(sharedUser, { displayName: "Ivo" })
    const invisibleProfile = await createTestManagedProfile(sharedUser, { displayName: "Zaira" })
    await addTestGroupMember(groupId, visibleProfile.id, "member")
    await addTestGroupMember(groupId, hiddenIdProfile.id, "member")
    await addTestGroupMember(groupId, invisibleProfile.id, "member")
    await setVisibility(groupId, hiddenIdProfile.id, "name_only")
    await setVisibility(groupId, invisibleProfile.id, "private")

    await recordEntry({
      groupId,
      subjectProfileId: visibleProfile.id,
      loggerProfileId: ownerProfile.id,
      actingUserId: ownerUser.id,
      weightKg: 70,
      measuredAt: daysAgo(2),
      note: "Nota de Ana sobre Vera",
    })
    await recordEntry({
      groupId,
      subjectProfileId: hiddenIdProfile.id,
      loggerProfileId: ownerProfile.id,
      actingUserId: ownerUser.id,
      weightKg: 65,
      measuredAt: daysAgo(2),
      note: "Nota de Ana sobre Ivo",
    })
    await recordEntry({
      groupId,
      subjectProfileId: invisibleProfile.id,
      loggerProfileId: ownerProfile.id,
      actingUserId: ownerUser.id,
      weightKg: 55,
      measuredAt: daysAgo(2),
      note: "Nota de Ana sobre Zaira",
    })
    // Beto writes the note for the most recent Vera weigh-in: only Beto sees it.
    await recordEntry({
      groupId,
      subjectProfileId: visibleProfile.id,
      loggerProfileId: loggerProfile.id,
      actingUserId: loggerUser.id,
      weightKg: 71,
      measuredAt: daysAgo(1),
      note: "Nota de Beto sobre Vera",
    })

    const ownerPayload = await assembleGroupBoard({
      groupId,
      viewerProfileId: ownerProfile.id,
      viewerUserId: ownerUser.id,
    })
    const loggerPayload = await assembleGroupBoard({
      groupId,
      viewerProfileId: loggerProfile.id,
      viewerUserId: loggerUser.id,
    })
    const memberPayload = await assembleGroupBoard({
      groupId,
      viewerProfileId: memberProfile.id,
      viewerUserId: memberUser.id,
    })
    const ownerCards = cardsOf(ownerPayload)
    const loggerCards = cardsOf(loggerPayload)
    const memberCards = cardsOf(memberPayload)

    expect((ownerCards.get(visibleProfile.id) as { latestNote: string | null }).latestNote).toBe(
      "Nota de Ana sobre Vera",
    )
    expect(
      (ownerCards.get(hiddenIdProfile.id) as { latestNote: string | null }).latestNote,
    ).toBe("Nota de Ana sobre Ivo")

    // The private member owns no card at all: no note for anyone (G8/G10).
    expect(ownerCards.has(invisibleProfile.id)).toBe(false)
    expect((ownerPayload?.members ?? []).filter((card) => card.kind === "private")).toHaveLength(1)
    expect(JSON.stringify(ownerPayload)).not.toContain("Nota de Ana sobre Zaira")

    expect(
      (loggerCards.get(visibleProfile.id) as { latestNote: string | null }).latestNote,
    ).toBe("Nota de Beto sobre Vera")
    expect((loggerCards.get(hiddenIdProfile.id) as { latestNote: string | null }).latestNote).toBeNull()
    expect((memberCards.get(visibleProfile.id) as { latestNote: string | null }).latestNote).toBeNull()
    expect((memberCards.get(hiddenIdProfile.id) as { latestNote: string | null }).latestNote).toBeNull()
  })
})

describe("assembleGroupBoard write permission is not read permission (G10)", () => {
  it("can_log_for for a name_only or private subject never widens the viewer's payload", async () => {
    const ownerUser = await createTestUser("Dueña")
    const loggerUser = await createTestUser("Registradora")
    const memberUser = await createTestUser("Miradora")
    createdUsers.push(ownerUser, loggerUser, memberUser)

    const ownerProfile = await createTestProfile(ownerUser, { displayName: "Ana" })
    const loggerProfile = await createTestProfile(loggerUser, { displayName: "Beto" })
    const memberProfile = await createTestProfile(memberUser, { displayName: "Coti" })

    const groupId = await createTestGroup(ownerUser, ownerProfile)
    createdGroups.push(groupId)
    await addTestGroupMember(groupId, loggerProfile.id, "logger")
    await addTestGroupMember(groupId, memberProfile.id, "member")

    const sharedUser = await createTestUser("Familiar de prueba")
    createdUsers.push(sharedUser)
    const hiddenIdProfile = await createTestManagedProfile(sharedUser, { displayName: "Ivo" })
    const invisibleProfile = await createTestManagedProfile(sharedUser, { displayName: "Zaira" })
    await addTestGroupMember(groupId, hiddenIdProfile.id, "member")
    await addTestGroupMember(groupId, invisibleProfile.id, "member")
    await setVisibility(groupId, hiddenIdProfile.id, "name_only")
    await setVisibility(groupId, invisibleProfile.id, "private")

    for (const subjectProfileId of [hiddenIdProfile.id, invisibleProfile.id]) {
      await recordEntry({
        groupId,
        subjectProfileId,
        loggerProfileId: ownerProfile.id,
        actingUserId: ownerUser.id,
        weightKg: 64,
        measuredAt: daysAgo(1),
      })
    }

    // An explicit permission covers both subjects for the plain member and the
    // logger role already covers them for the logger: writes exist for both.
    for (const loggerProfileId of [loggerProfile.id, memberProfile.id]) {
      for (const subjectProfileId of [hiddenIdProfile.id, invisibleProfile.id]) {
        await db
          .insert(canLogFor)
          .values({ groupId, subjectProfileId, loggerProfileId, grantedByUserId: ownerUser.id })
          .onConflictDoNothing()
      }
    }

    for (const writer of [{ who: "logger", ids: { userId: loggerUser.id, profileId: loggerProfile.id } }, { who: "member", ids: { userId: memberUser.id, profileId: memberProfile.id } }] as const) {
      const payload = await assembleGroupBoard({
        groupId,
        viewerProfileId: writer.ids.profileId,
        viewerUserId: writer.ids.userId,
      })
      const cards = cardsOf(payload)

      expect(cards.get(hiddenIdProfile.id)?.kind).toBe("nameOnly")
      expect(cards.has(invisibleProfile.id)).toBe(false)
      expect("latestWeightKg" in (cards.get(hiddenIdProfile.id) ?? {})).toBe(false)
    }
  })
})
