import "server-only"

import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { resolveActiveProfile } from "@/features/profiles/server/active-profile"

export type ActingProfile = {
  readonly userId: string
  readonly profileId: string
}

/**
 * The profile a request acts as. Group membership belongs to the profile, never to
 * the login, so every group action resolves the active profile first.
 */
export async function requireActingProfile(): Promise<ActingProfile> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const profile = await resolveActiveProfile(session.user.id)

  if (!profile) {
    redirect("/onboarding")
  }

  return { userId: session.user.id, profileId: profile.id }
}
