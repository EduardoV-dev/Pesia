import Link from "next/link"

import { type Profile } from "@/db/schema"
import { switchActiveProfileAction } from "@/features/profiles/server/switch-active-profile"

export type ProfileSwitcherProps = {
  readonly profiles: Profile[]
  readonly activeProfileId: string | null
}

export function ProfileSwitcher({ profiles, activeProfileId }: ProfileSwitcherProps) {
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0]

  if (!activeProfile) {
    return null
  }

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-[0_6px_16px_rgba(150,95,45,0.12)] [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">{activeProfile.avatarEmoji ?? "⚖️"}</span>
        <span className="max-w-28 truncate">{activeProfile.displayName}</span>
        <span className="text-xs text-ink-muted">Cambiar</span>
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-64 rounded-card bg-surface p-2 shadow-[0_18px_44px_rgba(150,95,45,0.18)]">
        {profiles.map((profile) => (
          <form action={switchActiveProfileAction} key={profile.id}>
            <input type="hidden" name="profileId" value={profile.id} />
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm font-semibold hover:bg-surface-muted aria-[current=true]:bg-accent-soft aria-[current=true]:text-accent-strong"
              aria-current={profile.id === activeProfile.id}
            >
              <span aria-hidden="true">{profile.avatarEmoji ?? "⚖️"}</span>
              <span className="min-w-0 flex-1 truncate">{profile.displayName}</span>
              {profile.isDependent ? (
                <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-muted">
                  A cargo
                </span>
              ) : null}
            </button>
          </form>
        ))}

        <Link
          href="/profiles"
          className="mt-1 block rounded-control px-3 py-2 text-sm font-semibold text-accent-strong hover:bg-surface-muted"
        >
          Administrar perfiles
        </Link>
      </div>
    </details>
  )
}
