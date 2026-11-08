import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"

import { db } from "@/db/client"
import { groupSettings, groups, pushSubscriptions } from "@/db/schema"
import { createEntry } from "@/features/entries/server/entry-writes"
import type { ReminderCopy } from "@/features/reminders/copy"
import { setReminderOptIn } from "@/features/push/server/opt-in-writes"
import { registerReminderPush } from "@/features/push/server/subscription-endpoints"
import type { ReminderSenders } from "./scan"
import { scanReminderGroups } from "./scan"
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

/** 10:00Z is 09:00 local here — inside the 7–12 local scan window. */
const IN_WINDOW_TIMEZONE = "Atlantic/Cape_Verde"
/** 10:00Z is midnight local here — outside the window. */
const OUT_OF_WINDOW_TIMEZONE = "Pacific/Kiritimati"

const nowInWindow = new Date(Date.parse("2026-11-08T10:00:00Z"))

const daysAgo = (days: number): Date => new Date(Date.now() - days * 86_400_000)

type FakeSendersSpec = {
  /** Outcome per device endpoint; the default is "sent". */
  readonly pushOutcomeByEndpoint?: Record<string, "gone" | "failed">
  readonly defaultPushOutcome?: "sent" | "gone" | "failed"
}

type SenderRecord = {
  readonly push: { endpoint: string; copy: ReminderCopy }[]
  readonly email: { email: string; copy: ReminderCopy }[]
  readonly senders: ReminderSenders
}

function recorders(spec: FakeSendersSpec = {}): SenderRecord {
  const push: { endpoint: string; copy: ReminderCopy }[] = []
  const email: { email: string; copy: ReminderCopy }[] = []

  const senders: ReminderSenders = {
    push: async (subscription, copy) => {
      push.push({ endpoint: subscription.endpoint, copy })

      return spec.pushOutcomeByEndpoint?.[subscription.endpoint] ?? spec.defaultPushOutcome ?? "sent"
    },
    email: async (emailAddress, copy) => {
      email.push({ email: emailAddress, copy })

      return "sent"
    },
  }

  return { push, email, senders }
}

afterEach(async () => {
  await Promise.all(createdGroups.splice(0).map((groupId) => deleteTestGroup(groupId)))
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

/**
 * Seeds one family: Ana (owner), Luis (member) and Mara (a managed dependent).
 * Ana owns a live device and a dead device; Luis owns none. Ana's own
 * weigh-in is 8 stale days old and Mara's is 9; Luis's is fresh. Both users
 * have opted in for the group.
 */
async function givenFamily(): Promise<{ groupId: string; ana: TestUser }> {
  const ana = await createTestUser()
  createdUsers.push(ana)
  const anaProfile = await createTestProfile(ana, { displayName: "Ana" })
  const groupId = await createTestGroup(ana, anaProfile)
  createdGroups.push(groupId)
  await addTestGroupMember(groupId, anaProfile.id, "owner")

  const luis = await createTestUser()
  createdUsers.push(luis)
  const luisProfile = await createTestProfile(luis, { displayName: "Luis" })
  await addTestGroupMember(groupId, luisProfile.id, "member")

  const maraProfile = await createTestManagedProfile(ana, { displayName: "Mara", isDependent: true })
  await addTestGroupMember(groupId, maraProfile.id, "member")

  // Ana is stale (due), Mara stale (due), Luis fresh (not due).
  for (const log of [
    { subjectProfileId: anaProfile.id, loggerProfileId: anaProfile.id, measuredAt: daysAgo(8) },
    { subjectProfileId: maraProfile.id, loggerProfileId: anaProfile.id, measuredAt: daysAgo(9) },
    { subjectProfileId: luisProfile.id, loggerProfileId: luisProfile.id, measuredAt: daysAgo(1) },
  ]) {
    const result = await createEntry({
      groupId,
      subjectProfileId: log.subjectProfileId,
      loggerProfileId: log.loggerProfileId,
      actingUserId: ana.id,
      entryId: randomUUID(),
      weightKg: 70,
      measuredAt: log.measuredAt,
      recordedAt: new Date(),
    })

    if (!result.ok) {
      throw new Error(`No se pudo crear la pesada de prueba: ${result.errorMessage}`)
    }
  }

  await setReminderOptIn(ana.id, { groupId }, true)
  await setReminderOptIn(luis.id, { groupId }, true)

  await db.update(groups).set({ timezone: IN_WINDOW_TIMEZONE }).where(eq(groups.id, groupId))

  await registerReminderPush({
    userId: ana.id,
    groupId,
    subscription: {
      endpoint: "https://push.example.test/ana-live",
      keys: { p256dh: "key-live", auth: "auth-live" },
    },
  })
  await registerReminderPush({
    userId: ana.id,
    groupId,
    subscription: {
      endpoint: "https://push.example.test/ana-dead",
      keys: { p256dh: "key-dead", auth: "auth-dead" },
    },
  })

  return { groupId, ana }
}

describe("scanReminderGroups", () => {
  it("plans the due subjects and pushes every plan to every device", async () => {
    await givenFamily()
    const record = recorders()

    const counts = await scanReminderGroups(nowInWindow, record.senders)

    expect(counts).toEqual({
      groupsScanned: 1,
      remindersPlanned: 2,
      pushesSent: 4,
      subscriptionsReaped: 0,
      sendFailures: 0,
    })
    // Ana's own turn (second person, no name) plus the dependent named to her
    // logger plan — never a weight anywhere in the copy (G7).
    expect(new Set(record.push.map((call) => call.copy.title))).toEqual(
      new Set(["Tu turno de pesada", "Es el turno de Mara"]),
    )
    expect(record.push.every((call) => !/\d/.test(call.copy.body))).toBe(true)
    expect(new Set(record.push.map((call) => call.endpoint))).toEqual(
      new Set(["https://push.example.test/ana-live", "https://push.example.test/ana-dead"]),
    )
    expect(record.email).toHaveLength(0)
  })

  it("reaps and skips gone devices but keeps delivering the plan", async () => {
    await givenFamily()
    const record = recorders({ pushOutcomeByEndpoint: { "https://push.example.test/ana-dead": "gone" } })

    const counts = await scanReminderGroups(nowInWindow, record.senders)

    expect(counts.subscriptionsReaped).toBe(2)
    expect(counts.pushesSent).toBe(2)
    expect(counts.sendFailures).toBe(0)
    // A live device delivered, so no email fallback ran.
    expect(record.email).toHaveLength(0)
  })

  it("falls back to email for opted-in recipients with no subscription", async () => {
    const { groupId, ana } = await givenFamily()
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.groupId, groupId))

    const record = recorders()

    const counts = await scanReminderGroups(nowInWindow, record.senders)

    expect(counts.remindersPlanned).toBe(2)
    expect(counts.pushesSent).toBe(0)
    expect(counts.sendFailures).toBe(0)
    expect(record.push).toHaveLength(0)
    expect(record.email).toHaveLength(2)
    expect(record.email.map((call) => call.email)).toEqual([ana.email, ana.email])
    expect(new Set(record.email.map((call) => call.copy.emailSubject))).toEqual(
      new Set(["Tu turno de pesada", "Es el turno de Mara"]),
    )
  })

  it("the scan-day marker keeps a second same-day run from re-sending", async () => {
    await givenFamily()
    await scanReminderGroups(nowInWindow, recorders().senders)

    const second = recorders()
    const counts = await scanReminderGroups(nowInWindow, second.senders)

    expect(counts.groupsScanned).toBe(0)
    expect(counts.remindersPlanned).toBe(0)
    expect(second.push).toHaveLength(0)
    expect(second.email).toHaveLength(0)
  })

  it("skips groups whose local hour is outside the window", async () => {
    const { groupId } = await givenFamily()
    await db.update(groups).set({ timezone: OUT_OF_WINDOW_TIMEZONE }).where(eq(groups.id, groupId))

    const record = recorders()

    const counts = await scanReminderGroups(nowInWindow, record.senders)

    expect(counts.groupsScanned).toBe(0)
    expect(counts.remindersPlanned).toBe(0)
    expect(record.push).toHaveLength(0)
  })

  it("skips groups whose reminders master switch is off", async () => {
    const { groupId } = await givenFamily()
    await db
      .update(groupSettings)
      .set({ remindersEnabled: false })
      .where(eq(groupSettings.groupId, groupId))

    const record = recorders()

    const counts = await scanReminderGroups(nowInWindow, record.senders)

    expect(counts.groupsScanned).toBe(0)
    expect(counts.remindersPlanned).toBe(0)
    expect(record.push).toHaveLength(0)
  })

  it("isolates a failing delivery and still falls back to email", async () => {
    await givenFamily()
    const record = recorders({ defaultPushOutcome: "failed" })

    const counts = await scanReminderGroups(nowInWindow, record.senders)

    expect(counts.remindersPlanned).toBe(2)
    expect(counts.pushesSent).toBe(0)
    expect(counts.sendFailures).toBe(4)
    // Every plan fell back to the email copy after all devices failed.
    expect(record.email).toHaveLength(2)
  })
})
