import "server-only"

import { z } from "zod"

import { and, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { goals } from "@/db/schema"
import { deriveGoalDirection, type GoalDirection } from "@/features/goals/direction"
import { getProfileForManager } from "@/features/profiles/server/profile-access"
import { displayToKilograms, roundWeightKg } from "@/lib/weight-units"

const weightValueSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().replace(",", ".") : value),
  z.coerce.number({ error: "Escribí un número." }).positive("El peso tiene que ser mayor a cero."),
)

const goalInputSchema = z.object({
  currentWeight: weightValueSchema,
  targetWeight: weightValueSchema,
  direction: z.enum(["lose", "gain", "maintain"], { error: "Elegí un objetivo." }),
  band: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .coerce.number({ error: "Escribí un número." })
      .positive("El margen tiene que ser mayor a cero.")
      .optional(),
  ),
})

export type SaveGoalInput = {
  readonly currentWeight: string
  readonly targetWeight: string
  readonly direction: string
  readonly band: string
}

export type GoalWriteCode = "invalid_input" | "not_managed" | "dependent_profile"

export type SaveGoalResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: GoalWriteCode
      readonly errorMessage: string
    }

export async function saveGoal(
  userId: string,
  profileId: string,
  input: SaveGoalInput,
): Promise<SaveGoalResult> {
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
      errorMessage: "Una persona a cargo se registra sin objetivo.",
    }
  }

  const parsedInput = goalInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos.",
    }
  }

  const currentWeightKg = roundWeightKg(
    displayToKilograms(parsedInput.data.currentWeight, profile.unit),
  )
  const targetWeightKg = roundWeightKg(displayToKilograms(parsedInput.data.targetWeight, profile.unit))

  const direction = resolveDirection(parsedInput.data.direction, currentWeightKg, targetWeightKg)

  if (!direction.ok) {
    return { ok: false, code: "invalid_input", errorMessage: direction.errorMessage }
  }

  if (direction.value === "maintain" && parsedInput.data.band === undefined) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: "Escribí el margen que querés mantener.",
    }
  }

  const bandKg =
    direction.value === "maintain"
      ? roundWeightKg(displayToKilograms(parsedInput.data.band ?? 0, profile.unit))
      : null

  await db.transaction(async (transaction) => {
    await transaction
      .update(goals)
      .set({ active: false })
      .where(and(eq(goals.profileId, profile.id), eq(goals.active, true)))

    await transaction.insert(goals).values({
      profileId: profile.id,
      direction: direction.value,
      targetWeightKg,
      bandKg,
      baselineWeightKg: currentWeightKg,
      baselineAt: new Date(),
      active: true,
    })
  })

  return { ok: true }
}

type ResolvedDirection =
  | { readonly ok: true; readonly value: GoalDirection }
  | { readonly ok: false; readonly errorMessage: string }

function resolveDirection(
  chosenDirection: GoalDirection,
  currentWeightKg: number,
  targetWeightKg: number,
): ResolvedDirection {
  if (chosenDirection === "maintain") {
    return { ok: true, value: "maintain" }
  }

  const derivedDirection = deriveGoalDirection(currentWeightKg, targetWeightKg)

  if (derivedDirection === chosenDirection) {
    return { ok: true, value: derivedDirection }
  }

  const errorMessage =
    chosenDirection === "lose"
      ? "El peso objetivo tiene que ser menor que tu peso actual."
      : "El peso objetivo tiene que ser mayor que tu peso actual."

  return { ok: false, errorMessage }
}
