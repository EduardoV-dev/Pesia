import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/db/client"
import { profiles } from "@/db/schema"
import {
  getManagedProfiles,
  getProfileForManager,
  getSelfProfile,
} from "@/features/profiles/server/profile-access"
import {
  createTestManagedProfile,
  createTestProfile,
  createTestUser,
  deleteTestProfile,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

const createdUsers: TestUser[] = []

afterEach(async () => {
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

describe("getManagedProfiles", () => {
  it("returns the own profile and the profiles the caller manages", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    await createTestProfile(testUser, { displayName: "Ana" })
    await createTestManagedProfile(testUser, { displayName: "Abuela" })

    const managedProfiles = await getManagedProfiles(testUser.id)
    const displayNames = managedProfiles.map((profile) => profile.displayName).sort()

    expect(displayNames).toEqual(["Abuela", "Ana"])
  })

  it("does not return a profile of another user", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    await createTestProfile(owner, { displayName: "Luis" })

    const managedProfiles = await getManagedProfiles(other.id)

    expect(managedProfiles).toHaveLength(0)
  })

  it("does not return a profile without a manager row", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const [orphan] = await db
      .insert(profiles)
      .values({ displayName: "Sin dueño", unit: "kg" })
      .returning()

    const managedProfiles = await getManagedProfiles(testUser.id)

    expect(managedProfiles.map((profile) => profile.id)).not.toContain(orphan?.id)

    await deleteTestProfile(orphan!.id)
  })

  it("lets one login manage several profiles while owning only one", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    await createTestProfile(testUser, { displayName: "Ana" })
    await createTestManagedProfile(testUser, { displayName: "Abuela" })
    await createTestManagedProfile(testUser, { displayName: "Mara", isDependent: true })

    const managedProfiles = await getManagedProfiles(testUser.id)
    const ownedProfiles = managedProfiles.filter((profile) => profile.userId === testUser.id)

    expect(managedProfiles).toHaveLength(3)
    expect(ownedProfiles).toHaveLength(1)
  })
})

describe("getProfileForManager", () => {
  it("returns the profile when the caller manages it", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const managedProfile = await createTestManagedProfile(testUser, { displayName: "Abuela" })

    const profile = await getProfileForManager(testUser.id, managedProfile.id)

    expect(profile?.displayName).toBe("Abuela")
  })

  it("returns null for a profile the caller does not manage", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    const ownedProfile = await createTestProfile(owner, { displayName: "Luis" })

    const profile = await getProfileForManager(other.id, ownedProfile.id)

    expect(profile).toBeNull()
  })
})

describe("getSelfProfile", () => {
  it("returns only the profile linked to the login", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    await createTestProfile(testUser, { displayName: "Ana" })
    await createTestManagedProfile(testUser, { displayName: "Abuela" })

    const profile = await getSelfProfile(testUser.id)

    expect(profile?.displayName).toBe("Ana")
  })

  it("returns null when the login has no own profile", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    await createTestManagedProfile(testUser, { displayName: "Abuela" })

    const profile = await getSelfProfile(testUser.id)

    expect(profile).toBeNull()
  })
})
