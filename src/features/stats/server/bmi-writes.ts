import "server-only"

import { z } from "zod"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import { getProfileForManager } from "@/features/profiles/server/profile-access"

const MAX_HEIGHT_CM = 250

const heightSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().replace(",", ".") : value),
  z.coerce
    .number({ error: "Escribí tu altura en centímetros." })
    .int("Escribí la altura en centímetros enteros.")
    .positive("La altura tiene que ser mayor a cero.")
    .max(MAX_HEIGHT_CM, "La altura no puede superar los 250 centímetros."),
)

const bmiInputSchema = z.object({
  bmiEnabled: z.boolean(),
  heightCm: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    heightSchema.optional(),
  ),
})

export type SaveBmiReferenceInput = {
  readonly bmiEnabled: boolean
  readonly heightCm: string
}

export type BmiWriteCode = "invalid_input" | "not_managed" | "dependent_profile" | "not_own_login"

export type SaveBmiReferenceResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: BmiWriteCode
      readonly errorMessage: string
    }

/**
 * The write path for the optional private BMI reference. The same management
 * check gates it as every profile write, and a profile with a login can only be
 * toggled by that login's own user — a manager never decides it for them (G4).
 */
export async function saveBmiReference(
  userId: string,
  profileId: string,
  input: SaveBmiReferenceInput,
): Promise<SaveBmiReferenceResult> {
  const profile = await getProfileForManager(userId, profileId)

  if (!profile) {
    return {
      ok: false,
      code: "not_managed",
      errorMessage: "Ese perfil no lo manejás.",
    }
  }

  if (profile.isDependent) {
    return {
      ok: false,
      code: "dependent_profile",
      errorMessage: "Una persona a cargo no lleva referencia de IMC.",
    }
  }

  if (profile.userId !== null && profile.userId !== userId) {
    return {
      ok: false,
      code: "not_own_login",
      errorMessage: "Sólo la persona dueña del login puede cambiar este IMC.",
    }
  }

  const parsedInput = bmiInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos.",
    }
  }

  if (parsedInput.data.bmiEnabled && parsedInput.data.heightCm === undefined) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: "Escribí tu altura para activar el IMC.",
    }
  }

  await db
    .update(profiles)
    .set({
      bmiEnabled: parsedInput.data.bmiEnabled,
      ...(parsedInput.data.bmiEnabled && parsedInput.data.heightCm !== undefined
        ? { heightCm: parsedInput.data.heightCm }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profile.id))

  return { ok: true }
}
