import "server-only"

import { z } from "zod"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/db/client"
import { entries, profileManagers, profiles, type Entry } from "@/db/schema"
import { getMembership } from "@/features/groups/server/group-access"
import { canLogFor } from "@/features/permissions/server/log-permissions"

import {
  FUTURE_MEASURED_TOLERANCE_MS,
  NOTE_MAX_LENGTH,
  NOTE_MAX_LENGTH_MESSAGE,
  WEIGHT_RANGE_MESSAGE,
  weightSchema,
} from "../validation"

export type EntryWriteCode =
  | "invalid_input"
  | "no_log_permission"
  | "subject_not_in_group"
  | "logger_not_in_group"
  | "not_an_editor"
  | "entry_not_found"

export type EntryWriteResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: EntryWriteCode
      readonly errorMessage: string
    }

export type CreateEntryParams = {
  readonly groupId: string
  readonly subjectProfileId: string
  readonly loggerProfileId: string
  readonly actingUserId: string
  readonly entryId: string
  readonly weightKg: number
  readonly measuredAt: Date
  readonly recordedAt: Date
  readonly note?: string | null
}

export type EditEntryParams = {
  readonly entryId: string
  readonly actingUserId: string
  readonly actingProfileId: string
  readonly weightKg?: number
  readonly measuredAt?: Date
  /**
   * Absent means “don't touch the note”. Only the note's author may change it,
   * whatever their edit rights over the rest of the entry.
   */
  readonly note?: string | null
}

export type DeleteEntryParams = {
  readonly entryId: string
  readonly actingUserId: string
  readonly actingProfileId: string
}

const createEntrySchema = z.object({
  entryId: z.uuid(),
  groupId: z.uuid(),
  weightKg: weightSchema,
  measuredAt: z.coerce.date({ error: "Revisá el día de la pesada." }),
  recordedAt: z.coerce.date(),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX_LENGTH, NOTE_MAX_LENGTH_MESSAGE)
    .transform((value) => (value === "" ? null : value))
    .optional(),
})

const editEntrySchema = z.object({
  weightKg: weightSchema.optional(),
  measuredAt: z.coerce.date({ error: "Revisá el día de la pesada." }).optional(),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX_LENGTH, NOTE_MAX_LENGTH_MESSAGE)
    .transform((value) => (value === "" ? null : value))
    .optional(),
})

/** The Spanish refusal the sync endpoint and the sheet surface verbatim. */
export const NO_LOG_PERMISSION_MESSAGE =
  "No tenés permiso para registrar el peso de esta persona."
const FUTURE_MEASURED_REFUSAL = "El día de la pesada no puede ser futuro."
const ENTRY_NOT_FOUND_MESSAGE = "Esa pesada no existe."
const EDITOR_ONLY_RECORDER_SUBJECT_MESSAGE =
  "Sólo quien la registró o la persona pesada puede corregir esta entrada."

/**
 * The write path for entries. Every call re-verifies permissions at apply time:
 * `can_log_for` governs who may record and `assertEntryEditor` who may correct,
 * independently of anything the client or its queue claims.
 */
export async function createEntry(params: CreateEntryParams): Promise<EntryWriteResult> {
  const parsed = createEntrySchema.safeParse(params)

  if (!parsed.success) {
    return failure("invalid_input", parsed.error.issues[0]?.message ?? WEIGHT_RANGE_MESSAGE)
  }

  if (parsed.data.measuredAt.getTime() > Date.now() + FUTURE_MEASURED_TOLERANCE_MS) {
    return failure("invalid_input", FUTURE_MEASURED_REFUSAL)
  }

  const loggerIsMember = await getMembership(params.groupId, params.loggerProfileId)

  if (!loggerIsMember) {
    return failure("logger_not_in_group", "No sos parte de este grupo.")
  }

  const subjectIsMember = await getMembership(params.groupId, params.subjectProfileId)

  if (!subjectIsMember) {
    return failure("subject_not_in_group", "Esa persona no está en este grupo.")
  }

  const recordsForThemselves = params.subjectProfileId === params.loggerProfileId

  if (!recordsForThemselves) {
    const permitted = await canLogFor({
      groupId: params.groupId,
      subjectProfileId: params.subjectProfileId,
      loggerProfileId: params.loggerProfileId,
    })

    if (!permitted) {
      return failure("no_log_permission", NO_LOG_PERMISSION_MESSAGE)
    }
  }

  const loggerProfileName = await getProfileName(params.loggerProfileId)

  const insertValues = {
    id: parsed.data.entryId,
    profileId: params.subjectProfileId,
    groupId: params.groupId,
    weightKg: parsed.data.weightKg,
    measuredAt: parsed.data.measuredAt,
    recordedAt: parsed.data.recordedAt,
    recordedByUserId: params.actingUserId,
    recordedByName: loggerProfileName,
    note: parsed.data.note ?? null,
  }

  // A retried flush replays the same absolute values and upserts on the
  // client-generated id, so sync stays exactly once.
  const [entry] = await db
    .insert(entries)
    .values(insertValues)
    .onConflictDoUpdate({ target: entries.id, set: insertValues })
    .returning()

  if (!entry) {
    return failure("invalid_input", "No se pudo registrar la pesada.")
  }

  return { ok: true }
}

export async function editEntry(params: EditEntryParams): Promise<EntryWriteResult> {
  const hasChange =
    params.weightKg !== undefined ||
    params.measuredAt !== undefined ||
    params.note !== undefined

  if (!hasChange) {
    return failure("invalid_input", "No hay nada para corregir en esa pesada.")
  }

  const parsed = editEntrySchema.safeParse({
    weightKg: params.weightKg,
    measuredAt: params.measuredAt,
    note: params.note,
  })

  if (!parsed.success) {
    return failure("invalid_input", parsed.error.issues[0]?.message ?? WEIGHT_RANGE_MESSAGE)
  }

  const futureMeasuredAt =
    parsed.data.measuredAt && parsed.data.measuredAt.getTime() > Date.now() + FUTURE_MEASURED_TOLERANCE_MS

  if (futureMeasuredAt) {
    return failure("invalid_input", FUTURE_MEASURED_REFUSAL)
  }

  const entry = await getEditableEntry(params.entryId)

  if (!entry) {
    return failure("entry_not_found", ENTRY_NOT_FOUND_MESSAGE)
  }

  const isEntryEditor = await assertEntryEditor({
    entry,
    actingUserId: params.actingUserId,
  })

  if (!isEntryEditor) {
    return failure("not_an_editor", EDITOR_ONLY_RECORDER_SUBJECT_MESSAGE)
  }

  const isNoteAuthor = entry.recordedByUserId === params.actingUserId

  if (parsed.data.note !== undefined && !isNoteAuthor) {
    return failure("not_an_editor", "La nota sólo la puede editar quien la escribió.")
  }

  const editorProfileName = await getProfileName(params.actingProfileId)

  const [updated] = await db
    .update(entries)
    .set({
      ...(parsed.data.weightKg !== undefined ? { weightKg: parsed.data.weightKg } : {}),
      ...(parsed.data.measuredAt !== undefined ? { measuredAt: parsed.data.measuredAt } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
      editedAt: new Date(),
      editedByUserId: params.actingUserId,
      editedByName: editorProfileName,
    })
    .where(eq(entries.id, entry.id))
    .returning()

  if (!updated) {
    return failure("entry_not_found", ENTRY_NOT_FOUND_MESSAGE)
  }

  return { ok: true }
}

export async function deleteEntry(params: DeleteEntryParams): Promise<EntryWriteResult> {
  const entry = await getEditableEntry(params.entryId)

  if (!entry) {
    return failure("entry_not_found", ENTRY_NOT_FOUND_MESSAGE)
  }

  const isEntryEditor = await assertEntryEditor({
    entry,
    actingUserId: params.actingUserId,
  })

  if (!isEntryEditor) {
    return failure("not_an_editor", EDITOR_ONLY_RECORDER_SUBJECT_MESSAGE)
  }

  // Append-only: the row survives deleted so attribution and error checks keep
  // their evidence; every read filters `deleted_at` out.
  const [deleted] = await db
    .update(entries)
    .set({ deletedAt: new Date() })
    .where(eq(entries.id, entry.id))
    .returning()

  if (!deleted) {
    return failure("entry_not_found", ENTRY_NOT_FOUND_MESSAGE)
  }

  return { ok: true }
}

/**
 * The edit rule the UI affordances mirror: an entry is editable only by its
 * recorder's user or by a user who manages the subject profile.
 */
export async function assertEntryEditor(params: {
  readonly entry: Entry
  readonly actingUserId: string
}): Promise<boolean> {
  if (params.entry.recordedByUserId === params.actingUserId) {
    return true
  }

  const [manager] = await db
    .select({ userId: profileManagers.userId })
    .from(profileManagers)
    .where(
      and(
        eq(profileManagers.profileId, params.entry.profileId),
        eq(profileManagers.userId, params.actingUserId),
      ),
    )
    .limit(1)

  return Boolean(manager)
}

async function getEditableEntry(entryId: string): Promise<Entry | null> {
  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, entryId), isNull(entries.deletedAt)))
    .limit(1)

  return entry ?? null
}

async function getProfileName(profileId: string): Promise<string> {
  const [profile] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1)

  return profile?.displayName ?? ""
}

function failure(code: EntryWriteCode, errorMessage: string): EntryWriteResult {
  return { ok: false, code, errorMessage }
}
