import "server-only"

import { getSession } from "@/auth/session"
import { getProfileByUserId } from "@/features/profiles/server/get-profile-by-user-id"

export async function resolveEntryRoute(): Promise<string> {
  const session = await getSession()

  if (!session) {
    return "/sign-in"
  }

  const profile = await getProfileByUserId(session.user.id)

  if (!profile) {
    return "/onboarding"
  }

  return "/home"
}
