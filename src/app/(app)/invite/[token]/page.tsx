import { redirect } from "next/navigation"

import { AcceptInviteForm } from "@/features/groups/components/accept-invite-form"
import { requireActingProfile } from "@/features/groups/server/acting-profile"
import { getGroup } from "@/features/groups/server/group-access"
import { findUsableInvite } from "@/features/groups/server/invite-writes"

export const instant = false

export default async function InvitePage({
  params,
}: Readonly<{
  params: Promise<{ token: string }>
}>) {
  await requireActingProfile()
  const { token } = await params

  const invite = await findUsableInvite(token)

  if (!invite) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm rounded-card bg-surface p-7 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
          <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight">
            Esta invitación ya no sirve
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Puede que ya se haya usado o que haya caducado. Pedile una nueva a quien te invitó.
          </p>
        </div>
      </main>
    )
  }

  const group = await getGroup(invite.groupId)

  if (!group) {
    redirect("/groups")
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-card bg-surface p-7 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Invitación
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          {group.name}
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Entrás al grupo como miembro. Vas a poder anotar tu peso y vas a ver lo que cada persona
          comparta. Podés cambiar lo que vos compartís cuando quieras.
        </p>

        <AcceptInviteForm token={token} />
      </div>
    </main>
  )
}
