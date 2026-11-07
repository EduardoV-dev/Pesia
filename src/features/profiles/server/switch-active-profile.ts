"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { setActiveProfileId } from "@/features/profiles/server/active-profile"
import { getProfileForManager } from "@/features/profiles/server/profile-access"
import { readText } from "@/lib/form-data"

export async function switchActiveProfileAction(formData: FormData): Promise<void> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const profile = await getProfileForManager(session.user.id, readText(formData, "profileId"))

  if (!profile) {
    throw new Error("Ese perfil no lo manejás.")
  }

  await setActiveProfileId(profile.id)

  revalidatePath("/", "layout")
}
