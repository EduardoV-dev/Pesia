import type { GoalDirection } from "@/features/goals/direction"
import type { GroupRole } from "@/features/groups/roles"
import type { GroupVisibility } from "@/features/groups/visibility"
import type { LogPermissionSource } from "@/features/permissions/log-permission-source"
import type { WeightUnit } from "@/lib/weight-units"

/**
 * The complete export document: everything the app holds about the requesting
 * member, as the spec's seven sections. Timestamps are ISO strings; notes were
 * already withheld at the source (only the member's own notes survive).
 */
export type ExportedProfile = {
  readonly id: string
  readonly displayName: string
  readonly unit: WeightUnit
  readonly avatarEmoji: string | null
  readonly isDependent: boolean
  readonly bmiEnabled: boolean
  readonly heightCm: number | null
}

export type ExportedGoal = {
  readonly profileId: string
  readonly direction: GoalDirection
  readonly targetWeightKg: number
  readonly bandKg: number | null
  readonly baselineWeightKg: number
  readonly baselineAt: string
  readonly active: boolean
}

export type ExportedEntry = {
  readonly id: string
  readonly profileId: string
  readonly weightKg: number | null
  readonly measuredAt: string
  readonly recordedAt: string
  readonly editedAt: string | null
  readonly recordedByName: string
  readonly recordedByIsLegacy: boolean
  readonly note: string | null
}

export type ExportedMembership = {
  readonly groupId: string
  readonly groupName: string
  readonly profileId: string
  readonly role: GroupRole
  readonly visibility: GroupVisibility
  readonly rankingOptOut: boolean
  readonly cadenceDays: number | null
  readonly joinedAt: string
}

export type ExportedPermission = {
  readonly groupId: string
  readonly subjectProfileId: string
  readonly loggerProfileId: string
  readonly source: LogPermissionSource
}

export type ExportedPushOptIn = {
  readonly groupId: string
  readonly enabled: boolean
  readonly updatedAt: string
}

export type MemberExport = {
  readonly exportedAt: string
  readonly profiles: readonly ExportedProfile[]
  readonly goals: readonly ExportedGoal[]
  readonly entries: readonly ExportedEntry[]
  readonly memberships: readonly ExportedMembership[]
  readonly permissions: readonly ExportedPermission[]
  readonly pushOptIns: readonly ExportedPushOptIn[]
}

/** One CSV row: the spreadsheet-friendly slice of one entry. */
export type CsvEntryRow = {
  readonly profileName: string
  readonly measuredAt: string
  readonly recordedAt: string
  readonly weightKg: number | null
  readonly recordedByName: string
}
