import { requireSession } from "@/auth/session"
import { NewProfileForm } from "@/features/profiles/components/new-profile-form"

export const instant = false

export default async function NewProfilePage() {
  await requireSession()

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-card bg-surface p-7 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Nueva persona
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          Crear un perfil
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          El perfil no necesita login: lo manejás vos desde este dispositivo.
        </p>

        <NewProfileForm />
      </div>
    </main>
  )
}
