import "server-only"

import { cache } from "react"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { profileManagers, profiles, type Profile } from "@/db/schema"

/**
 * The only function that returns more than one profile. Every other profile read goes
 * through `getProfileForManager`, which applies the same management check.
 */
export const getManagedProfiles = cache(async (userId: string): Promise<Profile[]> => {
  const managers = await db.query.profileManagers.findMany({
    where: eq(profileManagers.userId, userId),
    with: { profile: true },
  })

  return managers.map((manager) => manager.profile)
})

export async function getProfileForManager(
  userId: string,
  profileId: string,
): Promise<Profile | null> {
  const [manager] = await db
    .select({ profile: profiles })
    .from(profileManagers)
    .innerJoin(profiles, eq(profileManagers.profileId, profiles.id))
    .where(and(eq(profileManagers.userId, userId), eq(profiles.id, profileId)))
    .limit(1)

  return manager?.profile ?? null
}

export async function getSelfProfile(userId: string): Promise<Profile | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  return profile ?? null
}
