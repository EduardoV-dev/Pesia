import { afterEach, describe, expect, it } from "vitest"

import { and, count, eq, isNull } from "drizzle-orm"

import { db } from "@/db/client"
import { entries, groupMemberships } from "@/db/schema"
import { NO_LOG_PERMISSION_MESSAGE, createEntry, deleteEntry, editEntry } from "./entry-writes"
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

import { WEIGHT_RANGE_MESSAGE } from "../validation"

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

type WeighInFixture = {
  readonly groupId: string
  readonly ownerUserId: string
  readonly ownerProfileId: string
  readonly loggerUserId: string
  readonly loggerProfileId: string
  readonly memberUserId: string
  readonly memberProfileId: string
}

/**
 * A group whose owner and Logger share the roster with a plain member.
 * The member may log for themselves only.
 */
async function createWeighInFixture(): Promise<WeighInFixture> {
  const owner = await createTestUser("Dueña de prueba")
  const logger = await createTestUser("Registradora de prueba")
  const member = await createTestUser("Miembro de prueba")
  createdUsers.push(owner, logger, member)

  const ownerProfile = await createTestProfile(owner, { displayName: "Nina" })
  const loggerProfile = await createTestProfile(logger, { displayName: "Ana" })
  const memberProfile = await createTestProfile(member, { displayName: "Luis" })
  createdProfileIds.push(ownerProfile.id, loggerProfile.id, memberProfile.id)

  const groupId = await createTestGroup(owner, ownerProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, loggerProfile.id, "logger")
  await addTestGroupMember(groupId, memberProfile.id, "member")

  return {
    groupId,
    ownerUserId: owner.id,
    ownerProfileId: ownerProfile.id,
    loggerUserId: logger.id,
    loggerProfileId: loggerProfile.id,
    memberUserId: member.id,
    memberProfileId: memberProfile.id,
  }
}

async function countEntries(entryId: string): Promise<number> {
  const [row] = await db.select({ total: count() }).from(entries).where(eq(entries.id, entryId))

  return row.total
}

describe("createEntry", () => {
  it("records the member's own weight", async () => {
    const fixture = await createWeighInFixture()
    const measuredAt = new Date("2026-11-06T03:00:00Z")
    const recordedAt = new Date("2026-11-06T09:30:00Z")

    const result = await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.memberProfileId,
      actingUserId: fixture.memberUserId,
      entryId: "00000000-0000-4000-8000-000000000001",
      weightKg: 78.5,
      measuredAt,
      recordedAt,
    })

    expect(result.ok).toBe(true)

    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, "00000000-0000-4000-8000-000000000001"))

    expect(entry.weightKg).toBe(78.5)
    expect(entry.profileId).toBe(fixture.memberProfileId)
    expect(entry.measuredAt).toEqual(measuredAt)
    expect(entry.recordedAt).toEqual(recordedAt)
    expect(entry.recordedByUserId).toBe(fixture.memberUserId)
    expect(entry.recordedByName).toBe("Luis")
  })

  it("records for another member when the Logger has permission", async () => {
    const fixture = await createWeighInFixture()

    const result = await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId: "00000000-0000-4000-8000-000000000002",
      weightKg: 78.5,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    })

    expect(result.ok).toBe(true)
    expect(await countEntries("00000000-0000-4000-8000-000000000002")).toBe(1)
  })

  it("refuses server-side with a Spanish reason when nobody granted the permission", async () => {
    const fixture = await createWeighInFixture()

    const result = await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.ownerProfileId,
      loggerProfileId: fixture.memberProfileId,
      actingUserId: fixture.memberUserId,
      entryId: "00000000-0000-4000-8000-000000000003",
      weightKg: 60,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    })

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error("La escritura debería haberse rechazado.")
    }

    expect(result.code).toBe("no_log_permission")
    expect(result.errorMessage).toBe(NO_LOG_PERMISSION_MESSAGE)
    expect(await countEntries("00000000-0000-4000-8000-000000000003")).toBe(0)
  })

  it("refuses out-of-range weights and never clamps them", async () => {
    const fixture = await createWeighInFixture()
    const base = {
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.memberProfileId,
      actingUserId: fixture.memberUserId,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    }

    const tooLow = await createEntry({
      ...base,
      entryId: "00000000-0000-4000-8000-000000000004",
      weightKg: 0.4,
    })
    const tooHigh = await createEntry({
      ...base,
      entryId: "00000000-0000-4000-8000-000000000005",
      weightKg: 300.01,
    })

    for (const result of [tooLow, tooHigh]) {
      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.code).toBe("invalid_input")
        expect(result.errorMessage).toBe(WEIGHT_RANGE_MESSAGE)
      }
    }

    const [total] = await db
      .select({ total: count() })
      .from(entries)
      .where(eq(entries.groupId, fixture.groupId))
    expect(total.total).toBe(0)
  })

  it("refuses a future measured date", async () => {
    const fixture = await createWeighInFixture()

    const result = await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.memberProfileId,
      actingUserId: fixture.memberUserId,
      entryId: "00000000-0000-4000-8000-000000000006",
      weightKg: 78.5,
      measuredAt: new Date(Date.now() + 60 * 60 * 1000),
      recordedAt: new Date(),
    })

    expect(result.ok).toBe(false)
    expect(await countEntries("00000000-0000-4000-8000-000000000006")).toBe(0)
  })

  it("keeps exactly one row when the same flush replays", async () => {
    const fixture = await createWeighInFixture()
    const base = {
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId: "00000000-0000-4000-8000-000000000007",
      weightKg: 78.5,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    }

    const results = await Promise.all([
      createEntry(base),
      createEntry(base),
      createEntry({ ...base, weightKg: 78.6 }),
    ])

    expect(results.every((result) => result.ok)).toBe(true)
    expect(await countEntries("00000000-0000-4000-8000-000000000007")).toBe(1)

    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, base.entryId))
    expect(entry.weightKg).toBe(78.6)
  })

  it("records a subject with no goal at all (G6)", async () => {
    const fixture = await createWeighInFixture()

    const result = await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId: "00000000-0000-4000-8000-000000000008",
      weightKg: 64.4,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    })

    expect(result.ok).toBe(true)
  })
})

describe("editEntry", () => {
  it("lets the recorder backdate the measured day and keeps the recorded instant", async () => {
    const fixture = await createWeighInFixture()
    const entryId = "00000000-0000-4000-8000-000000000009"

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId,
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
    })

    const result = await editEntry({
      entryId,
      actingUserId: fixture.loggerUserId,
      actingProfileId: fixture.loggerProfileId,
      weightKg: 79.2,
      measuredAt: new Date("2026-11-01T03:00:00Z"),
    })

    expect(result.ok).toBe(true)

    const [entry] = await db.select().from(entries).where(eq(entries.id, entryId))
    expect(entry.weightKg).toBe(79.2)
    expect(entry.measuredAt).toEqual(new Date("2026-11-01T03:00:00Z"))
    expect(entry.recordedAt).toEqual(new Date("2026-11-02T09:30:00Z"))
    expect(entry.editedByUserId).toBe(fixture.loggerUserId)
    expect(entry.editedByName).toBe("Ana")
    expect(entry.editedAt).not.toBeNull()
  })

  it("lets the subject correct their own entry, even one recorded by someone else", async () => {
    const fixture = await createWeighInFixture()
    const entryId = "00000000-0000-4000-8000-00000000000a"

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId,
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
    })

    const result = await editEntry({
      entryId,
      actingUserId: fixture.memberUserId,
      actingProfileId: fixture.memberProfileId,
      weightKg: 77.8,
    })

    expect(result.ok).toBe(true)

    const [entry] = await db.select().from(entries).where(eq(entries.id, entryId))
    expect(entry.weightKg).toBe(77.8)
    expect(entry.editedByUserId).toBe(fixture.memberUserId)
  })

  it("refuses an unrelated member", async () => {
    const fixture = await createWeighInFixture()
    const entryId = "00000000-0000-4000-8000-00000000000b"

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId,
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
    })

    const result = await editEntry({
      entryId,
      actingUserId: fixture.ownerUserId,
      actingProfileId: fixture.ownerProfileId,
      weightKg: 1,
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.code).toBe("not_an_editor")
    }

    const [entry] = await db.select().from(entries).where(eq(entries.id, entryId))
    expect(entry.weightKg).toBe(78.5)
  })

  it("treats the note as the author's property: editable by them, frozen for every other editor", async () => {
    const fixture = await createWeighInFixture()

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId: "00000000-0000-4000-8000-00000000000c",
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
      note: "El baño marcó dos veces.",
    })

    const authorEdit = await editEntry({
      entryId: "00000000-0000-4000-8000-00000000000c",
      actingUserId: fixture.loggerUserId,
      actingProfileId: fixture.loggerProfileId,
      note: "El baño dijo 78,4 y 78,6.",
    })

    expect(authorEdit.ok).toBe(true)

    const subjectAttempt = await editEntry({
      entryId: "00000000-0000-4000-8000-00000000000c",
      actingUserId: fixture.memberUserId,
      actingProfileId: fixture.memberProfileId,
      note: "Intento ajeno",
    })

    expect(subjectAttempt.ok).toBe(false)

    if (!subjectAttempt.ok) {
      expect(subjectAttempt.errorMessage).toBe("La nota sólo la puede editar quien la escribió.")
    }

    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, "00000000-0000-4000-8000-00000000000c"))
    expect(entry.note).toBe("El baño dijo 78,4 y 78,6.")

    const authorClears = await editEntry({
      entryId: "00000000-0000-4000-8000-00000000000c",
      actingUserId: fixture.loggerUserId,
      actingProfileId: fixture.loggerProfileId,
      note: "",
    })

    expect(authorClears.ok).toBe(true)

    const [cleared] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, "00000000-0000-4000-8000-00000000000c"))
    expect(cleared.note).toBeNull()
  })

  it("refuses a weight outside the range on edit as well", async () => {
    const fixture = await createWeighInFixture()
    const entryId = "00000000-0000-4000-8000-00000000000d"

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.memberProfileId,
      actingUserId: fixture.memberUserId,
      entryId,
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
    })

    const result = await editEntry({
      entryId,
      actingUserId: fixture.memberUserId,
      actingProfileId: fixture.memberProfileId,
      weightKg: 400,
    })

    expect(result.ok).toBe(false)
  })
})

describe("deleteEntry", () => {
  it("lets the recorder delete and leaves no placeholder", async () => {
    const fixture = await createWeighInFixture()
    const entryId = "00000000-0000-4000-8000-00000000000e"

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.memberProfileId,
      actingUserId: fixture.memberUserId,
      entryId,
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
    })

    const result = await deleteEntry({
      entryId,
      actingUserId: fixture.memberUserId,
      actingProfileId: fixture.memberProfileId,
    })

    expect(result.ok).toBe(true)

    const [visible] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, entryId), isNull(entries.deletedAt)))
    expect(visible).toBeUndefined()

    const [row] = await db.select().from(entries).where(eq(entries.id, entryId))
    expect(row.deletedAt).not.toBeNull()
  })

  it("refuses a member who is neither the recorder nor the subject", async () => {
    const fixture = await createWeighInFixture()
    const entryId = "00000000-0000-4000-8000-00000000000f"

    await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId,
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
    })

    const result = await deleteEntry({
      entryId,
      actingUserId: fixture.ownerUserId,
      actingProfileId: fixture.ownerProfileId,
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.code).toBe("not_an_editor")
    }

    const [row] = await db.select().from(entries).where(eq(entries.id, entryId))
    expect(row.deletedAt).toBeNull()
  })
})

describe("combined flush safety", () => {
  it("flushes a multi-op batch: create a hidden subject entry, then edit, then delete", async () => {
    const fixture = await createWeighInFixture()
    const entryId = "00000000-0000-4000-8000-000000000011"

    const create = await createEntry({
      groupId: fixture.groupId,
      subjectProfileId: fixture.memberProfileId,
      loggerProfileId: fixture.loggerProfileId,
      actingUserId: fixture.loggerUserId,
      entryId,
      weightKg: 78.5,
      measuredAt: new Date("2026-11-02T03:00:00Z"),
      recordedAt: new Date("2026-11-02T09:30:00Z"),
    })

    const edit = await editEntry({
      entryId,
      actingUserId: fixture.loggerUserId,
      actingProfileId: fixture.loggerProfileId,
      weightKg: 78.9,
    })

    const dalet = await deleteEntry({
      entryId,
      actingUserId: fixture.loggerUserId,
      actingProfileId: fixture.loggerProfileId,
    })

    expect(create.ok).toBe(true)
    expect(edit.ok).toBe(true)
    expect(dalet.ok).toBe(true)

    const [membership] = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, fixture.groupId),
          eq(groupMemberships.profileId, fixture.memberProfileId),
        ),
      )
    expect(membership.leftAt).toBeNull()

    const [row] = await db.select().from(entries).where(eq(entries.id, entryId))
    expect(row.weightKg).toBe(78.9)
    expect(row.deletedAt).not.toBeNull()
  })
})
