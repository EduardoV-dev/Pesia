import { describe, expect, it } from "vitest"

import { type Profile } from "@/db/schema"
import { pickActiveProfile } from "@/features/profiles/server/active-profile"

function buildProfile(overrides: Partial<Profile>): Profile {
  return {
    id: "profile-id",
    userId: null,
    displayName: "Persona",
    unit: "kg",
    avatarEmoji: null,
    isDependent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe("pickActiveProfile", () => {
  it("picks the profile the cookie names when the caller manages it", () => {
    const own = buildProfile({ id: "own", userId: "user-id" })
    const managed = buildProfile({ id: "managed" })

    const activeProfile = pickActiveProfile([own, managed], "managed")

    expect(activeProfile?.id).toBe("managed")
  })

  it("falls back to the own profile when the cookie names an unmanaged profile", () => {
    const own = buildProfile({ id: "own", userId: "user-id" })

    const activeProfile = pickActiveProfile([own], "a-profile-of-somebody-else")

    expect(activeProfile?.id).toBe("own")
  })

  it("falls back to the own profile when there is no cookie", () => {
    const own = buildProfile({ id: "own", userId: "user-id" })
    const managed = buildProfile({ id: "managed" })

    const activeProfile = pickActiveProfile([own, managed], null)

    expect(activeProfile?.id).toBe("own")
  })

  it("returns null when the caller manages no profile", () => {
    expect(pickActiveProfile([], "any-profile")).toBeNull()
  })
})
