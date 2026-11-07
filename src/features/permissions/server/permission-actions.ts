"use server"

import { revalidatePath } from "next/cache"

import { requireActingProfile } from "@/features/groups/server/acting-profile"
import {
  grantLogPermission,
  revokeLogPermission,
} from "@/features/permissions/server/log-permission-writes"
import {
  setCadence,
  setRankingOptOut,
  setVisibility,
} from "@/features/permissions/server/member-settings-writes"
import { readCheckbox, readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function updateMemberSettingsAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")
  const field = readText(formData, "field")

  const params = { groupId, profileId }

  const result = await (async () => {
    switch (field) {
      case "visibility":
        return setVisibility(userId, params, readText(formData, "value"))
      case "rankingOptOut":
        return setRankingOptOut(userId, params, readCheckbox(formData, "value"))
      case "cadence":
        return setCadence(userId, params, readText(formData, "value"))
      default:
        return { ok: false as const, code: "invalid_input" as const, errorMessage: "Revisá los datos." }
    }
  })()

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function grantLogPermissionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()

  const result = await grantLogPermission(userId, profileId, {
    groupId: readText(formData, "groupId"),
    loggerProfileId: readText(formData, "memberId"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function revokeLogPermissionAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()

  const result = await revokeLogPermission(userId, profileId, {
    groupId: readText(formData, "groupId"),
    loggerProfileId: readText(formData, "memberId"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}
