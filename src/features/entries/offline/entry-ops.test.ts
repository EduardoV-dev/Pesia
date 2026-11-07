import { describe, expect, it } from "vitest"

import {
  buildFlushBatches,
  foldFlushIntoQueue,
  orderOpsForReplay,
  type QueuedEntryOp,
} from "./entry-ops"
import { MAX_OPS_PER_BATCH } from "../validation"

function queuedOp(opId: string, createdAt: number, entryId = opId): QueuedEntryOp {
  return {
    opId,
    entryId,
    payload: {
      type: "create",
      opId,
      entryId,
      groupId: "00000000-0000-4000-8000-000000000999",
      profileId: "00000000-0000-4000-8000-000000000998",
      weightKg: 80,
      measuredAt: new Date("2026-11-06T03:00:00Z"),
      recordedAt: new Date("2026-11-06T09:30:00Z"),
    },
    status: "pending",
    attempts: 0,
    errorMessage: null,
    createdAt,
  }
}

describe("orderOpsForReplay", () => {
  it("replays in creation order, not storage order", () => {
    const ops = [queuedOp("c", 300), queuedOp("a", 100), queuedOp("b", 200)]

    expect(orderOpsForReplay(ops).map((op) => op.opId)).toEqual(["a", "b", "c"])
    expect(ops.map((op) => op.opId)).toEqual(["c", "a", "b"])
  })
})

describe("buildFlushBatches", () => {
  it("only queues pending ops and caps every batch", () => {
    const failed = { ...queuedOp("f", 1), status: "failed" as const, errorMessage: "sin permiso" }
    const pendingOps = Array.from({ length: MAX_OPS_PER_BATCH + 2 }, (_, index) =>
      queuedOp(`op-${index}`, index + 10),
    )

    const batches = buildFlushBatches([failed, ...pendingOps])

    expect(batches).toHaveLength(2)
    expect(batches[0]).toHaveLength(MAX_OPS_PER_BATCH)
    expect(batches[1]).toHaveLength(2)
    expect(batches.flat().map((op) => op.opId)).not.toContain("f")
    expect(batches[0].map((op) => op.createdAt)).toEqual(
      batches[0].map((op) => op.createdAt).sort((a, b) => a - b),
    )
  })
})

describe("foldFlushIntoQueue", () => {
  it("drops saved ops and keeps failed ones with their reason", () => {
    const ops = [queuedOp("saved", 10), queuedOp("failed", 20), queuedOp("retry", 30)]

    const outcome = foldFlushIntoQueue(
      ops,
      ["saved", "failed", "retry"],
      [
        { opId: "saved", status: "saved" },
        { opId: "failed", status: "failed", reason: "No tenés permiso para registrar el peso de esta persona." },
      ],
    )

    expect(outcome.remaining.map((op) => op.opId)).toEqual(["failed", "retry"])
    expect(outcome.savedOpIds).toEqual(["saved"])
    expect(outcome.failed).toEqual([
      expect.objectContaining({
        opId: "failed",
        reason: "No tenés permiso para registrar el peso de esta persona.",
      }),
    ])
    expect(outcome.remaining[0].status).toBe("failed")
    expect(outcome.remaining[0].errorMessage).toContain("No tenés permiso")
    expect(outcome.remaining[1].attempts).toBe(1)
  })

  it("leaves untouched ops pending when the network answers nothing", () => {
    const ops = [queuedOp("a", 10), queuedOp("b", 20)]

    const outcome = foldFlushIntoQueue(ops, ["a", "b"], undefined)

    expect(outcome.savedOpIds).toEqual([])
    expect(outcome.remaining.every((op) => op.attempts === 1)).toBe(true)
  })

  it("replaying the same queue three times only counts server rows once", () => {
    // The idempotence of the flush belongs to the server upsert (tested in
    // apply-entry-ops.test.ts); the queue's own concern is that repeated
    // flushes with no answers keep the op pending without flipping it failed.
    const flushedOpIds = ["a"]
    const ops = [queuedOp("a", 10)]
    const first = foldFlushIntoQueue(ops, flushedOpIds, undefined)
    const second = foldFlushIntoQueue(first.remaining, flushedOpIds, undefined)
    const third = foldFlushIntoQueue(second.remaining, flushedOpIds, [
      { opId: "a", status: "saved" },
    ])

    expect(first.remaining[0].attempts).toBe(1)
    expect(second.remaining[0].attempts).toBe(2)
    expect(third.savedOpIds).toEqual(["a"])
    expect(third.remaining).toHaveLength(0)
  })
})

describe("queue status transitions for the badges", () => {
  it("marks an entry saved when its verdict arrives and failed with a reason to correct", () => {
    const ops = [queuedOp("a", 10, "entry-a"), { ...queuedOp("b", 20, "entry-b"), entryId: "entry-b" }]

    const first = foldFlushIntoQueue(ops, ["a"], undefined)
    expect(first.remaining[0].attempts).toBe(1)

    const resolved = foldFlushIntoQueue(first.remaining, ["a"], [{ opId: "a", status: "saved" }])
    expect(resolved.savedOpIds).toEqual(["a"])
    expect(resolved.remaining.some((op) => op.entryId === "entry-a")).toBe(false)

    const refused = foldFlushIntoQueue(ops, ["b"], [
      { opId: "b", status: "failed", reason: "Esa persona no está en este grupo." },
    ])

    expect(refused.failed).toEqual([
      expect.objectContaining({ entryId: "entry-b", reason: "Esa persona no está en este grupo." }),
    ])
  })
})
