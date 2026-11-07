import { CreateGroupForm } from "@/features/groups/components/create-group-form"
import { GroupList } from "@/features/groups/components/group-list"
import { JoinGroupForm } from "@/features/groups/components/join-group-form"
import { requireActingProfile } from "@/features/groups/server/acting-profile"
import { getGroupSummaries } from "@/features/groups/server/group-access"

export const instant = false

export default async function GroupsPage() {
  const { profileId } = await requireActingProfile()
  const groups = await getGroupSummaries(profileId)

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Grupos
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          Tu familia
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Un grupo es cerrado: entra quien tiene una invitación y nada más.
        </p>

        <GroupList groups={groups} />
      </div>

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Nuevo grupo
        </p>
        <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
          Crear un grupo
        </h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Quedás como su propiedad y después invitás a quien quieras.
        </p>

        <CreateGroupForm />
      </div>

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Invitación
        </p>
        <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
          Entrar con un código
        </h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Si te pasaron un código de seis caracteres, entrá por acá.
        </p>

        <JoinGroupForm />
      </div>
    </main>
  )
}
