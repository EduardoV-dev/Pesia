import { redirect } from "next/navigation"

import { requireSession } from "@/auth/session"
import { resolveActiveProfile } from "@/features/profiles/server/active-profile"
import { TrendSection } from "@/features/stats/components/trend-section"
import { composeTrendForProfile } from "@/features/stats/server/trend-reads"
import { displayWeightValue } from "@/lib/weight-units"

export const instant = false

export default async function TrendPage() {
  const session = await requireSession()
  const activeProfile = await resolveActiveProfile(session.user.id)

  if (!activeProfile) {
    redirect("/onboarding")
  }

  const { trend, goal } = await composeTrendForProfile(activeProfile, session.user.id)

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Tendencia
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          {activeProfile.displayName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">Pesás en {activeProfile.unit}.</p>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-display text-4xl leading-none font-extrabold tracking-tight">
            {trend.currentKg === null ? "—" : displayWeightValue(trend.currentKg, activeProfile.unit)}
          </span>
          <span className="text-sm font-semibold text-ink-muted">{activeProfile.unit}</span>
        </div>
      </div>

      <div className="mt-5">
        <TrendSection
          profile={activeProfile}
          trend={trend}
          goal={goal}
          viewerUserId={session.user.id}
        />
      </div>
    </main>
  )
}
