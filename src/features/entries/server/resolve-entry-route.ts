import "server-only"

import { getSession } from "@/auth/session"
import { getSelfProfile } from "@/features/profiles/server/profile-access"

export async function resolveEntryRoute(): Promise<string> {
  const session = await getSession()

  if (!session) {
    return "/sign-in"
  }

  const profile = await getSelfProfile(session.user.id)

  if (!profile) {
    return "/onboarding"
  }

  return "/home"
}
