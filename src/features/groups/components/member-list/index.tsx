import { GROUP_ROLE_LABELS } from "@/features/groups/roles"
import { MemberRoleControls } from "@/features/groups/components/member-role-controls"
import { type GroupMemberView } from "@/features/permissions/server/visibility"

export type MemberListProps = {
  readonly groupId: string
  readonly members: readonly GroupMemberView[]
  readonly actingProfileId: string
  readonly isOwner: boolean
}

export function MemberList({ groupId, members, actingProfileId, isOwner }: MemberListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {members.map((member) => {
        const isActingProfile = member.profileId === actingProfileId

        return (
          <li key={member.profileId} className="rounded-control bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="text-xl">
                {member.avatarEmoji ?? (member.isPrivate ? "🔒" : "⚖️")}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{member.displayName}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
                    {GROUP_ROLE_LABELS[member.role]}
                  </span>

                  {member.rankingOptOut && !member.isDependent ? (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
                      Fuera del ranking
                    </span>
                  ) : null}

                  {isActingProfile ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">
                      Vos
                    </span>
                  ) : null}
                </span>
              </span>
            </div>

            {isOwner && !isActingProfile ? (
              <MemberRoleControls
                groupId={groupId}
                memberId={member.profileId}
                currentRole={member.role}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
