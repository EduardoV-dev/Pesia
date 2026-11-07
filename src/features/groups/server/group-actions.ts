"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireActingProfile } from "@/features/groups/server/acting-profile"
import {
  createGroup,
  deleteGroup,
  updateGroupSettings,
} from "@/features/groups/server/group-writes"
import { readCheckbox, readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function createGroupAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()

  const result = await createGroup(userId, profileId, { name: readText(formData, "name") })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")
  redirect(`/groups/${result.groupId}`)
}

export async function updateGroupSettingsAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")

  const result = await updateGroupSettings(userId, profileId, groupId, {
    weighInWeekday: readText(formData, "weighInWeekday"),
    weighInTime: readText(formData, "weighInTime"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function deleteGroupAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")

  const result = await deleteGroup(userId, profileId, groupId, {
    confirmed: readCheckbox(formData, "confirmed"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")
  redirect("/groups")
}
