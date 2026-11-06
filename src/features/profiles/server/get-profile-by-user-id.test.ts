import { afterEach, describe, expect, it } from "vitest"

import { getProfileByUserId } from "@/features/profiles/server/get-profile-by-user-id"
import { createTestProfile, createTestUser, deleteTestUser, type TestUser } from "@/test/database"

const createdUsers: TestUser[] = []

afterEach(async () => {
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

describe("getProfileByUserId", () => {
  it("returns null when the signed-in user has no profile yet", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)

    const profile = await getProfileByUserId(testUser.id)

    expect(profile).toBeNull()
  })

  it("returns the profile that belongs to the signed-in user", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    await createTestProfile(testUser, { displayName: "Ana", unit: "lb" })

    const profile = await getProfileByUserId(testUser.id)

    expect(profile?.displayName).toBe("Ana")
    expect(profile?.unit).toBe("lb")
    expect(profile?.isDependent).toBe(false)
  })

  it("does not return the profile of another user", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    await createTestProfile(owner, { displayName: "Luis" })

    const profile = await getProfileByUserId(other.id)

    expect(profile).toBeNull()
  })

  it("keeps a managed profile reachable without a login", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    await createTestProfile(testUser, { displayName: "Abuela", isDependent: false })

    const profile = await getProfileByUserId(testUser.id)

    expect(profile?.displayName).toBe("Abuela")
  })
})
