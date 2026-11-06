import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { getProfileByUserId } from "@/features/profiles/server/get-profile-by-user-id"

export const instant = false

export default async function HomePage() {
  const session = await requireSession()
  const profile = await getProfileByUserId(session.user.id)

  if (!profile) {
    redirect("/onboarding")
  }

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Hola, {profile.displayName}
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          Tu familia todavía no tiene grupo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          El siguiente paso es crear un grupo cerrado e invitar a las personas que querés pesar con
          vos, o entrar en uno con el código que te pasaron.
        </p>
      </div>
    </main>
  )
}
