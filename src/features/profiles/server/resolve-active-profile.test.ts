import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveActiveProfile } from "@/features/profiles/server/active-profile"
import {
  createTestLinkedProfileWithoutManager,
  createTestManagedProfile,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}))

const createdUsers: TestUser[] = []

afterEach(async () => {
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

describe("resolveActiveProfile", () => {
  it("keeps a profile linked to the login reachable without a management link", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const legacyProfile = await createTestLinkedProfileWithoutManager(testUser, {
      displayName: "Ana",
    })

    const activeProfile = await resolveActiveProfile(testUser.id)

    expect(activeProfile?.id).toBe(legacyProfile.id)
  })

  it("falls back to the own profile when there is no cookie", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const ownProfile = await createTestLinkedProfileWithoutManager(testUser, {
      displayName: "Ana",
    })
    await createTestManagedProfile(testUser, { displayName: "Abuela" })

    const activeProfile = await resolveActiveProfile(testUser.id)

    expect(activeProfile?.id).toBe(ownProfile.id)
  })

  it("returns null when the user has no profile at all", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)

    const activeProfile = await resolveActiveProfile(testUser.id)

    expect(activeProfile).toBeNull()
  })
})
