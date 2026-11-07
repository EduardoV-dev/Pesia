import "server-only"

import { cookies } from "next/headers"

import { type Profile } from "@/db/schema"

export const ACTIVE_PROFILE_COOKIE_NAME = "weight-tracker.active_profile"

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
 * the profiles the caller manages before it is used.
 */
export function pickActiveProfile(
  managedProfiles: Profile[],
  activeProfileId: string | null,
): Profile | null {
  const activeProfile = managedProfiles.find((profile) => profile.id === activeProfileId)

  if (activeProfile) {
    return activeProfile
  }

  const selfProfile = managedProfiles.find((profile) => profile.userId !== null)

  return selfProfile ?? managedProfiles[0] ?? null
}
