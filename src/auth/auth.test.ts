import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"

import { auth } from "@/auth/auth"
import { db } from "@/db/client"
import { session } from "@/db/schema"
import { createSessionCookieHeader } from "@/test/session-cookie"
import { createTestSession, createTestUser, deleteTestUser, type TestUser } from "@/test/database"

const createdUsers: TestUser[] = []

afterEach(async () => {
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

async function sessionCookie(token: string): Promise<Headers> {
  return createSessionCookieHeader(token)
}

describe("session resolution", () => {
  it("resolves a session that exists in the database", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const testSession = await createTestSession(testUser)

    const resolvedSession = await auth.api.getSession({
      headers: await sessionCookie(testSession.token),
    })

    expect(resolvedSession?.user.id).toBe(testUser.id)
  })

  it("does not resolve a session for an unknown token", async () => {
    const resolvedSession = await auth.api.getSession({
      headers: await sessionCookie("a-token-that-was-never-issued"),
    })

    expect(resolvedSession).toBeNull()
  })

  it("does not resolve a session when no cookie is sent", async () => {
    const resolvedSession = await auth.api.getSession({ headers: new Headers() })

    expect(resolvedSession).toBeNull()
  })

  it("does not resolve an expired session", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const testSession = await createTestSession(testUser)

    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(session.token, testSession.token))

    const resolvedSession = await auth.api.getSession({
      headers: await sessionCookie(testSession.token),
    })

    expect(resolvedSession).toBeNull()
  })

  it("keeps each session scoped to the token that created it", async () => {
    const firstUser = await createTestUser()
    const secondUser = await createTestUser()
    createdUsers.push(firstUser, secondUser)
    const firstSession = await createTestSession(firstUser)
    const secondSession = await createTestSession(secondUser)

    const resolvedFirst = await auth.api.getSession({
      headers: await sessionCookie(firstSession.token),
    })
    const resolvedSecond = await auth.api.getSession({
      headers: await sessionCookie(secondSession.token),
    })

    expect(resolvedFirst?.user.id).toBe(firstUser.id)
    expect(resolvedSecond?.user.id).toBe(secondUser.id)
  })
})
