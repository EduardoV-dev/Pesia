"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { saveBmiReference } from "@/features/stats/server/bmi-writes"
import { readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function saveBmiReferenceAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const result = await saveBmiReference(session.user.id, readText(formData, "profileId"), {
    bmiEnabled: readText(formData, "bmiEnabled") === "true",
    heightCm: readText(formData, "heightCm"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}
