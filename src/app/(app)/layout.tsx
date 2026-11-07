import { AppHeader } from "@/components/app-shell/app-header"
import { requireSession } from "@/auth/session"
import { ProfileSwitcher } from "@/features/profiles/components/profile-switcher"
import { getActiveProfileId, pickActiveProfile } from "@/features/profiles/server/active-profile"
import { getManagedProfiles } from "@/features/profiles/server/profile-access"

export const instant = false

export default async function AppAreaLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireSession()
  const managedProfiles = await getManagedProfiles(session.user.id)
  const activeProfile = pickActiveProfile(managedProfiles, await getActiveProfileId())

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader>
        <ProfileSwitcher profiles={managedProfiles} activeProfileId={activeProfile?.id ?? null} />
      </AppHeader>
      {children}
    </div>
  )
}
