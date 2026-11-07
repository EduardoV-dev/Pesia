export const GROUP_VISIBILITIES = ["weight_trend", "latest_only", "name_only", "private"] as const

export type GroupVisibility = (typeof GROUP_VISIBILITIES)[number]

export const DEFAULT_GROUP_VISIBILITY: GroupVisibility = "weight_trend"

export const GROUP_VISIBILITY_LABELS: Record<GroupVisibility, string> = {
  weight_trend: "Peso y tendencia",
  latest_only: "Solo el último peso",
  name_only: "Solo el nombre",
  private: "Privado",
}

export const GROUP_VISIBILITY_DESCRIPTIONS: Record<GroupVisibility, string> = {
  weight_trend: "El grupo ve tu último peso y tu tendencia.",
  latest_only: "El grupo ve tu último peso, sin la tendencia.",
  name_only: "El grupo ve tu nombre, ningún número.",
  private: "No aparece ningún dato tuyo. Figurás como privado.",
}

/** What a member's visibility lets the group see of them. */
export type VisibilityGrant = {
  readonly showsName: boolean
  readonly showsWeight: boolean
  readonly showsTrend: boolean
}

export function resolveVisibilityGrant(visibility: GroupVisibility): VisibilityGrant {
  switch (visibility) {
    case "weight_trend":
      return { showsName: true, showsWeight: true, showsTrend: true }
    case "latest_only":
      return { showsName: true, showsWeight: true, showsTrend: false }
    case "name_only":
      return { showsName: true, showsWeight: false, showsTrend: false }
    case "private":
      return { showsName: false, showsWeight: false, showsTrend: false }
  }
}
