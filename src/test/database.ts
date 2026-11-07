import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"

import { db } from "@/db/client"
import { groupMemberships, groups, profileManagers, profiles, session, user, type Profile } from "@/db/schema"
import { type GroupRole } from "@/features/groups/roles"
import { createGroup } from "@/features/groups/server/group-writes"
import { rebuildRolePermissions } from "@/features/permissions/server/log-permissions"

export type TestUser = {
  readonly id: string
  readonly email: string
}

export type TestSession = {
  readonly token: string
  readonly userId: string
}

export type TestProfileOverrides = Partial<
  Pick<Profile, "displayName" | "unit" | "isDependent" | "avatarEmoji">
>

export async function createTestUser(displayName = "Persona de prueba"): Promise<TestUser> {
  const id = randomUUID()
  const email = `${id}@example.test`

  await db.insert(user).values({
    id,
    name: displayName,
    email,
    emailVerified: true,
  })

  return { id, email }
}

export async function createTestSession(testUser: TestUser): Promise<TestSession> {
  const token = randomUUID()

  await db.insert(session).values({
    id: randomUUID(),
    token,
    userId: testUser.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  })

  return { token, userId: testUser.id }
}

export async function createTestProfile(
  testUser: TestUser,
  overrides: TestProfileOverrides = {},
): Promise<Profile> {
  return insertTestProfile(testUser.id, testUser.id, overrides)
}

export async function createTestManagedProfile(
  testUser: TestUser,
  overrides: TestProfileOverrides = {},
): Promise<Profile> {
  return insertTestProfile(null, testUser.id, overrides)
}

/** The shape Epic 1 left behind: linked to a login, with no management row. */
export async function createTestLinkedProfileWithoutManager(
  testUser: TestUser,
  overrides: TestProfileOverrides = {},
): Promise<Profile> {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId: testUser.id,
      displayName: overrides.displayName ?? "Persona de prueba",
      unit: overrides.unit ?? "kg",
      isDependent: overrides.isDependent ?? false,
      avatarEmoji: overrides.avatarEmoji ?? null,
    })
    .returning()

  if (!profile) {
    throw new Error("No se pudo crear el perfil de prueba.")
  }

  return profile
}

async function insertTestProfile(
  userId: string | null,
  managerId: string,
  overrides: TestProfileOverrides,
): Promise<Profile> {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId,
      displayName: overrides.displayName ?? "Persona de prueba",
      unit: overrides.unit ?? "kg",
      isDependent: overrides.isDependent ?? false,
      avatarEmoji: overrides.avatarEmoji ?? null,
    })
    .returning()

  if (!profile) {
    throw new Error("No se pudo crear el perfil de prueba.")
  }

  await db.insert(profileManagers).values({ profileId: profile.id, userId: managerId })

  return profile
}

export async function deleteTestProfile(profileId: string): Promise<void> {
  await db.delete(profiles).where(eq(profiles.id, profileId))
}

/** A group whose owner is the given profile, created through the real write path. */
export async function createTestGroup(
  testUser: TestUser,
  ownerProfile: Profile,
  name = "Familia de prueba",
): Promise<string> {
  const result = await createGroup(testUser.id, ownerProfile.id, { name })

  if (!result.ok) {
    throw new Error(result.errorMessage)
  }

  return result.groupId
}

/** Puts a profile in a group with a role and rebuilds the role permissions. */
export async function addTestGroupMember(
  groupId: string,
  profileId: string,
  role: GroupRole,
): Promise<void> {
  await db.transaction(async (transaction) => {
    await transaction
      .insert(groupMemberships)
      .values({ groupId, profileId, role })
      .onConflictDoUpdate({
        target: [groupMemberships.groupId, groupMemberships.profileId],
        set: { role, leftAt: null },
      })

    await rebuildRolePermissions(transaction, groupId, "test-user")
  })
}

export async function deleteTestGroup(groupId: string): Promise<void> {
  await db.delete(groups).where(eq(groups.id, groupId))
}

export async function deleteTestUser(testUser: TestUser): Promise<void> {
  const managedProfiles = await db
    .select({ profileId: profileManagers.profileId })
    .from(profileManagers)
    .where(eq(profileManagers.userId, testUser.id))

  const managedProfileIds = managedProfiles.map((managedProfile) => managedProfile.profileId)

  if (managedProfileIds.length > 0) {
    await db.delete(profiles).where(inArray(profiles.id, managedProfileIds))
  }

  await db.delete(session).where(eq(session.userId, testUser.id))
  await db.delete(user).where(eq(user.id, testUser.id))
}
