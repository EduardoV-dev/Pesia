import "server-only"

import {
  type CreateEntryOp,
  type EntryOpInput,
} from "../sync-batch"
import { type EntryOpVerdict } from "../entry-view"
import { createEntry, deleteEntry, editEntry } from "./entry-writes"

export type ApplyEntryOpsParams = {
  /** The session's user, never a value supplied by the queue itself. */
  readonly userId: string
  readonly actingProfileId: string
  readonly ops: readonly EntryOpInput[]
}

const SYNC_INTERNAL_ERROR_MESSAGE = "No pudimos sincronizar esta pesada. Probá de nuevo."

/**
 * Applies queued ops in order, one at a time: queue ordering matters when an
 * edit follows the create it corrects. Each op resolves to its own verdict, so
 * one bad op never blocks the rest of the batch.
 */
export async function applyEntryOps(
  params: ApplyEntryOpsParams,
): Promise<readonly EntryOpVerdict[]> {
  const verdicts: EntryOpVerdict[] = []

  for (const op of params.ops) {
    const verdict = await applyEntryOp({ ...params, op })

    verdicts.push(verdict)
  }

  return verdicts
}

type ApplyEntryOpParams = ApplyEntryOpsParams & {
  readonly op: EntryOpInput
}

async function applyEntryOp({ userId, actingProfileId, op }: ApplyEntryOpParams): Promise<EntryOpVerdict> {
  try {
    if (op.type === "create") {
      return await applyCreateOp({ userId, actingProfileId, op })
    }

    if (op.type === "edit") {
      const result = await editEntry({
        entryId: op.entryId,
        actingUserId: userId,
        actingProfileId,
        weightKg: op.weightKg,
        measuredAt: op.measuredAt,
        note: op.note,
      })

      return settleVerdict(result.ok, op.opId, op.entryId, result.ok ? undefined : result.errorMessage)
    }

    const result = await deleteEntry({
      entryId: op.entryId,
      actingUserId: userId,
      actingProfileId,
    })

    return settleVerdict(result.ok, op.opId, op.entryId, result.ok ? undefined : result.errorMessage)
  } catch {
    return {
      opId: op.opId,
      entryId: null,
      status: "failed",
      reason: SYNC_INTERNAL_ERROR_MESSAGE,
    }
  }
}

type ApplyCreateOpParams = {
  readonly userId: string
  readonly actingProfileId: string
  readonly op: CreateEntryOp
}

async function applyCreateOp({ userId, actingProfileId, op }: ApplyCreateOpParams): Promise<EntryOpVerdict> {
  const result = await createEntry({
    groupId: op.groupId,
    subjectProfileId: op.profileId,
    loggerProfileId: actingProfileId,
    actingUserId: userId,
    entryId: op.entryId,
    weightKg: op.weightKg,
    measuredAt: op.measuredAt,
    recordedAt: op.recordedAt,
    note: op.note,
  })

  return settleVerdict(result.ok, op.opId, op.entryId, result.ok ? undefined : result.errorMessage)
}

function settleVerdict(
  applied: boolean,
  opId: string,
  entryId: string | null,
  reason: string | undefined,
): EntryOpVerdict {
  if (applied) {
    return { opId, entryId, status: "saved" }
  }

  return { opId, entryId, status: "failed", reason }
}
