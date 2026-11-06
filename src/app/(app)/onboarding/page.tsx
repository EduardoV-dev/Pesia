import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form"
import { getProfileByUserId } from "@/features/profiles/server/get-profile-by-user-id"

export const instant = false

export default async function OnboardingPage() {
  const session = await requireSession()
  const profile = await getProfileByUserId(session.user.id)

  if (profile) {
    redirect("/home")
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-card bg-surface p-7 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Primer paso
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          Armemos tu perfil
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Después vas a crear tu grupo o entrar con una invitación.
        </p>

        <OnboardingForm />
      </div>
    </main>
  )
}
