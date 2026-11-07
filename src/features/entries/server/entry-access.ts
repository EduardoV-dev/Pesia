import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import { db } from "@/db/client"
import {
  entries,
  groupMemberships,
  groups,
  profileManagers,
  user,
  type Entry,
} from "@/db/schema"
import { resolveVisibilityGrant, type GroupVisibility } from "@/features/groups/visibility"

import { type EntryView } from "../entry-view"

/**
 * The named assembler for every filtered entry read: it joins the subject's
 * per-member visibility from the group state, drops deleted rows, strips every
 * private note but its author's and decides edit affordances against the same
 * rule `assertEntryEditor` enforces on writes. No page, route or component may
 * read raw `entries` rows another way.
 */
export type ListEntriesForViewerParams = {
  readonly viewerProfileId: string
  readonly viewerUserId: string
  /** Omit to read every subject this viewer may see across their shared groups. */
  readonly subjectProfileId?: string
  /** Omit to read entries of every group both profiles are in. */
  readonly groupId?: string
  /** A `YYYY-MM-DD` in the group's timezone; together with `measuredOnTimeZone` it scopes day-sheet reads. */
  readonly measuredOn?: string
  readonly measuredOnTimeZone?: string
}

export async function listEntriesForViewer(
  params: ListEntriesForViewerParams,
): Promise<EntryView[]> {
  // Sheet overviews cover many subjects; manager-awareness is only required for
  // the per-subject history, where editing affordances must mirror the write rule.
  const managerUserIds = params.subjectProfileId
    ? await listSubjectManagerUserIds(params.subjectProfileId)
    : []

  const rows = await selectViewerEntries(params)

  return rows
    .map((row) => assembleView(row, params.viewerProfileId, params.viewerUserId, managerUserIds))
    .filter((view): view is EntryView => view !== null)
}

type ViewerEntryRow = {
  readonly entry: Entry
  readonly subjectVisibility: GroupVisibility
  readonly recordedByUserFollowed: string | null
}

async function selectViewerEntries(params: ListEntriesForViewerParams): Promise<ViewerEntryRow[]> {
  return params.subjectProfileId === params.viewerProfileId
    ? selectOwnEntries(params)
    : selectOtherSubjectEntries(params)
}

/** Own-history rows: full detail by construction, no group standing required. */
async function selectOwnEntries(params: ListEntriesForViewerParams): Promise<ViewerEntryRow[]> {
  const rows = await db
    .select({ entry: entries, recordedByUserFollowed: user.id })
    .from(entries)
    .leftJoin(user, eq(user.id, entries.recordedByUserId))
    .where(
      and(
        eq(entries.profileId, params.viewerProfileId),
        isNull(entries.deletedAt),
        params.groupId ? eq(entries.groupId, params.groupId) : undefined,
        params.measuredOn
          ? sql`
              (${entries.measuredAt} at time zone ${params.measuredOnTimeZone ?? "UTC"}::text)::date =
              ${params.measuredOn}::date
            `
          : undefined,
      ),
    )
    .orderBy(desc(entries.measuredAt), desc(entries.createdAt))

  return rows.map((row) => ({
    entry: row.entry,
    subjectVisibility: "weight_trend" as GroupVisibility,
    recordedByUserFollowed: row.recordedByUserFollowed,
  }))
}

async function selectOtherSubjectEntries(
  params: ListEntriesForViewerParams,
): Promise<ViewerEntryRow[]> {
  const subjectMembership = alias(groupMemberships, "subject_membership")
  const viewerMembership = alias(groupMemberships, "viewer_membership")

  const rows = await db
    .select({
      entry: entries,
      subjectVisibility: subjectMembership.visibility,
      recordedByUserFollowed: user.id,
    })
    .from(entries)
    .innerJoin(
      subjectMembership,
      and(
        eq(subjectMembership.profileId, entries.profileId),
        eq(subjectMembership.groupId, entries.groupId),
        isNull(subjectMembership.leftAt),
      ),
    )
    .innerJoin(
      viewerMembership,
      and(
        // The viewer's membership marks the group as shared; without it the
        // viewer has no standing to see the subject at all.
        eq(viewerMembership.profileId, params.viewerProfileId),
        eq(viewerMembership.groupId, entries.groupId),
        isNull(viewerMembership.leftAt),
      ),
    )
    .innerJoin(groups, eq(groups.id, entries.groupId))
    .leftJoin(user, eq(user.id, entries.recordedByUserId))
    .where(
      and(
        isNull(entries.deletedAt),
        params.subjectProfileId ? eq(entries.profileId, params.subjectProfileId) : undefined,
        params.groupId ? eq(entries.groupId, params.groupId) : undefined,
        params.measuredOn
          ? sql`
              (${entries.measuredAt} at time zone ${params.measuredOnTimeZone ?? "UTC"}::text)::date =
              ${params.measuredOn}::date
            `
          : undefined,
      ),
    )
    .orderBy(desc(entries.measuredAt), desc(entries.createdAt))

  return rows.map((row) => ({
    entry: row.entry,
    subjectVisibility: row.subjectVisibility,
    recordedByUserFollowed: row.recordedByUserFollowed,
  }))
}

function assembleView(
  row: ViewerEntryRow,
  viewerProfileId: string,
  viewerUserId: string,
  managerUserIds: string[],
): EntryView | null {
  const entry = row.entry
  const grant = resolveVisibilityGrant(row.subjectVisibility)
  const subjectIsViewer = entry.profileId === viewerProfileId

  // A private subject shows nothing to anyone but themselves (G8/G10).
  if (!subjectIsViewer && !grant.showsName) {
    return null
  }

  const weightVisible = subjectIsViewer || grant.showsWeight
  const isNoteAuthor = entry.recordedByUserId === viewerUserId
  const canEdit = isNoteAuthor || managerUserIds.includes(viewerUserId)

  return {
    id: entry.id,
    profileId: entry.profileId,
    weightVisible,
    weightKg: weightVisible ? entry.weightKg : null,
    measuredAt: entry.measuredAt,
    recordedAt: entry.recordedAt,
    editedAt: entry.editedAt,
    editedByName: entry.editedByName,
    recordedByName: entry.recordedByName,
    recordedByIsLegacy: row.recordedByUserFollowed === null,
    note: isNoteAuthor ? entry.note : null,
    canEdit,
  }
}

async function listSubjectManagerUserIds(subjectProfileId: string): Promise<string[]> {
  const managers = await db
    .select({ userId: profileManagers.userId })
    .from(profileManagers)
    .where(eq(profileManagers.profileId, subjectProfileId))

  return managers.map((manager) => manager.userId)
}
