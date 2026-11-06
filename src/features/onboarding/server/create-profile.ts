"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { getSession } from "@/auth/session"
import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import { getProfileByUserId } from "@/features/profiles/server/get-profile-by-user-id"

const profileInputSchema = z.object({
  displayName: z.string().trim().min(1, "Escribí un nombre.").max(60, "El nombre es muy largo."),
  unit: z.enum(["kg", "lb"]),
})

export type CreateProfileState = {
  readonly errorMessage?: string
}

export async function createProfileAction(
  _previousState: CreateProfileState,
  formData: FormData,
): Promise<CreateProfileState> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const existingProfile = await getProfileByUserId(session.user.id)

  if (existingProfile) {
    redirect("/home")
  }

  const parsedInput = profileInputSchema.safeParse({
    displayName: formData.get("displayName"),
    unit: formData.get("unit"),
  })

  if (!parsedInput.success) {
    return { errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos." }
  }

  await db.insert(profiles).values({
    userId: session.user.id,
    displayName: parsedInput.data.displayName,
    unit: parsedInput.data.unit,
  })

  redirect("/home")
}
