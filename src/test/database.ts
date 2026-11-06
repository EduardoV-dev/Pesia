import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { profiles, session, user, type Profile } from "@/db/schema"

export type TestUser = {
  readonly id: string
  readonly email: string
}

export type TestSession = {
  readonly token: string
  readonly userId: string
}

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
  overrides: Partial<Pick<Profile, "displayName" | "unit" | "isDependent">> = {},
): Promise<Profile> {
  const [profile] = await db
    .insert(profiles)
    .values({
      userId: testUser.id,
      displayName: overrides.displayName ?? "Persona de prueba",
      unit: overrides.unit ?? "kg",
      isDependent: overrides.isDependent ?? false,
    })
    .returning()

  if (!profile) {
    throw new Error("No se pudo crear el perfil de prueba.")
  }

  return profile
}

export async function deleteTestUser(testUser: TestUser): Promise<void> {
  await db.delete(session).where(eq(session.userId, testUser.id))
  await db.delete(profiles).where(eq(profiles.userId, testUser.id))
  await db.delete(user).where(eq(user.id, testUser.id))
}
