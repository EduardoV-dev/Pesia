import "server-only"

import { z } from "zod"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { profileManagers, profiles, type Profile } from "@/db/schema"
import { getProfileForManager, getSelfProfile } from "@/features/profiles/server/profile-access"

const createProfileInputSchema = z.object({
  displayName: z.string().trim().min(1, "Escribí un nombre.").max(60, "El nombre es muy largo."),
  unit: z.enum(["kg", "lb"], { error: "Elegí una unidad." }),
  isDependent: z.boolean(),
})

const updateProfileInputSchema = z.object({
  displayName: z.string().trim().min(1, "Escribí un nombre.").max(60, "El nombre es muy largo."),
  avatarEmoji: z
    .string()
    .trim()
    .max(8, "El emoji es muy largo.")
    .transform((value) => (value === "" ? null : value)),
  unit: z.enum(["kg", "lb"], { error: "Elegí una unidad." }),
})

export type CreateProfileInput = {
  readonly displayName: string
  readonly unit: string
  readonly isDependent: boolean
}

export type UpdateProfileInput = {
  readonly displayName: string
  readonly avatarEmoji: string
  readonly unit: string
}

export type ProfileWriteCode = "invalid_input" | "already_exists" | "not_managed"

export type ProfileWriteResult =
  | { readonly ok: true; readonly profile: Profile }
  | {
      readonly ok: false
      readonly code: ProfileWriteCode
      readonly errorMessage: string
    }

export type ProfileUpdateResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: ProfileWriteCode
      readonly errorMessage: string
    }

export async function createOwnProfile(
  userId: string,
  input: CreateProfileInput,
): Promise<ProfileWriteResult> {
  const existingProfile = await getSelfProfile(userId)

  if (existingProfile) {
    return {
      ok: false,
      code: "already_exists",
      errorMessage: "Ya tenés un perfil propio.",
    }
  }

  const parsedInput = createProfileInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos.",
    }
  }

  const profile = await insertProfile({
    userId,
    displayName: parsedInput.data.displayName,
    unit: parsedInput.data.unit,
    isDependent: false,
    managerId: userId,
  })

  return { ok: true, profile }
}

export async function createProfileForOthers(
  userId: string,
  input: CreateProfileInput,
): Promise<ProfileWriteResult> {
  const parsedInput = createProfileInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos.",
    }
  }

  const profile = await insertProfile({
    userId: null,
    displayName: parsedInput.data.displayName,
    unit: parsedInput.data.unit,
    isDependent: parsedInput.data.isDependent,
    managerId: userId,
  })

  return { ok: true, profile }
}

export async function updateProfile(
  userId: string,
  profileId: string,
  input: UpdateProfileInput,
): Promise<ProfileUpdateResult> {
  const profile = await getProfileForManager(userId, profileId)

  if (!profile) {
    return {
      ok: false,
      code: "not_managed",
      errorMessage: "Ese perfil no lo manejás.",
    }
  }

  const parsedInput = updateProfileInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos.",
    }
  }

  await db
    .update(profiles)
    .set({
      displayName: parsedInput.data.displayName,
      avatarEmoji: parsedInput.data.avatarEmoji,
      unit: parsedInput.data.unit,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, profile.id))

  return { ok: true }
}

type InsertProfileParams = {
  readonly userId: string | null
  readonly displayName: string
  readonly unit: "kg" | "lb"
  readonly isDependent: boolean
  readonly managerId: string
}

async function insertProfile(params: InsertProfileParams): Promise<Profile> {
  return db.transaction(async (transaction) => {
    const [profile] = await transaction
      .insert(profiles)
      .values({
        userId: params.userId,
        displayName: params.displayName,
        unit: params.unit,
        isDependent: params.isDependent,
      })
      .returning()

    if (!profile) {
      throw new Error("No se pudo crear el perfil.")
    }

    await transaction
      .insert(profileManagers)
      .values({ profileId: profile.id, userId: params.managerId })

    return profile
  })
}
