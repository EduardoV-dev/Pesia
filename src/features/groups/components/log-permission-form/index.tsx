"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { grantLogPermissionAction, revokeLogPermissionAction } from "@/features/permissions/server/permission-actions"
import { type GroupMemberView } from "@/features/permissions/server/visibility"

export type LogPermissionFormProps = {
  readonly groupId: string
  readonly actingProfileId: string
  readonly members: readonly GroupMemberView[]
  readonly holderIds: readonly string[]
}

export function LogPermissionForm({
  groupId,
  actingProfileId,
  members,
  holderIds,
}: LogPermissionFormProps) {
  const [grantState, grantAction, isGranting] = useActionState(grantLogPermissionAction, {})
  const [revokeState, revokeAction] = useActionState(revokeLogPermissionAction, {})

  const otherMembers = members.filter((member) => member.profileId !== actingProfileId)
  const holders = holderIds.filter((holderId) => holderId !== actingProfileId)
  const grantableMembers = otherMembers.filter(
    (member) => !holderIds.includes(member.profileId),
  )

  return (
    <div className="flex flex-col gap-4">
      {grantState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {grantState.errorMessage}
        </p>
      ) : null}

      {revokeState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {revokeState.errorMessage}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        <li className="flex items-center justify-between gap-3 rounded-control bg-surface-muted px-4 py-3">
          <span className="text-sm font-semibold">Vos</span>
        </li>

        {holders.map((holderId) => {
          const holder = members.find((member) => member.profileId === holderId)

          return (
            <li
              key={holderId}
              className="flex items-center justify-between gap-3 rounded-control bg-surface-muted px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm font-semibold">
                {holder?.displayName ?? "Privado"}
              </span>

              <form action={revokeAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <input type="hidden" name="memberId" value={holderId} />
                <Button
                  type="submit"
                  variant="ghost"
                  className="h-auto rounded-control px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface hover:text-ink"
                >
                  Quitar
                </Button>
              </form>
            </li>
          )
        })}
      </ul>

      {grantableMembers.length > 0 ? (
        <form action={grantAction} className="flex flex-col gap-3">
          <input type="hidden" name="groupId" value={groupId} />

          <Label htmlFor="logPermissionMember" className="text-sm font-semibold">
            ¿Quién más puede anotar tu peso?
          </Label>

          <select
            id="logPermissionMember"
            name="memberId"
            required
            defaultValue=""
            className="h-auto w-full rounded-control border-line bg-surface-muted px-4 py-3 text-base focus-visible:border-accent"
          >
            <option value="" disabled>
              Elegí a alguien
            </option>
            {grantableMembers.map((member) => (
              <option key={member.profileId} value={member.profileId}>
                {member.displayName}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            disabled={isGranting}
            variant="outline"
            className="h-auto self-start rounded-control bg-surface-muted px-4 py-2.5 font-display font-extrabold text-ink hover:opacity-80"
          >
            {isGranting ? "Guardando…" : "Permitir"}
          </Button>
        </form>
      ) : (
        <p className="text-xs leading-relaxed text-ink-muted">
          En este grupo no hay nadie más a quien darle permiso.
        </p>
      )}
    </div>
  )
}
