import "server-only"

import { cookies } from "next/headers"

import { type Profile } from "@/db/schema"
import { getManagedProfiles, getSelfProfile } from "@/features/profiles/server/profile-access"

export const ACTIVE_PROFILE_COOKIE_NAME = "weight-tracker.active_profile"

export type PickActiveProfileParams = {
  readonly managedProfiles: Profile[]
  readonly activeProfileId: string | null
  readonly selfProfile: Profile | null
}

export async function getActiveProfileId(): Promise<string | null> {
  const cookieStore = await cookies()

  return cookieStore.get(ACTIVE_PROFILE_COOKIE_NAME)?.value ?? null
}

export async function setActiveProfileId(profileId: string): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(ACTIVE_PROFILE_COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

/**
 * The active profile is a hint, never authority: the cookie is re-validated against
 * the profiles the caller manages before it is used. A profile linked to the caller's
 * own login belongs to them, so it stays reachable even without a management link.
 */
export function pickActiveProfile(params: PickActiveProfileParams): Profile | null {
  const activeProfile = params.managedProfiles.find(
    (profile) => profile.id === params.activeProfileId,
  )

  if (activeProfile) {
    return activeProfile
  }

  const ownedProfile = params.managedProfiles.find((profile) => profile.userId !== null)

  return ownedProfile ?? params.selfProfile ?? params.managedProfiles[0] ?? null
}

export async function resolveActiveProfile(userId: string): Promise<Profile | null> {
  return pickActiveProfile({
    managedProfiles: await getManagedProfiles(userId),
    activeProfileId: await getActiveProfileId(),
    selfProfile: await getSelfProfile(userId),
  })
}
