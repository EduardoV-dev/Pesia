import Link from "next/link"

import { requireSession } from "@/auth/session"
import { getManagedProfiles } from "@/features/profiles/server/profile-access"

export const instant = false

export default async function ProfilesPage() {
  const session = await requireSession()
  const managedProfiles = await getManagedProfiles(session.user.id)

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Perfiles
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          ¿A quién pesás?
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Cada perfil tiene su propia unidad y su propio objetivo. Los perfiles que creés acá sólo
          los ves vos.
        </p>

        <ul className="flex flex-col gap-2">
          {managedProfiles.map((profile) => (
            <li key={profile.id}>
              <Link
                href={`/profiles/${profile.id}`}
                className="flex items-center gap-3 rounded-control bg-surface-muted px-4 py-3 hover:opacity-80"
              >
                <span aria-hidden="true" className="text-xl">
                  {profile.avatarEmoji ?? "⚖️"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{profile.displayName}</span>
                  <span className="block text-xs text-ink-muted">
                    {profile.unit}
                    {profile.isDependent ? " · persona a cargo" : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/profiles/new"
          className="mt-6 inline-block rounded-control bg-accent px-5 py-3 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:bg-accent hover:opacity-90"
        >
          Agregar una persona
        </Link>
      </div>
    </main>
  )
}
