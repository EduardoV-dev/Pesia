"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { removeProfile } from "./remove-profile"
import { type FormState } from "@/lib/form-state"

export async function removeProfileAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const profileId = formData.get("profileId")

  if (typeof profileId !== "string" || profileId === "") {
    return { errorMessage: "Ese perfil no lo manejás." }
  }

  const result = await removeProfile(session.user.id, profileId)

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")
  redirect("/profiles")
}
