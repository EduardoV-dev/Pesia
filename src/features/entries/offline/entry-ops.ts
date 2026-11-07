import { type EntryOpInput } from "../sync-batch"
import { MAX_OPS_PER_BATCH } from "../validation"

/**
 * One locally queued entry operation. Ops replay in `createdAt` order, never in
 * parallel, and each one re-answers permissions when the server applies it.
 */
export type QueuedEntryOp = {
  readonly opId: string
  readonly entryId: string
  readonly payload: EntryOpInput
  readonly status: "pending" | "failed"
  readonly attempts: number
  readonly errorMessage: string | null
  readonly createdAt: number
}

export type FlushVerdict = {
  readonly opId: string
  readonly status: "saved" | "failed"
  readonly reason?: string
}

export function orderOpsForReplay(ops: readonly QueuedEntryOp[]): QueuedEntryOp[] {
  return [...ops].sort((left, right) =>
    left.createdAt !== right.createdAt
      ? left.createdAt - right.createdAt
      : left.opId < right.opId
        ? -1
        : 1,
  )
}

/** The pending ops, in replay order, chopped into server-bounded batches. */
export function buildFlushBatches(ops: readonly QueuedEntryOp[]): QueuedEntryOp[][] {
  const pending = orderOpsForReplay(ops).filter((op) => op.status === "pending")
  const batches: QueuedEntryOp[][] = []

  for (let offset = 0; offset < pending.length; offset += MAX_OPS_PER_BATCH) {
    batches.push(pending.slice(offset, offset + MAX_OPS_PER_BATCH))
  }

  return batches
}

export type FlushOutcome = {
  /** The ops that stay in the queue: retries and the failed ones kept for correction. */
  readonly remaining: QueuedEntryOp[]
  readonly savedOpIds: string[]
  readonly failed: {
    readonly opId: string
    readonly entryId: string
    readonly reason: string | null
  }[]
}

/**
 * Folds the server verdicts into the queue: saved ops leave the queue, refused
 * ops stay as failed with their Spanish reason, and ops the network never
 * answered stay pending with one more attempt counted.
 */
export function foldFlushIntoQueue(
  ops: readonly QueuedEntryOp[],
  flushedOpIds: readonly string[],
  verdicts: readonly FlushVerdict[] | undefined,
): FlushOutcome {
  const verdictByOpId = new Map((verdicts ?? []).map((verdict) => [verdict.opId, verdict]))

  const savedOpIds: string[] = []
  const failed: FlushOutcome["failed"] = []
  const remaining: QueuedEntryOp[] = []

  for (const op of ops) {
    const wasFlushed = flushedOpIds.includes(op.opId)

    if (!wasFlushed) {
      remaining.push(op)
      continue
    }

    const verdict = verdictByOpId.get(op.opId)

    if (verdict?.status === "saved") {
      savedOpIds.push(op.opId)
      continue
    }

    if (verdict?.status === "failed") {
      failed.push({ opId: op.opId, entryId: op.entryId, reason: verdict.reason ?? null })
      remaining.push({ ...op, status: "failed", errorMessage: verdict.reason ?? null })
      continue
    }

    // The network failed before the server answered; the op stays pending.
    remaining.push({ ...op, attempts: op.attempts + 1 })
  }

  return {
    remaining,
    savedOpIds: savedOpIds,
    failed,
  }
}
