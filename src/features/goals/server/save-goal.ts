"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { saveGoal } from "@/features/goals/server/goal-writes"
import { readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function saveGoalAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  const result = await saveGoal(session.user.id, readText(formData, "profileId"), {
    currentWeight: readText(formData, "currentWeight"),
    targetWeight: readText(formData, "targetWeight"),
    direction: readText(formData, "direction"),
    band: readText(formData, "band"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}
