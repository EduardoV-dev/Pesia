import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"

import { db } from "@/db/client"
import { profileManagers, profiles, session, user, type Profile } from "@/db/schema"

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
