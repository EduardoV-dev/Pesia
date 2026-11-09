import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import { getProfileForManager } from "./profile-access"

export type ProfileRemovalCode = "not_managed" | "has_login"

export type RemoveProfileResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: ProfileRemovalCode
      readonly errorMessage: string
    }

const NOT_MANAGED_MESSAGE = "Ese perfil no lo manejás."
const HAS_LOGIN_MESSAGE =
  "Un perfil con su propia cuenta se elimina borrando la cuenta, no desde acá."

/**
 * Guardian soft removal: the profile stops being recordable and leaves every
 * member listing, while its past entries stay exactly where other people already
 * saw them. Repeating the removal is a no-op, not an error.
 */
export async function removeProfile(
  userId: string,
  profileId: string,
): Promise<RemoveProfileResult> {
  const profile = await getProfileForManager(userId, profileId)

  if (!profile) {
    return { ok: false, code: "not_managed", errorMessage: NOT_MANAGED_MESSAGE }
  }

  // A profile attached to a login leaves through account deletion — this path
  // exists for managed profiles with no login of their own.
  if (profile.userId !== null) {
    return { ok: false, code: "has_login", errorMessage: HAS_LOGIN_MESSAGE }
  }

  await db
    .update(profiles)
    .set({ removedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(profiles.id, profile.id), isNull(profiles.removedAt)))

  return { ok: true }
}
