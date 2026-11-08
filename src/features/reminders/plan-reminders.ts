import { resolveVisibilityGrant, type GroupVisibility } from "@/features/groups/visibility"

import { isDueByCadence } from "./due-rule"

export type ReminderCandidate = {
  readonly profileId: string
  readonly displayName: string
  readonly isDependent: boolean
  readonly visibility: GroupVisibility
  readonly cadenceDays: number | null
  readonly joinedDayKey: string
  readonly lastMeasuredDayKey: string | null
}

export type ReminderGraph = {
  readonly weighInWeekday: number | null
  readonly todayKey: string
  /** Subject profile id → the profiles that may record its weight (roles and grants). */
  readonly loggerProfileIdsBySubject: Readonly<Record<string, readonly string[]>>
  /** Profile id → the users behind it (linked login plus managers). */
  readonly userIdsByProfile: Readonly<Record<string, readonly string[]>>
  /** The users who opted in for this group; nobody else ever hears a reminder (G7). */
  readonly optInUserIds: readonly string[]
}

export type PlanRemindersParams = {
  readonly candidates: readonly ReminderCandidate[]
  readonly graph: ReminderGraph
}

/**
 * The whole reminder object. This shape is the G7 bound: names and turns only —
 * no weight, no delta, no progress value ever exists here to leak.
 */
export type PlannedReminder = {
  readonly recipientUserId: string
  readonly subjectProfileId: string
  /** `null` means an own-turn reminder: second person, no name needed. */
  readonly subjectDisplayName: string | null
}

export const PLANNED_REMINDER_FIELDS = [
  "recipientUserId",
  "subjectProfileId",
  "subjectDisplayName",
] as const

/**
 * Builds the per-recipient reminder plans for one group's due subjects.
 * Eligibility per recipient = opted-in × a profile they control that may log
 * for the subject × that subject showing its name to that profile. Dependents
 * never get an own turn; a private subject is only ever a second-person turn
 * (G7, G8). Plans deduplicate on (user, subject): several logging profiles
 * behind one login yield exactly one reminder, own-turn preferred.
 */
export function planReminders(params: PlanRemindersParams): readonly PlannedReminder[] {
  const optInUserIds = new Set(params.graph.optInUserIds)
  const plans: PlannedReminder[] = []

  for (const candidate of params.candidates) {
    if (
      !isDueByCadence({
        cadenceDays: candidate.cadenceDays,
        weighInWeekday: params.graph.weighInWeekday,
        joinedDayKey: candidate.joinedDayKey,
        lastMeasuredDayKey: candidate.lastMeasuredDayKey,
        todayKey: params.graph.todayKey,
      })
    ) {
      continue
    }

    const nameOrNull = new Map<string, string | null>()

    if (!candidate.isDependent) {
      for (const userId of params.graph.userIdsByProfile[candidate.profileId] ?? []) {
        if (optInUserIds.has(userId)) {
          nameOrNull.set(userId, null)
        }
      }
    }

    if (resolveVisibilityGrant(candidate.visibility).showsName) {
      for (const loggerProfileId of params.graph.loggerProfileIdsBySubject[candidate.profileId] ?? []) {
        if (loggerProfileId === candidate.profileId) {
          continue
        }

        for (const userId of params.graph.userIdsByProfile[loggerProfileId] ?? []) {
          if (optInUserIds.has(userId) && !nameOrNull.has(userId)) {
            nameOrNull.set(userId, candidate.displayName)
          }
        }
      }
    }

    for (const [recipientUserId, subjectDisplayName] of nameOrNull) {
      plans.push({
        recipientUserId,
        subjectProfileId: candidate.profileId,
        subjectDisplayName,
      })
    }
  }

  return plans
}
