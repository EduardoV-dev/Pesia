import { afterEach, describe, expect, it } from "vitest"

import { desc, eq } from "drizzle-orm"

import { db } from "@/db/client"
import { goals } from "@/db/schema"
import { saveGoal } from "@/features/goals/server/goal-writes"
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

describe("saveGoal", () => {
  it("derives the direction from the target and stores the baseline", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    const result = await saveGoal(testUser.id, profile.id, {
      currentWeight: "80",
      targetWeight: "70",
      direction: "lose",
      band: "",
    })

    expect(result.ok).toBe(true)

    const storedGoal = await db
      .select()
      .from(goals)
      .where(eq(goals.profileId, profile.id))

    expect(storedGoal).toHaveLength(1)
    expect(storedGoal[0]?.direction).toBe("lose")
    expect(storedGoal[0]?.targetWeightKg).toBe(70)
    expect(storedGoal[0]?.baselineWeightKg).toBe(80)
    expect(storedGoal[0]?.active).toBe(true)
  })

  it("derives a gain goal from a target above the current weight", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    await saveGoal(testUser.id, profile.id, {
      currentWeight: "72.5",
      targetWeight: "80",
      direction: "gain",
      band: "",
    })

    const [storedGoal] = await db.select().from(goals).where(eq(goals.profileId, profile.id))

    expect(storedGoal?.direction).toBe("gain")
  })

  it("stores the band of a maintain goal", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    await saveGoal(testUser.id, profile.id, {
      currentWeight: "72",
      targetWeight: "72",
      direction: "maintain",
      band: "2",
    })

    const [storedGoal] = await db.select().from(goals).where(eq(goals.profileId, profile.id))

    expect(storedGoal?.direction).toBe("maintain")
    expect(storedGoal?.targetWeightKg).toBe(72)
    expect(storedGoal?.bandKg).toBe(2)
  })

  it("keeps the previous goal as history and resets the baseline on a change", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    await saveGoal(testUser.id, profile.id, {
      currentWeight: "80",
      targetWeight: "70",
      direction: "lose",
      band: "",
    })
    await saveGoal(testUser.id, profile.id, {
      currentWeight: "75",
      targetWeight: "72",
      direction: "lose",
      band: "",
    })

    const storedGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.profileId, profile.id))
      .orderBy(desc(goals.createdAt))

    expect(storedGoals).toHaveLength(2)
    expect(storedGoals[0]?.active).toBe(true)
    expect(storedGoals[0]?.baselineWeightKg).toBe(75)
    expect(storedGoals[0]?.targetWeightKg).toBe(72)
    expect(storedGoals[1]?.active).toBe(false)
    expect(storedGoals[1]?.baselineWeightKg).toBe(80)
  })

  it("refuses a goal for a dependent profile", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestManagedProfile(testUser, { isDependent: true })

    const result = await saveGoal(testUser.id, profile.id, {
      currentWeight: "30",
      targetWeight: "28",
      direction: "lose",
      band: "",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("dependent_profile")

    const storedGoals = await db.select().from(goals).where(eq(goals.profileId, profile.id))

    expect(storedGoals).toHaveLength(0)
  })

  it("refuses a goal on a profile the caller does not manage", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    createdUsers.push(owner, other)
    const ownedProfile = await createTestProfile(owner)

    const result = await saveGoal(other.id, ownedProfile.id, {
      currentWeight: "80",
      targetWeight: "70",
      direction: "lose",
      band: "",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not_managed")
  })

  it("rejects a target that does not match the chosen direction", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    const result = await saveGoal(testUser.id, profile.id, {
      currentWeight: "80",
      targetWeight: "90",
      direction: "lose",
      band: "",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("invalid_input")
  })

  it("rejects a maintain goal without a band", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser)

    const result = await saveGoal(testUser.id, profile.id, {
      currentWeight: "72",
      targetWeight: "72",
      direction: "maintain",
      band: "",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errorMessage).toBe("Escribí el margen que querés mantener.")
  })

  it("stores the weight in kilograms when the profile uses pounds", async () => {
    const testUser = await createTestUser()
    createdUsers.push(testUser)
    const profile = await createTestProfile(testUser, { unit: "lb" })

    await saveGoal(testUser.id, profile.id, {
      currentWeight: "150",
      targetWeight: "140",
      direction: "lose",
      band: "",
    })

    const [storedGoal] = await db.select().from(goals).where(eq(goals.profileId, profile.id))

    expect(storedGoal?.baselineWeightKg).toBe(68.04)
    expect(storedGoal?.targetWeightKg).toBe(63.5)
  })
})
