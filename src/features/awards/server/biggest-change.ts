import "server-only"

import { and, eq, ne } from "drizzle-orm"

import { db } from "@/db/client"
import { awardClaims } from "@/db/schema"
import { saveAwardClaims } from "./award-writes"

export type BiggestChangeInput = {
  readonly profileId: string
  readonly firstWeightKg: number | null
  readonly lastWeightKg: number | null
}

/**
 * The member whose own movement in the period was the largest wins the private
 * reveal. A tie means nobody moved the most: no claim is issued for anyone.
 */
export function biggestChangeWinnerOf(
  inputs: readonly BiggestChangeInput[],
): { readonly winnerProfileId: string | null } {
  const movements = inputs.flatMap((input) => {
    const moved =
      input.firstWeightKg !== null &&
      input.lastWeightKg !== null &&
      Math.abs(input.lastWeightKg - input.firstWeightKg) > 0

    return moved
      ? [{ profileId: input.profileId, movedKg: Math.abs(input.lastWeightKg - input.firstWeightKg) }]
      : []
  })

  if (movements.length === 0) {
    return { winnerProfileId: null }
  }

  const topMovementKg = Math.max(...movements.map((movement) => movement.movedKg))
  const winners = movements.filter((movement) => movement.movedKg === topMovementKg)

  return {
    winnerProfileId:
      winners.length === 1
        ? winners[0]?.profileId ?? null
        : null,
  }
}

export type SaveBiggestChangeClaimParams = {
  readonly groupId: string
  readonly winnerProfileId: string | null
  readonly periodStart: string
  readonly periodEnd: string
}

/**
 * Persists the period's reveal as one claim row, always private until the
 * member publishes it. Any other biggest_change claim in the period is stale
 * and leaves: exactly one reveal may exist per period, for whoever moved most.
 */
export async function saveBiggestChangeClaim(params: SaveBiggestChangeClaimParams): Promise<void> {
  await db
    .delete(awardClaims)
    .where(
      and(
        eq(awardClaims.groupId, params.groupId),
        eq(awardClaims.periodStart, params.periodStart),
        eq(awardClaims.awardType, "biggest_change"),
        params.winnerProfileId ? ne(awardClaims.profileId, params.winnerProfileId) : undefined,
      ),
    )

  if (params.winnerProfileId === null) {
    return
  }

  await saveAwardClaims({
    groupId: params.groupId,
    profileId: params.winnerProfileId,
    types: ["biggest_change"],
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  })
}
