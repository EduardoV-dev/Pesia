import { type WeightUnit } from "@/lib/weight-units"

import { type EntryView } from "./entry-view"

/** One loggable roster member of the weigh-in sheet. */
export type WeighInSheetMember = {
  readonly profileId: string
  readonly displayName: string
  readonly avatarEmoji: string | null
  readonly unit: WeightUnit
  readonly isDependent: boolean
  readonly isViewerProfile: boolean
}

/** Everything the sheet needs, produced server-side and reused by the offline shell. */
export type WeighInSheetData = {
  readonly groupId: string
  readonly timezone: string
  readonly viewerProfileId: string
  readonly members: readonly WeighInSheetMember[]
  readonly today: readonly EntryView[]
}

/** The per-subject payload rendered on `profiles/[profileId]` and offline. */
export type EntryHistoryData = {
  readonly subject: {
    readonly profileId: string
    readonly displayName: string
    readonly avatarEmoji: string | null
    readonly unit: WeightUnit
    readonly isDependent: boolean
  }
  readonly timezone: string
  readonly entries: readonly EntryView[]
}

export const QUEUED_BADGE_LABEL = "Pendiente de envío"
export const SAVED_BADGE_LABEL = "Guardado"
export const FAILED_BADGE_LABEL = "No se pudo sincronizar"
export const OFFLINE_STALENESS_MESSAGE = "sin conexión — datos guardados en tu dispositivo"
