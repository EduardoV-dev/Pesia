/** The personal weigh-in cadence, in days. `null` means no personal cadence. */
export const CADENCE_OPTIONS = [7, 14, 30, null] as const

export type CadenceDays = (typeof CADENCE_OPTIONS)[number]

export const CADENCE_LABELS: Record<"weekly" | "biweekly" | "monthly" | "none", string> = {
  weekly: "Cada semana",
  biweekly: "Cada dos semanas",
  monthly: "Cada mes",
  none: "Sin ritmo",
}

export type CadenceKey = "weekly" | "biweekly" | "monthly" | "none"

export function getCadenceKey(cadenceDays: number | null): CadenceKey {
  switch (cadenceDays) {
    case 7:
      return "weekly"
    case 14:
      return "biweekly"
    case 30:
      return "monthly"
    default:
      return "none"
  }
}

export function getCadenceDays(cadenceKey: CadenceKey): CadenceDays {
  switch (cadenceKey) {
    case "weekly":
      return 7
    case "biweekly":
      return 14
    case "monthly":
      return 30
    case "none":
      return null
  }
}
