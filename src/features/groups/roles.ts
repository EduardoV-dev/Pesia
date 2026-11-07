export const GROUP_ROLES = ["owner", "logger", "member"] as const

export type GroupRole = (typeof GROUP_ROLES)[number]

/** The role that may record the weight of anybody in the group. */
export const RECORDER_ROLES: readonly GroupRole[] = ["owner", "logger"]

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  owner: "Propietario",
  logger: "Anotador",
  member: "Miembro",
}

export const GROUP_ROLE_DESCRIPTIONS: Record<GroupRole, string> = {
  owner: "Administra el grupo, las invitaciones y los roles.",
  logger: "Puede anotar el peso de cualquiera del grupo. No administra nada.",
  member: "Solo anota su propio peso, salvo que se lo autorices.",
}

export function isRecorderRole(role: GroupRole): boolean {
  return RECORDER_ROLES.includes(role)
}
