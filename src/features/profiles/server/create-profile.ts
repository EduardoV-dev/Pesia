"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { createOwnProfile, createProfileForOthers } from "@/features/profiles/server/profile-writes"
import { readCheckbox, readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function createOwnProfileAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const result = await createOwnProfile(session.user.id, {
    displayName: readText(formData, "displayName"),
    unit: readText(formData, "unit"),
    isDependent: false,
  })

  if (!result.ok) {
    if (result.code === "already_exists") {
      redirect("/home")
    }

    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  redirect("/home")
}

export async function createManagedProfileAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const result = await createProfileForOthers(session.user.id, {
    displayName: readText(formData, "displayName"),
    unit: readText(formData, "unit"),
    isDependent: readCheckbox(formData, "isDependent"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  redirect(`/profiles/${result.profile.id}`)
}
