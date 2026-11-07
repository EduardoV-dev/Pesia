import "server-only"

import { randomBytes, randomInt } from "node:crypto"

import { and, desc, eq, gt, isNull, or } from "drizzle-orm"

import { db } from "@/db/client"
import { invites, type Invite } from "@/db/schema"
import { SERVER_ENVIRONMENT } from "@/constants/environment-variables"
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_EXPIRY_MS,
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
  type InviteKind,
} from "@/features/groups/invite"
import { getOwnerMembership } from "@/features/groups/server/group-access"
import { addMemberToGroup } from "@/features/groups/server/membership-writes"
import { type GroupWriteCode, type GroupWriteResult } from "@/features/groups/server/write-result"
import { rebuildRolePermissions } from "@/features/permissions/server/log-permissions"

export type CreateInviteResult =
  | { readonly ok: true; readonly invite: Invite; readonly url: string }
  | {
      readonly ok: false
      readonly code: GroupWriteCode
      readonly errorMessage: string
    }

export type AcceptInviteResult =
  | { readonly ok: true; readonly groupId: string }
  | {
      readonly ok: false
      readonly code: GroupWriteCode
      readonly errorMessage: string
    }

export async function createInvite(
  userId: string,
  actorProfileId: string,
  groupId: string,
  kind: InviteKind,
): Promise<CreateInviteResult> {
  const ownerMembership = await getOwnerMembership(groupId, actorProfileId)

  if (!ownerMembership) {
    return {
      ok: false,
      code: "not_an_owner",
      errorMessage: "Solo la propiedad del grupo puede invitar a alguien.",
    }
  }

  const token = kind === "code" ? generateInviteCode() : randomBytes(32).toString("base64url")
  const expiresAt = kind === "code" ? new Date(Date.now() + INVITE_CODE_EXPIRY_MS) : null

  const [invite] = await db
    .insert(invites)
    .values({ groupId, kind, token, expiresAt })
    .returning()

  if (!invite) {
    throw new Error("No se pudo crear la invitación.")
  }

  return { ok: true, invite, url: buildInviteUrl(token) }
}

export async function revokeInvite(
  userId: string,
  actorProfileId: string,
  groupId: string,
  inviteId: string,
): Promise<GroupWriteResult> {
  const ownerMembership = await getOwnerMembership(groupId, actorProfileId)

  if (!ownerMembership) {
    return {
      ok: false,
      code: "not_an_owner",
      errorMessage: "Solo la propiedad del grupo puede revocar invitaciones.",
    }
  }

  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.id, inviteId), eq(invites.groupId, groupId)))

  return { ok: true }
}

/** The invitations of a group that still work. */
export async function listActiveInvites(groupId: string): Promise<Invite[]> {
  return db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.groupId, groupId),
        isNull(invites.revokedAt),
        or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date())),
      ),
    )
    .orderBy(desc(invites.createdAt))
}

/** The invitation a token points at, if it still works. */
export async function findUsableInvite(token: string): Promise<Invite | null> {
  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.revokedAt),
        or(isNull(invites.expiresAt), gt(invites.expiresAt, new Date())),
      ),
    )
    .limit(1)

  return invite ?? null
}

/** Joins the caller to the group the invitation points at, and to no other. */
export async function acceptInvite(
  userId: string,
  profileId: string,
  token: string,
): Promise<AcceptInviteResult> {
  const invite = await findUsableInvite(token)

  if (!invite) {
    return {
      ok: false,
      code: "not_found",
      errorMessage: "Esta invitación ya no sirve. Pedile una nueva a quien te invitó.",
    }
  }

  await joinThroughInvite(userId, profileId, invite)

  return { ok: true, groupId: invite.groupId }
}

/** Joins the caller with a code they read aloud. */
export async function joinGroupWithCode(
  userId: string,
  profileId: string,
  rawCode: string,
): Promise<AcceptInviteResult> {
  const code = normalizeInviteCode(rawCode)
  const invite = await findUsableInvite(code)

  if (!invite || invite.kind !== "code") {
    return {
      ok: false,
      code: "not_found",
      errorMessage: "Ese código no sirve. Revisalo o pedí uno nuevo.",
    }
  }

  await joinThroughInvite(userId, profileId, invite)

  return { ok: true, groupId: invite.groupId }
}

async function joinThroughInvite(
  userId: string,
  profileId: string,
  invite: Invite,
): Promise<void> {
  await db.transaction(async (transaction) => {
    await addMemberToGroup(transaction, invite.groupId, profileId)
    await rebuildRolePermissions(transaction, invite.groupId, userId)

    // A code is read aloud in a room: it is spent the moment it works.
    if (invite.kind === "code") {
      await transaction
        .update(invites)
        .set({ revokedAt: new Date() })
        .where(eq(invites.id, invite.id))
    }
  })
}

export function buildInviteUrl(token: string): string {
  return `${SERVER_ENVIRONMENT.BETTER_AUTH_URL}/invite/${token}`
}

function generateInviteCode(): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)],
  ).join("")
}
