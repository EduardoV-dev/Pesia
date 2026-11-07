import { redirect } from "next/navigation"

import { GroupDangerZone } from "@/features/groups/components/group-danger-zone"
import { GroupSettingsForm } from "@/features/groups/components/group-settings-form"
import { InvitePanel } from "@/features/groups/components/invite-panel"
import { LogPermissionForm } from "@/features/groups/components/log-permission-form"
import { MemberList } from "@/features/groups/components/member-list"
import { MemberSettingsForm } from "@/features/groups/components/member-settings-form"
import { getCadenceKey } from "@/features/groups/cadence"
import { GROUP_ROLE_LABELS } from "@/features/groups/roles"
import { requireActingProfile } from "@/features/groups/server/acting-profile"
import { getGroup, getGroupSettings, getMembership } from "@/features/groups/server/group-access"
import { buildInviteUrl, listActiveInvites } from "@/features/groups/server/invite-writes"
import { WEEKDAY_LABELS } from "@/features/groups/weigh-in"
import { listLogPermissionHolders } from "@/features/permissions/server/log-permission-writes"
import { resolveVisibleMembers } from "@/features/permissions/server/visibility"

export const instant = false

export default async function GroupPage({
  params,
}: Readonly<{
  params: Promise<{ groupId: string }>
}>) {
  const { profileId } = await requireActingProfile()
  const { groupId } = await params

  const membership = await getMembership(groupId, profileId)

  if (!membership) {
    redirect("/groups")
  }

  const group = await getGroup(groupId)

  if (!group) {
    redirect("/groups")
  }

  const members = await resolveVisibleMembers({ groupId, viewerProfileId: profileId })
  const settings = await getGroupSettings(groupId)
  const isOwner = membership.role === "owner"
  const hasRecorder = members.some((member) => member.role === "logger")
  const logHolders = await listLogPermissionHolders(groupId, profileId)
  const invites = isOwner ? await listActiveInvites(groupId) : []
  const actingMember = members.find((member) => member.profileId === profileId)

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Grupo
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          {group.name}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {GROUP_ROLE_LABELS[membership.role]}
          {settings ? ` · pesaje los ${WEEKDAY_LABELS[settings.weighInWeekday].toLowerCase()}` : ""}
        </p>
      </div>

      {!hasRecorder ? (
        <div className="mt-5 rounded-card bg-accent-soft p-6">
          <h2 className="font-display text-lg leading-tight font-extrabold tracking-tight text-accent-strong">
            Ningún anotador asignado
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {isOwner
              ? "Elegí el rol «Anotador» para una persona del grupo y la hoja de pesaje vuelve a funcionar."
              : "El grupo todavía no tiene a nadie con el rol «Anotador». La propiedad del grupo puede asignarlo."}
          </p>
        </div>
      ) : null}

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Personas
        </p>
        <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
          Quiénes están
        </h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Cada persona decide qué ve el grupo. Lo que alguien no comparte, no aparece.
        </p>

        <MemberList
          groupId={groupId}
          members={members}
          actingProfileId={profileId}
          isOwner={isOwner}
        />
      </div>

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Tu ficha
        </p>
        <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
          Qué compartís y con quién
        </h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Lo que elegís acá es lo que el grupo ve. Podés cambiarlo cuando quieras.
        </p>

        <MemberSettingsForm
          groupId={groupId}
          visibility={membership.visibility}
          rankingOptOut={membership.rankingOptOut}
          cadenceKey={getCadenceKey(membership.cadenceDays)}
          isDependent={actingMember?.isDependent ?? false}
        />
      </div>

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Anotar tu peso
        </p>
        <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
          Quién puede anotar tu peso
        </h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          Anotar tu peso no le da a esa persona acceso a tu historial. Son dos cosas separadas.
        </p>

        <LogPermissionForm
          groupId={groupId}
          actingProfileId={profileId}
          members={members}
          holderIds={logHolders.map((holder) => holder.loggerProfileId)}
        />
      </div>

      {isOwner ? (
        <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
          <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
            Invitaciones
          </p>
          <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
            Sumar a alguien
          </h2>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
            El enlace suma a una persona sola. El código se lee en voz alta y caduca.
          </p>

          <InvitePanel
            groupId={groupId}
            invites={invites.map((invite) => ({
              id: invite.id,
              kind: invite.kind,
              token: invite.token,
              url: buildInviteUrl(invite.token),
            }))}
          />
        </div>
      ) : null}

      {isOwner ? (
        <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
          <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
            Ajustes del grupo
          </p>
          <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
            El día del pesaje
          </h2>
          <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
            Lo ven todas las personas del grupo.
          </p>

          <GroupSettingsForm
            groupId={groupId}
            weighInWeekday={settings?.weighInWeekday ?? 0}
            weighInTime={settings?.weighInTime ?? null}
          />
        </div>
      ) : null}

      <div className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Salir
        </p>
        <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
          {isOwner ? "Eliminar el grupo" : "Salir del grupo"}
        </h2>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          {isOwner
            ? "Antes tenés que transferir la propiedad a otra persona del grupo."
            : "Tus entradas anteriores quedan en el historial del grupo."}
        </p>

        <GroupDangerZone groupId={groupId} groupName={group.name} isOwner={isOwner} />
      </div>
    </main>
  )
}
