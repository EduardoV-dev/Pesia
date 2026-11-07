import Link from "next/link"

import { type Group } from "@/db/schema"
import { GROUP_ROLE_LABELS } from "@/features/groups/roles"
import { type GroupRole } from "@/features/groups/roles"

export type GroupListProps = {
  readonly groups: ReadonlyArray<{
    readonly group: Group
    readonly role: GroupRole
    readonly memberCount: number
  }>
}

export function GroupList({ groups }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-ink-muted">
        Todavía no estás en ningún grupo. Creá uno abajo o entrá con el código que te pasaron.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {groups.map((entry) => (
        <li key={entry.group.id}>
          <Link
            href={`/groups/${entry.group.id}`}
            className="flex items-center gap-3 rounded-control bg-surface-muted px-4 py-3 hover:opacity-80"
          >
            <span aria-hidden="true" className="text-xl">
              🏠
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{entry.group.name}</span>
              <span className="block text-xs text-ink-muted">
                {GROUP_ROLE_LABELS[entry.role]} · {entry.memberCount}{" "}
                {entry.memberCount === 1 ? "persona" : "personas"}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
