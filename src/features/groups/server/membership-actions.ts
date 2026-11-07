"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireActingProfile } from "@/features/groups/server/acting-profile"
import { joinGroupWithCode } from "@/features/groups/server/invite-writes"
import {
  changeMemberRole,
  leaveGroup,
  removeMember,
  transferOwnership,
} from "@/features/groups/server/membership-writes"
import { readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function changeMemberRoleAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")

  const result = await changeMemberRole(userId, profileId, groupId, readText(formData, "memberId"), {
    role: readText(formData, "role"),
  })

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function transferOwnershipAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")

  const result = await transferOwnership(
    userId,
    profileId,
    groupId,
    readText(formData, "memberId"),
  )

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function removeMemberAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")

  const result = await removeMember(userId, profileId, groupId, readText(formData, "memberId"))

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function leaveGroupAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")

  const result = await leaveGroup(userId, profileId, groupId)

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")
  redirect("/groups")
}

export async function joinGroupWithCodeAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()

  const result = await joinGroupWithCode(userId, profileId, readText(formData, "code"))

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")
  redirect(`/groups/${result.groupId}`)
}
