import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/db/client"
import {
  canLogFor,
  groupSettings,
  groups,
  profileManagers,
  pushOptIns,
  pushSubscriptions,
  user,
} from "@/db/schema"
import type { GroupMember } from "@/features/groups/server/group-access"
import {
  getGroupSettings,
  listGroupMembers,
} from "@/features/groups/server/group-access"
import { lastMeasuredDayKeyByProfile } from "@/features/entries/server/entry-access"
import { sendReminderEmail } from "@/features/push/server/email-send"
import { sendReminderPush, type PushSendOutcome } from "@/features/push/server/push-send"
import { reminderCopyOf } from "@/features/reminders/copy"
import { groupDayKey, safeTimeZone, todayKeyInTimeZone } from "@/features/entries/entry-format"
import {
  planReminders,
  type PlannedReminder,
  type ReminderCandidate,
} from "@/features/reminders/plan-reminders"

export type ReminderSenders = {
  readonly push: (
    subscription: { readonly endpoint: string; readonly p256dh: string; readonly auth: string },
    copy: ReturnType<typeof reminderCopyOf>,
  ) => Promise<PushSendOutcome>
  readonly email: (
    email: string,
    copy: ReturnType<typeof reminderCopyOf>,
  ) => Promise<"sent" | "failed">
}

const REAL_SENDERS: ReminderSenders = {
  push: sendReminderPush,
  email: sendReminderEmail,
}

export type ReminderScanCounts = {
  readonly groupsScanned: number
  readonly remindersPlanned: number
  readonly pushesSent: number
  readonly subscriptionsReaped: number
  readonly sendFailures: number
}

type GroupScanOutcome = {
  readonly planned: number
  readonly pushesSent: number
  readonly reaped: number
  readonly failures: number
}

const ZERO_SCAN: GroupScanOutcome = { planned: 0, pushesSent: 0, reaped: 0, failures: 0 }

/**
 * The daily scan. Per group, in the group's own timezone: whose turn is due
 * (the one shared due rule), who may be told about it — opt-in × logging right
 * × name visibility per recipient — pushes first, the email fallback behind
 * them. One failed delivery never aborts the scan, and the group's scan-day
 * marker keeps a second same-day run from re-sending.
 */
export async function scanReminderGroups(
  now: Date,
  senders: ReminderSenders = REAL_SENDERS,
): Promise<ReminderScanCounts> {
  let counts: ReminderScanCounts = {
    groupsScanned: 0,
    remindersPlanned: 0,
    pushesSent: 0,
    subscriptionsReaped: 0,
    sendFailures: 0,
  }

  const allGroups = await db.select({ id: groups.id, timezone: groups.timezone }).from(groups)

  for (const group of allGroups) {
    if (!groupInScanWindow(now, group.timezone)) {
      continue
    }

    // Only groups with anything planned count as scanned: a skipped group is
    // not a scan.
    const outcome = await scanOneGroup(group.id, group.timezone, senders)

    if (outcome.planned === 0) {
      continue
    }

    counts = {
      groupsScanned: counts.groupsScanned + 1,
      remindersPlanned: counts.remindersPlanned + outcome.planned,
      pushesSent: counts.pushesSent + outcome.pushesSent,
      subscriptionsReaped: counts.subscriptionsReaped + outcome.reaped,
      sendFailures: counts.sendFailures + outcome.failures,
    }
  }

  return counts
}

/** The family weighs in through their morning: a local 7–12 window is enough. */
export function groupInScanWindow(now: Date, timeZone: string): boolean {
  const hourText = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeTimeZone(timeZone),
    hourCycle: "h23",
    hour: "2-digit",
  }).format(now)
  const hour = Number(hourText)

  return hour >= 7 && hour < 12
}

async function scanOneGroup(
  groupId: string,
  timeZone: string,
  senders: ReminderSenders,
): Promise<GroupScanOutcome> {
  const settings = await getGroupSettings(groupId)

  if (!settings?.remindersEnabled) {
    return ZERO_SCAN
  }

  const todayKey = todayKeyInTimeZone(timeZone)

  if (settings.lastReminderScanDay === todayKey) {
    return ZERO_SCAN
  }

  const members = await listGroupMembers(groupId)

  if (members.length === 0) {
    return ZERO_SCAN
  }

  const graph = await buildReminderGraph(groupId, members, timeZone)
  const plans = planReminders({
    candidates: reminderCandidates(members, timeZone, graph.lastMeasuredDayKeyByProfile),
    graph: {
      weighInWeekday: settings.weighInWeekday,
      todayKey,
      loggerProfileIdsBySubject: graph.loggerProfileIdsBySubject,
      userIdsByProfile: graph.userIdsByProfile,
      optInUserIds: graph.optInUserIds,
    },
  })

  if (plans.length === 0) {
    return ZERO_SCAN
  }

  const outcome = await deliverPlans(plans, groupId, senders)

  // The scan-day marker goes in even when every send failed: the next-day
  // scan is the only retry, so a bad mail day cannot attack the same people.
  await db
    .update(groupSettings)
    .set({ lastReminderScanDay: todayKey })
    .where(eq(groupSettings.groupId, groupId))

  return outcome
}

async function deliverPlans(
  plans: readonly PlannedReminder[],
  groupId: string,
  senders: ReminderSenders,
): Promise<GroupScanOutcome> {
  const [subscriptionRows, emailRows] = await Promise.all([
    db
      .select({
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.groupId, groupId)),
    emailAddresses(plans),
  ])

  const subscriptionsByUser = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>()

  for (const row of subscriptionRows) {
    const subscriptions = subscriptionsByUser.get(row.userId) ?? []
    subscriptions.push({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth })
    subscriptionsByUser.set(row.userId, subscriptions)
  }

  let pushesSent = 0
  let reaped = 0
  let failures = 0

  for (const plan of plans) {
    const copy = reminderCopyOf(plan)
    const subscriptions = subscriptionsByUser.get(plan.recipientUserId) ?? []
    let delivered = 0

    for (const subscription of subscriptions) {
      const outcome = await senders.push(subscription, copy)

      if (outcome === "sent") {
        delivered += 1
        pushesSent += 1
      } else if (outcome === "gone") {
        reaped += 1
      } else {
        failures += 1
      }
    }

    // The fallback runs when no live subscription delivered: opted-in users
    // may still have an address to reach (the email carries the same copy).
    if (delivered === 0) {
      const email = emailRows.get(plan.recipientUserId) ?? null

      if (email) {
        const outcome = await senders.email(email, copy)

        if (outcome === "sent") {
          delivered += 1
        } else {
          failures += 1
        }
      }
    }
  }

  return { planned: plans.length, pushesSent, reaped, failures }
}

async function emailAddresses(
  plans: readonly PlannedReminder[],
): Promise<Map<string, string>> {
  const userIds = [...new Set(plans.map((plan) => plan.recipientUserId))]

  if (userIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, userIds))

  return new Map(rows.map((row) => [row.id, row.email]))
}

function reminderCandidates(
  members: readonly GroupMember[],
  timeZone: string,
  lastMeasuredDayKeyByProfile: ReadonlyMap<string, string>,
): readonly ReminderCandidate[] {
  return members.map(({ membership, profile }) => ({
    profileId: profile.id,
    displayName: profile.displayName,
    isDependent: profile.isDependent,
    visibility: membership.visibility,
    cadenceDays: membership.cadenceDays,
    joinedDayKey: groupDayKey(membership.joinedAt, timeZone),
    lastMeasuredDayKey: lastMeasuredDayKeyByProfile.get(profile.id) ?? null,
  }))
}

async function buildReminderGraph(
  groupId: string,
  members: readonly GroupMember[],
  timeZone: string,
): Promise<{
  readonly lastMeasuredDayKeyByProfile: ReadonlyMap<string, string>
  readonly loggerProfileIdsBySubject: Readonly<Record<string, readonly string[]>>
  readonly userIdsByProfile: Readonly<Record<string, readonly string[]>>
  readonly optInUserIds: readonly string[]
}> {
  const memberProfileIds = members.map(({ profile }) => profile.id)

  const [lastMeasuredRows, grantRows, managerRows, optInRows] = await Promise.all([
    lastMeasuredDayKeyByProfile(groupId, timeZone),
    db
      .select({ subjectProfileId: canLogFor.subjectProfileId, loggerProfileId: canLogFor.loggerProfileId })
      .from(canLogFor)
      .where(eq(canLogFor.groupId, groupId)),
    managerRowsOf(memberProfileIds),
    db
      .select({ userId: pushOptIns.userId })
      .from(pushOptIns)
      .where(and(eq(pushOptIns.groupId, groupId), eq(pushOptIns.enabled, true))),
  ])

  const loggerProfileIdsBySubject: Record<string, string[]> = {}
  const userIdsByProfile: Record<string, string[]> = {}
  const managerUserIdsByProfile = new Map<string, string[]>()

  for (const row of grantRows) {
    const loggerProfileIds = loggerProfileIdsBySubject[row.subjectProfileId] ?? []
    loggerProfileIds.push(row.loggerProfileId)
    loggerProfileIdsBySubject[row.subjectProfileId] = loggerProfileIds
  }

  for (const row of managerRows) {
    const userIds = managerUserIdsByProfile.get(row.profileId) ?? []
    userIds.push(row.userId)
    managerUserIdsByProfile.set(row.profileId, userIds)
  }

  for (const { profile } of members) {
    const userIds = managerUserIdsByProfile.get(profile.id) ?? []

    if (profile.userId) {
      userIds.unshift(profile.userId)
    }

    userIdsByProfile[profile.id] = userIds
  }

  return {
    lastMeasuredDayKeyByProfile: lastMeasuredRows,
    loggerProfileIdsBySubject,
    userIdsByProfile,
    optInUserIds: [...new Set(optInRows.map((row) => row.userId))],
  }
}


async function managerRowsOf(
  memberProfileIds: readonly string[],
): Promise<{ readonly profileId: string; readonly userId: string }[]> {
  if (memberProfileIds.length === 0) {
    return []
  }

  return db
    .select({ profileId: profileManagers.profileId, userId: profileManagers.userId })
    .from(profileManagers)
    .where(inArray(profileManagers.profileId, memberProfileIds))
}


