import "server-only"

import { eq, sql } from "drizzle-orm"

import { db } from "@/db/client"
import { awardClaims } from "@/db/schema"
import { getProfileForManager } from "@/features/profiles/server/profile-access"

import { type AwardClaimType } from "../award-type"

export type SaveAwardClaimsParams = {
  readonly groupId: string
  readonly profileId: string
  readonly types: readonly AwardClaimType[]
  readonly periodStart: string
  readonly periodEnd: string
}

/**
 * Idempotent persistence of one member's claims for one period. Recomputation
 * never duplicates a claim (the unique key upserts) and never unpublishes a
 * claim the member chose to share: `shared_public` is left untouched on update.
 */
export async function saveAwardClaims(params: SaveAwardClaimsParams): Promise<void> {
  if (params.types.length === 0) {
    return
  }

  await db
    .insert(awardClaims)
    .values(
      params.types.map((awardType) => ({
        groupId: params.groupId,
        profileId: params.profileId,
        awardType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        computedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: [
        awardClaims.groupId,
        awardClaims.profileId,
        awardClaims.awardType,
        awardClaims.periodStart,
      ],
      set: {
        periodEnd: sql`excluded.period_end`,
        computedAt: sql`excluded.computed_at`,
      },
    })
}

export type SetClaimPublicationParams = {
  readonly claimId: string
  readonly shared: boolean
}

export type SetClaimPublicationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly errorMessage: string }

const NOT_OWN_CLAIM_MESSAGE = "Esa distinción no es tuya."
const NOT_FOUND_MESSAGE = "No encontramos esa distinción."

/**
 * Only the claim's own profile may publish or unpublish the "me moví más"
 * badge, and only a magnitude claim carries that choice (US-6.7).
 */
export async function setClaimPublication(
  userId: string,
  claimerProfileId: string,
  params: SetClaimPublicationParams,
): Promise<SetClaimPublicationResult> {
  const [claim] = await db
    .select()
    .from(awardClaims)
    .where(eq(awardClaims.id, params.claimId))
    .limit(1)

  if (!claim) {
    return { ok: false, code: "claim_not_found", errorMessage: NOT_FOUND_MESSAGE }
  }

  const managedProfile = await getProfileForManager(userId, claim.profileId)

  if (!managedProfile || claim.profileId !== claimerProfileId) {
    return { ok: false, code: "not_own_claim", errorMessage: NOT_OWN_CLAIM_MESSAGE }
  }

  if (claim.awardType !== "biggest_change") {
    return { ok: false, code: "not_publishable", errorMessage: NOT_OWN_CLAIM_MESSAGE }
  }

  await db
    .update(awardClaims)
    .set({ sharedPublic: params.shared })
    .where(eq(awardClaims.id, params.claimId))

  return { ok: true }
}
