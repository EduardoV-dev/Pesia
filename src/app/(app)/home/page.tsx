import Link from "next/link"
import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { GoalSummary } from "@/features/goals/components/goal-summary"
import { getActiveGoal } from "@/features/goals/server/get-active-goal"
import { resolveActiveProfile } from "@/features/profiles/server/active-profile"

export const instant = false

export default async function HomePage() {
  const session = await requireSession()
  const activeProfile = await resolveActiveProfile(session.user.id)

  if (!activeProfile) {
    redirect("/onboarding")
  }

  const goal = activeProfile.isDependent ? null : await getActiveGoal(activeProfile.id)

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Perfil activo
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          {activeProfile.displayName}
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Pesás en {activeProfile.unit}.{" "}
          {activeProfile.isDependent
            ? "Como persona a cargo, se registra el peso y se ve la tendencia, sin objetivo ni porcentaje de avance."
            : "Tu tendencia se mide contra tu propio objetivo."}
        </p>

        {goal ? (
          <div className="border-t border-line pt-5">
            <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
              Objetivo
            </p>
            <div className="mt-3">
              <GoalSummary goal={goal} unit={activeProfile.unit} />
            </div>
          </div>
        ) : null}

        {!activeProfile.isDependent && !goal ? (
          <p className="border-t border-line pt-5 text-sm leading-relaxed text-ink-muted">
            Todavía no hay un objetivo. Podés medir igual: la tendencia funciona sin objetivo.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {!activeProfile.isDependent ? (
            <Link
              href={`/profiles/${activeProfile.id}`}
              className="rounded-control bg-accent px-5 py-3 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:bg-accent hover:opacity-90"
            >
              {goal ? "Cambiar objetivo" : "Definir objetivo"}
            </Link>
          ) : null}
          <Link
            href="/profiles"
            className="rounded-control bg-surface-muted px-5 py-3 font-display font-extrabold text-ink hover:opacity-80"
          >
            Administrar perfiles
          </Link>
        </div>
      </div>

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <h2 className="font-display text-lg leading-tight font-extrabold tracking-tight">
          Tu familia todavía no tiene grupo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          El siguiente paso es crear un grupo cerrado e invitar a las personas que querés pesar con
          vos, o entrar en uno con el código que te pasaron.
        </p>
      </div>
    </main>
  )
}
