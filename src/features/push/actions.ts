"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/auth/session"
import { setReminderOptIn } from "@/features/push/server/opt-in-writes"
import { readCheckbox, readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

/**
 * The server truth of the reminder consent: user-level, per group. Server
 * actions are untrusted entries, so the membership check runs inside the write
 * (G7: nothing is stored or removed for a non-member).
 */
export async function setReminderOptInAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSession()

  if (!session) {
    return { errorMessage: "Necesitás iniciar sesión." }
  }

  const groupId = readText(formData, "groupId")

  if (!groupId) {
    return { errorMessage: "Falta el grupo del recordatorio." }
  }

  const result = await setReminderOptIn(session.user.id, { groupId }, readCheckbox(formData, "enabled"))

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}
