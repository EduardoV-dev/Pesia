import { afterEach, describe, expect, it } from "vitest"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { profileManagers, profiles } from "@/db/schema"
import {
  createOwnProfile,
  createProfileForOthers,
  updateProfile,
} from "@/features/profiles/server/profile-writes"
import {
  createTestManagedProfile,
  createTestProfile,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "@/test/database"

const createdUsers: TestUser[] = []

afterEach(async () => {
  await Promise.all(createdUsers.splice(0).map((testUser) => deleteTestUser(testUser)))
})

describe("createOwnProfile", () => {
  it("creates a profile linked to the login and makes the owner its manager", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)

    const result = await createOwnProfile(testUser.id, {
      displayName: "Ana",
      unit: "kg",
      isDependent: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.profile.userId).toBe(testUser.id)
    expect(result.profile.displayName).toBe("Ana")
    expect(result.profile.isDependent).toBe(false)

    const managers = await db
      .select()
      .from(profileManagers)
      .where(eq(profileManagers.profileId, result.profile.id))

    expect(managers.map((manager) => manager.userId)).toEqual([testUser.id])
  })

  it("does not create a second own profile", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    await createTestProfile(testUser, { displayName: "Ana" })

    const result = await createOwnProfile(testUser.id, {
      displayName: "Otra",
      unit: "kg",
      isDependent: false,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("already_exists")
  })

  it("rejects a blank display name", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)

    const result = await createOwnProfile(testUser.id, {
      displayName: "   ",
      unit: "kg",
      isDependent: false,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("invalid_input")
    expect(result.errorMessage).toBe("Escribí un nombre.")
  })
})

describe("createProfileForOthers", () => {
  it("creates a profile without a login and makes the creator its manager", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)

    const result = await createProfileForOthers(testUser.id, {
      displayName: "Abuela",
      unit: "lb",
      isDependent: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.profile.userId).toBeNull()
    expect(result.profile.unit).toBe("lb")

    const managers = await db
      .select()
      .from(profileManagers)
      .where(eq(profileManagers.profileId, result.profile.id))

    expect(managers.map((manager) => manager.userId)).toEqual([testUser.id])
  })

  it("creates a dependent profile", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)

    const result = await createProfileForOthers(testUser.id, {
      displayName: "Mara",
      unit: "kg",
      isDependent: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.profile.isDependent).toBe(true)
  })
})

describe("updateProfile", () => {
  it("changes the display name, the avatar and the unit", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestManagedProfile(testUser, { displayName: "Abuela" })

    const result = await updateProfile(testUser.id, profile.id, {
      displayName: "Marta",
      avatarEmoji: "👵",
      unit: "lb",
    })

    expect(result.ok).toBe(true)

    const [updatedProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profile.id))

    expect(updatedProfile?.displayName).toBe("Marta")
    expect(updatedProfile?.avatarEmoji).toBe("👵")
    expect(updatedProfile?.unit).toBe("lb")
  })

  it("rejects a blank display name", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestManagedProfile(testUser, { displayName: "Abuela" })

    const result = await updateProfile(testUser.id, profile.id, {
      displayName: "  ",
      avatarEmoji: "",
      unit: "kg",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("invalid_input")
  })

  it("refuses to update a profile the caller does not manage", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    const ownedProfile = await createTestProfile(owner, { displayName: "Luis" })

    const result = await updateProfile(other.id, ownedProfile.id, {
      displayName: "Intruso",
      avatarEmoji: "",
      unit: "kg",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_managed")
  })
})
