import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { goals, type Goal } from "@/db/schema"

export async function getActiveGoal(profileId: string): Promise<Goal | null> {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.profileId, profileId), eq(goals.active, true)))
    .limit(1)

  return goal ?? null
}
