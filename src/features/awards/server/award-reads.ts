import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { awardClaims, type AwardClaim } from "@/db/schema"

/** Every claim row of one period month, keyed by its unique period start. */
export function listAwardClaimsForPeriod(
  groupId: string,
  periodStart: string,
): Promise<AwardClaim[]> {
  return db
    .select()
    .from(awardClaims)
    .where(and(eq(awardClaims.groupId, groupId), eq(awardClaims.periodStart, periodStart)))
}
