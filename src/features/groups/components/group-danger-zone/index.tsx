"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { deleteGroupAction } from "@/features/groups/server/group-actions"
import { leaveGroupAction } from "@/features/groups/server/membership-actions"

export type GroupDangerZoneProps = {
  readonly groupId: string
  readonly groupName: string
  readonly isOwner: boolean
}

export function GroupDangerZone({ groupId, groupName, isOwner }: GroupDangerZoneProps) {
  const [leaveState, leaveAction] = useActionState(leaveGroupAction, {})
  const [deleteState, deleteAction] = useActionState(deleteGroupAction, {})

  return (
    <div className="flex flex-col gap-4">
      {leaveState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {leaveState.errorMessage}
        </p>
      ) : null}

      {deleteState.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {deleteState.errorMessage}
        </p>
      ) : null}

      {!isOwner ? (
        <details className="rounded-control bg-surface-muted px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Salir del grupo
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Dejás de formar parte del grupo. Tus entradas anteriores quedan en el historial del
            grupo.
          </p>
          <form action={leaveAction} className="mt-3">
            <input type="hidden" name="groupId" value={groupId} />
            <Button
              type="submit"
              className="h-auto rounded-control bg-surface px-4 py-2.5 font-display font-extrabold text-ink hover:opacity-80"
            >
              Salir del grupo
            </Button>
          </form>
        </details>
      ) : null}

      {isOwner ? (
        <details className="rounded-control bg-surface-muted px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Eliminar «{groupName}»
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Se borran el grupo, sus miembros, sus entradas y sus ajustes. No se puede deshacer.
          </p>
          <form action={deleteAction} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="groupId" value={groupId} />
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" name="confirmed" value="true" className="mt-0.5 size-5 accent-accent" />
              Confirmo que quiero eliminar el grupo y todos sus datos.
            </label>
            <Button
              type="submit"
              className="h-auto self-start rounded-control bg-destructive px-4 py-2.5 font-display font-extrabold text-white hover:opacity-90"
            >
              Eliminar el grupo
            </Button>
          </form>
        </details>
      ) : null}
    </div>
  )
}
