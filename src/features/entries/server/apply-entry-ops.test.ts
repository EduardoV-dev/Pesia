import { afterEach, describe, expect, it } from "vitest"

import { count, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { entries } from "@/db/schema"
import { applyEntryOps } from "./apply-entry-ops"
import { entrySyncRequestSchema } from "../sync-batch"
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

import { MAX_OPS_PER_BATCH, MAX_OPS_PER_BATCH_MESSAGE } from "../validation"

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

type FlushFixture = {
  readonly groupId: string
  readonly ownerUserId: string
  readonly ownerProfileId: string
  readonly loggerUserId: string
  readonly loggerProfileId: string
  readonly memberUserId: string
  readonly memberProfileId: string
}

async function createFlushFixture(): Promise<FlushFixture> {
  const owner = await createTestUser("Dueña")
  const logger = await createTestUser("Registradora")
  const member = await createTestUser("Miembro")
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

async function countEntriesByGroup(groupId: string): Promise<number> {
  const [row] = await db.select({ total: count() }).from(entries).where(eq(entries.groupId, groupId))

  return row.total
}

const CREATE_TEMPLATES = {
  measuredAt: new Date("2026-11-06T03:00:00Z"),
  recordedAt: new Date("2026-11-06T09:30:00Z"),
}

describe("applyEntryOps", () => {
  it("answers one verdict per op in queue order, mixing saved and failed", async () => {
    const fixture = await createFlushFixture()

    const verdicts = await applyEntryOps({
      userId: fixture.memberUserId,
      actingProfileId: fixture.memberProfileId,
      ops: [
        {
          type: "create",
          opId: "00000000-0000-4000-8000-000000000201",
          entryId: "00000000-0000-4000-8000-000000000201",
          groupId: fixture.groupId,
          profileId: fixture.memberProfileId,
          weightKg: 78.5,
          measuredAt: CREATE_TEMPLATES.measuredAt,
          recordedAt: CREATE_TEMPLATES.recordedAt,
        },
        {
          type: "create",
          opId: "00000000-0000-4000-8000-000000000202",
          entryId: "00000000-0000-4000-8000-000000000202",
          groupId: fixture.groupId,
          profileId: fixture.ownerProfileId,
          weightKg: 60,
          measuredAt: CREATE_TEMPLATES.measuredAt,
          recordedAt: CREATE_TEMPLATES.recordedAt,
        },
        {
          type: "delete",
          opId: "00000000-0000-4000-8000-000000000203",
          entryId: "00000000-0000-4000-8000-000000000201",
        },
      ],
    })

    expect(verdicts).toHaveLength(3)
    expect(verdicts[0]).toMatchObject({
      opId: "00000000-0000-4000-8000-000000000201",
      status: "saved",
    })
    expect(verdicts[1]).toMatchObject({
      opId: "00000000-0000-4000-8000-000000000202",
      status: "failed",
    })
    expect(verdicts[1].reason).toContain("No tenés permiso")
    expect(verdicts[2]).toMatchObject({
      opId: "00000000-0000-4000-8000-000000000203",
      status: "saved",
    })

    const [refusedRow] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, "00000000-0000-4000-8000-000000000202"))
    expect(refusedRow).toBeUndefined()

    const [deletedRow] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, "00000000-0000-4000-8000-000000000201"))
    expect(deletedRow.deletedAt).not.toBeNull()
  })

  it("resolves a retried flush to exactly one row", async () => {
    const fixture = await createFlushFixture()
    const createOp = {
      type: "create" as const,
      opId: "00000000-0000-4000-8000-000000000204",
      entryId: "00000000-0000-4000-8000-000000000204",
      groupId: fixture.groupId,
      profileId: fixture.memberProfileId,
      weightKg: 78.5,
      measuredAt: CREATE_TEMPLATES.measuredAt,
      recordedAt: CREATE_TEMPLATES.recordedAt,
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const verdicts = await applyEntryOps({
        userId: fixture.loggerUserId,
        actingProfileId: fixture.loggerProfileId,
        ops: [createOp],
      })

      expect(verdicts[0].status).toBe("saved")
    }

    expect(await countEntriesByGroup(fixture.groupId)).toBe(1)
  })

  it("keeps an offline edit replay attached to the same entry", async () => {
    const fixture = await createFlushFixture()
    const createOp = {
      type: "create" as const,
      opId: "00000000-0000-4000-8000-000000000205",
      entryId: "00000000-0000-4000-8000-000000000205",
      groupId: fixture.groupId,
      profileId: fixture.memberProfileId,
      weightKg: 78.5,
      measuredAt: CREATE_TEMPLATES.measuredAt,
      recordedAt: CREATE_TEMPLATES.recordedAt,
    }
    const editOp = {
      type: "edit" as const,
      opId: "00000000-0000-4000-8000-000000000206",
      entryId: "00000000-0000-4000-8000-000000000205",
      weightKg: 79.1,
    }

    const verdicts = await applyEntryOps({
      userId: fixture.loggerUserId,
      actingProfileId: fixture.loggerProfileId,
      ops: [createOp, editOp],
    })

    expect(verdicts.every((verdict) => verdict.status === "saved")).toBe(true)

    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, "00000000-0000-4000-8000-000000000205"))
    expect(entry.weightKg).toBe(79.1)
    expect(entry.editedByUserId).toBe(fixture.loggerUserId)
  })
})

describe("entrySyncRequestSchema", () => {
  it("caps the batch at the max and explains it in Spanish", () => {
    const buildOp = (index: number) => ({
      type: "edit" as const,
      opId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      entryId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      weightKg: 80,
    })

    const oversized = entrySyncRequestSchema.safeParse({
      ops: Array.from({ length: MAX_OPS_PER_BATCH + 1 }, (_, index) => buildOp(index)),
    })
    expect(oversized.success).toBe(false)

    if (!oversized.success) {
      expect(oversized.error.issues[0]?.message).toBe(MAX_OPS_PER_BATCH_MESSAGE)
    }

    const atCap = entrySyncRequestSchema.safeParse({
      ops: Array.from({ length: MAX_OPS_PER_BATCH }, (_, index) => buildOp(index)),
    })
    expect(atCap.success).toBe(true)

    const invalidType = entrySyncRequestSchema.safeParse({
      ops: [{ type: "upsert" as unknown as "edit", opId: buildOp(1).opId, entryId: buildOp(1).entryId }],
    })
    expect(invalidType.success).toBe(false)
  })
})
