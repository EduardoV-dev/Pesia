import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { profiles, type Profile } from "@/db/schema"

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  return profile ?? null
}
