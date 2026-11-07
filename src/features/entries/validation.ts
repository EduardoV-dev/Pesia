import { z } from "zod"

import { displayToKilograms, roundWeightKg, type WeightUnit } from "@/lib/weight-units"

export const WEIGHT_MINIMUM_KG = 1
export const WEIGHT_MAXIMUM_KG = 300
export const WEIGHT_RANGE_MESSAGE = "El peso debe estar entre 1 y 300 kg."
export const NOTE_MAX_LENGTH = 400
export const NOTE_MAX_LENGTH_MESSAGE = "La nota es muy larga."
export const FUTURE_MEASURED_MESSAGE = "El día de la pesada no puede ser futuro."
export const MAX_OPS_PER_BATCH = 50
export const MAX_OPS_PER_BATCH_MESSAGE = "Demasiadas pesadas por envío. Probá con menos."

/** One shared source of truth so the UI and the server refuse identical input. */
export const weightSchema = z.number({ error: WEIGHT_RANGE_MESSAGE }).refine(
  (weight) => weight >= WEIGHT_MINIMUM_KG && weight <= WEIGHT_MAXIMUM_KG,
  { error: WEIGHT_RANGE_MESSAGE },
)

export type WeightParseResult =
  | { readonly ok: true; readonly weightKg: number }
  | { readonly ok: false; readonly message: string }

/**
 * Parses the number the member typed in their display unit and returns the
 * canonical kilograms. Out-of-range input is refused, never clamped (G2).
 */
export function parseWeightInput(text: string, unit: WeightUnit): WeightParseResult {
  const trimmed = text.trim().replace(",", ".")

  if (trimmed === "") {
    return { ok: false, message: WEIGHT_RANGE_MESSAGE }
  }

  const value = Number(trimmed)

  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, message: "Escribí un número." }
  }

  const weightKg = roundWeightKg(displayToKilograms(value, unit))
  const parsed = weightSchema.safeParse(weightKg)

  if (!parsed.success) {
    return { ok: false, message: WEIGHT_RANGE_MESSAGE }
  }

  return { ok: true, weightKg: parsed.data }
}

export type NoteParseResult =
  | { readonly ok: true; readonly note: string | null }
  | { readonly ok: false; readonly message: string }

export function parseNoteInput(text: string): NoteParseResult {
  const trimmed = text.trim()

  if (trimmed === "") {
    return { ok: true, note: null }
  }

  if (trimmed.length > NOTE_MAX_LENGTH) {
    return { ok: false, message: NOTE_MAX_LENGTH_MESSAGE }
  }

  return { ok: true, note: trimmed }
}

/** Client-clock tolerance for a future `measured_at`; a slow clock stays valid. */
export const FUTURE_MEASURED_TOLERANCE_MS = 5 * 60 * 1000
