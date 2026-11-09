import { notFound } from "next/navigation"

import { requireSession } from "@/auth/session"
import { EntryHistory } from "@/features/entries/components/entry-history"
import { listEntriesForViewer } from "@/features/entries/server/entry-access"
import { GoalForm } from "@/features/goals/components/goal-form"
import { GoalSummary } from "@/features/goals/components/goal-summary"
import { getActiveGoal } from "@/features/goals/server/get-active-goal"
import { ProfileEditorForm } from "@/features/profiles/components/profile-editor-form"
import { RemoveProfileSection } from "@/features/profiles/components/remove-profile-section"
import { getProfileForManager } from "@/features/profiles/server/profile-access"
import { getGroupsForProfile } from "@/features/groups/server/group-access"
import { TrendSection } from "@/features/stats/components/trend-section"
import { composeTrend } from "@/features/stats/compose-trend"

export const instant = false

export default async function ProfilePage({
  params,
}: Readonly<{
  params: Promise<{ profileId: string }>
}>) {
  const session = await requireSession()
  const { profileId } = await params
  const profile = await getProfileForManager(session.user.id, profileId)

  if (!profile) {
    notFound()
  }

  const [goal, entries, subjectGroups] = await Promise.all([
    profile.isDependent ? Promise.resolve(null) : getActiveGoal(profile.id),
    listEntriesForViewer({
      viewerProfileId: profile.id,
      viewerUserId: session.user.id,
      subjectProfileId: profile.id,
    }),
    getGroupsForProfile(profile.id),
  ])

  const timezone = subjectGroups[0]?.timezone ?? "UTC"

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Perfil
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          {profile.displayName}
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          {profile.isDependent
            ? "Es una persona a cargo: se registra el peso y se ve la tendencia, sin objetivo ni porcentaje de avance."
            : "Este perfil se mide contra su propio objetivo."}
        </p>

        {goal ? (
          <div className="border-t border-line pt-5">
            <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
              Objetivo actual
            </p>
            <div className="mt-3">
              <GoalSummary goal={goal} unit={profile.unit} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <EntryHistory
          data={{
            subject: {
              profileId: profile.id,
              displayName: profile.displayName,
              avatarEmoji: profile.avatarEmoji,
              unit: profile.unit,
              isDependent: profile.isDependent,
            },
            timezone,
            entries,
          }}
        />
      </div>

      <div className="mt-5">
        <TrendSection
          profile={profile}
          trend={composeTrend({
            views: entries,
            goal,
            timeZone: timezone,
            bmiEnabled: profile.bmiEnabled,
            heightCm: profile.heightCm,
          })}
          goal={goal}
          viewerUserId={session.user.id}
        />
      </div>

      {!profile.isDependent ? (
        <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
          <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
            {goal ? "Cambiar objetivo" : "Objetivo"}
          </p>
          <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
            {goal ? "Empezar de nuevo" : "Definí tu objetivo"}
          </h2>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
            {goal
              ? "Al cambiarlo, la base se reinicia con tu peso de hoy y el avance vuelve a 0%."
              : "Es opcional. Tu tendencia funciona igual sin objetivo."}
          </p>

          <GoalForm
            key={`${goal?.id ?? "new"}-${profile.unit}`}
            profileId={profile.id}
            unit={profile.unit}
            goal={goal}
          />
        </div>
      ) : null}

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Editar
        </p>
        <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
          Nombre, emoji y unidad
        </h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Cambiar la unidad no cambia los datos: siempre se guardan en kilogramos.
        </p>

        <ProfileEditorForm profile={profile} />
      </div>

      {profile.isDependent ? (
        <RemoveProfileSection profileId={profile.id} displayName={profile.displayName} />
      ) : null}
    </main>
  )
}
