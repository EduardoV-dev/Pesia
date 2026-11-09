import { afterEach, describe, expect, it } from "vitest"

import { GET } from "./route"
import {
  createTestProfile,
  createTestSession,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "@/test/database"
import { createSessionCookieHeader } from "@/test/session-cookie"

const createdUsers: TestUser[] = []

afterEach(async () => {
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

async function createSessionCookie(): Promise<Headers> {
  const testUser = await createTestUser("Exportadora")
  createdUsers.push(testUser)
  await createTestProfile(testUser, { displayName: "Ana" })

  const testSession = await createTestSession(testUser)

  return createSessionCookieHeader(testSession.token)
}

describe("GET /api/export", () => {
  it("refuses an unauthenticated call", async () => {
    const response = await GET(new Request("http://localhost:3015/api/export?format=json"))

    expect(response.status).toBe(401)
  })

  it("refuses an unknown format", async () => {
    const sessionCookie = await createSessionCookie()

    const response = await GET(
      new Request("http://localhost:3015/api/export?format=xlsx", {
        headers: Object.fromEntries(sessionCookie.entries()),
      }),
    )

    expect(response.status).toBe(400)
  })

  it("downloads the JSON export as an attachment", async () => {
    const sessionCookie = await createSessionCookie()

    const response = await GET(
      new Request("http://localhost:3015/api/export?format=json", {
        headers: Object.fromEntries(sessionCookie.entries()),
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-disposition")).toContain("attachment")
    expect(response.headers.get("content-type")).toContain("application/json")

    const body = (await response.json()) as { profiles: unknown[]; exportedAt: string }

    expect(body.profiles).toHaveLength(1)
    expect(body.exportedAt).toBeTruthy()
  })

  it("downloads the CSV export as an attachment", async () => {
    const sessionCookie = await createSessionCookie()

    const response = await GET(
      new Request("http://localhost:3015/api/export?format=csv", {
        headers: Object.fromEntries(sessionCookie.entries()),
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/csv")
    expect(response.headers.get("content-disposition")).toContain("mis-pesadas.csv")
    expect(await response.text()).toContain("perfil,día de la pesada")
  })
})
