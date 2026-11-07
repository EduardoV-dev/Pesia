"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireActingProfile } from "@/features/groups/server/acting-profile"
import { acceptInvite, createInvite, revokeInvite } from "@/features/groups/server/invite-writes"
import { INVITE_KINDS, type InviteKind } from "@/features/groups/invite"
import { readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"

export async function createInviteAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")
  const kind = readText(formData, "kind")

  if (!INVITE_KINDS.includes(kind as InviteKind)) {
    return { errorMessage: "Elegí cómo invitar." }
  }

  const result = await createInvite(userId, profileId, groupId, kind as InviteKind)

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function revokeInviteAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const groupId = readText(formData, "groupId")

  const result = await revokeInvite(userId, profileId, groupId, readText(formData, "inviteId"))

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")

  return {}
}

export async function acceptInviteAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const token = readText(formData, "token")

  const result = await acceptInvite(userId, profileId, token)

  if (!result.ok) {
    return { errorMessage: result.errorMessage }
  }

  revalidatePath("/", "layout")
  redirect(`/groups/${result.groupId}`)
}
