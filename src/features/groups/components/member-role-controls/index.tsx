"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { GROUP_ROLE_LABELS, type GroupRole } from "@/features/groups/roles"
import {
  changeMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/features/groups/server/membership-actions"

export type MemberRoleControlsProps = {
  readonly groupId: string
  readonly memberId: string
  readonly currentRole: GroupRole
}

const ASSIGNABLE_ROLES: readonly GroupRole[] = ["member", "logger"]

export function MemberRoleControls({ groupId, memberId, currentRole }: MemberRoleControlsProps) {
  const [roleState, roleAction] = useActionState(changeMemberRoleAction, {})
  const [ownershipState, ownershipAction] = useActionState(transferOwnershipAction, {})
  const [removeState, removeAction] = useActionState(removeMemberAction, {})

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink-muted">Rol:</span>

        {ASSIGNABLE_ROLES.map((role) => (
          <form action={roleAction} key={role}>
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="memberId" value={memberId} />
            <input type="hidden" name="role" value={role} />
            <Button
              type="submit"
              disabled={currentRole === role}
              variant="outline"
              className="h-auto rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink hover:opacity-80 aria-[current=true]:bg-accent aria-[current=true]:text-accent-ink"
              aria-current={currentRole === role}
            >
              {GROUP_ROLE_LABELS[role]}
            </Button>
          </form>
        ))}
      </div>

      {roleState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {roleState.errorMessage}
        </p>
      ) : null}

      {ownershipState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {ownershipState.errorMessage}
        </p>
      ) : null}

      {removeState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {removeState.errorMessage}
        </p>
      ) : null}

      <details className="rounded-control bg-surface-muted px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-semibold text-ink-muted [&::-webkit-details-marker]:hidden">
          Transferir la propiedad
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          La propiedad del grupo pasa a esta persona y vos quedás como miembro.
        </p>
        <form action={ownershipAction} className="mt-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="memberId" value={memberId} />
          <Button
            type="submit"
            className="h-auto rounded-control bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:opacity-80"
          >
            Transferir
          </Button>
        </form>
      </details>

      <details className="rounded-control bg-surface-muted px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-semibold text-ink-muted [&::-webkit-details-marker]:hidden">
          Sacar del grupo
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          La persona deja el grupo. Sus entradas anteriores quedan en el historial del grupo.
        </p>
        <form action={removeAction} className="mt-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="memberId" value={memberId} />
          <Button
            type="submit"
            className="h-auto rounded-control bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:opacity-80"
          >
            Sacar del grupo
          </Button>
        </form>
      </details>
    </div>
  )
}
