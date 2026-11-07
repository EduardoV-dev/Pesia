import "server-only"

import { z } from "zod"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, groups, groupSettings } from "@/db/schema"
import { getOwnerMembership } from "@/features/groups/server/group-access"
import { type GroupWriteCode, type GroupWriteResult } from "@/features/groups/server/write-result"
import { rebuildRolePermissions } from "@/features/permissions/server/log-permissions"

const createGroupInputSchema = z.object({
  name: z.string().trim().min(1, "Escribí un nombre para el grupo.").max(60, "El nombre es muy largo."),
})

const updateGroupSettingsInputSchema = z.object({
  weighInWeekday: z.coerce
    .number({ error: "Elegí un día." })
    .int()
    .min(0, "Elegí un día.")
    .max(6, "Elegí un día."),
  weighInTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Escribí la hora como HH:MM.")
    .or(z.literal("")),
})

export type CreateGroupInput = {
  readonly name: string
}

export type CreateGroupResult =
  | { readonly ok: true; readonly groupId: string }
  | {
      readonly ok: false
      readonly code: GroupWriteCode
      readonly errorMessage: string
    }

export type UpdateGroupSettingsInput = {
  readonly weighInWeekday: string
  readonly weighInTime: string
}

export async function createGroup(
  userId: string,
  profileId: string,
  input: CreateGroupInput,
): Promise<CreateGroupResult> {
  const parsedInput = createGroupInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos.",
    }
  }

  const groupId = await db.transaction(async (transaction) => {
    const [group] = await transaction
      .insert(groups)
      .values({
        name: parsedInput.data.name,
        createdByUserId: userId,
        timezone: resolveTimezone(),
      })
      .returning()

    if (!group) {
      throw new Error("No se pudo crear el grupo.")
    }

    await transaction.insert(groupSettings).values({ groupId: group.id })
    await transaction
      .insert(groupMemberships)
      .values({ groupId: group.id, profileId, role: "owner" })
    await rebuildRolePermissions(transaction, group.id, userId)

    return group.id
  })

  return { ok: true, groupId }
}

export async function updateGroupSettings(
  userId: string,
  profileId: string,
  groupId: string,
  input: UpdateGroupSettingsInput,
): Promise<GroupWriteResult> {
  const ownerMembership = await getOwnerMembership(groupId, profileId)

  if (!ownerMembership) {
    return {
      ok: false,
      code: "not_an_owner",
      errorMessage: "Solo la propiedad del grupo puede cambiar estos ajustes.",
    }
  }

  const parsedInput = updateGroupSettingsInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: parsedInput.error.issues[0]?.message ?? "Revisá los datos.",
    }
  }

  await db
    .update(groupSettings)
    .set({
      weighInWeekday: parsedInput.data.weighInWeekday,
      weighInTime: parsedInput.data.weighInTime === "" ? null : parsedInput.data.weighInTime,
    })
    .where(eq(groupSettings.groupId, groupId))

  return { ok: true }
}

export type DeleteGroupInput = {
  readonly confirmed: boolean
}

export async function deleteGroup(
  userId: string,
  profileId: string,
  groupId: string,
  input: DeleteGroupInput,
): Promise<GroupWriteResult> {
  const ownerMembership = await getOwnerMembership(groupId, profileId)

  if (!ownerMembership) {
    return {
      ok: false,
      code: "not_an_owner",
      errorMessage: "Solo la propiedad del grupo puede eliminarlo.",
    }
  }

  if (!input.confirmed) {
    return {
      ok: false,
      code: "invalid_input",
      errorMessage: "Confirmá la eliminación para continuar.",
    }
  }

  await db.delete(groups).where(eq(groups.id, groupId))

  return { ok: true }
}

function resolveTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}
