"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { updateProfile } from "@/features/profiles/server/profile-writes"
import { readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function updateProfileAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const result = await updateProfile(session.user.id, readText(formData, "profileId"), {
    displayName: readText(formData, "displayName"),
    avatarEmoji: readText(formData, "avatarEmoji"),
    unit: readText(formData, "unit"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}
