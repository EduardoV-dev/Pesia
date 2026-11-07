import { z } from "zod"

import { MAX_OPS_PER_BATCH, MAX_OPS_PER_BATCH_MESSAGE } from "./validation"

/**
 * The wire shape of one queued entry op. The queue replays ops in creation
 * order; every op re-checks its own permissions when it is applied, so a
 * permission revoked while offline surfaces as a per-item failure.
 */
export const createEntryOpSchema = z.object({
  type: z.literal("create"),
  opId: z.uuid(),
  /** The canonical entry id the server upserts on; equal to the op id for creates. */
  entryId: z.uuid(),
  groupId: z.uuid(),
  profileId: z.uuid(),
  weightKg: z.number(),
  measuredAt: z.coerce.date(),
  recordedAt: z.coerce.date(),
  note: z.string().optional(),
})

export const editEntryOpSchema = z.object({
  type: z.literal("edit"),
  opId: z.uuid(),
  entryId: z.uuid(),
  weightKg: z.number().optional(),
  measuredAt: z.coerce.date().optional(),
  note: z.string().optional(),
})

export const deleteEntryOpSchema = z.object({
  type: z.literal("delete"),
  opId: z.uuid(),
  entryId: z.uuid(),
})

export const entryOpSchema = z.discriminatedUnion("type", [
  createEntryOpSchema,
  editEntryOpSchema,
  deleteEntryOpSchema,
])

export const entrySyncRequestSchema = z.object({
  ops: z
    .array(entryOpSchema)
    .min(1, "No hay pesadas para sincronizar.")
    .max(MAX_OPS_PER_BATCH, MAX_OPS_PER_BATCH_MESSAGE),
})

export type CreateEntryOp = z.infer<typeof createEntryOpSchema>
export type EditEntryOp = z.infer<typeof editEntryOpSchema>
export type DeleteEntryOp = z.infer<typeof deleteEntryOpSchema>
export type EntryOpInput = z.infer<typeof entryOpSchema>
