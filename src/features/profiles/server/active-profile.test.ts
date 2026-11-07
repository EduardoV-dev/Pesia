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

    const activeProfile = pickActiveProfile({
      managedProfiles: [own, managed],
      activeProfileId: "managed",
      selfProfile: own,
    })

    expect(activeProfile?.id).toBe("managed")
  })

  it("falls back to the own profile when the cookie names an unmanaged profile", () => {
    const own = buildProfile({ id: "own", userId: "user-id" })

    const activeProfile = pickActiveProfile({
      managedProfiles: [own],
      activeProfileId: "a-profile-of-somebody-else",
      selfProfile: own,
    })

    expect(activeProfile?.id).toBe("own")
  })

  it("falls back to the own profile when there is no cookie", () => {
    const own = buildProfile({ id: "own", userId: "user-id" })
    const managed = buildProfile({ id: "managed" })

    const activeProfile = pickActiveProfile({
      managedProfiles: [own, managed],
      activeProfileId: null,
      selfProfile: own,
    })

    expect(activeProfile?.id).toBe("own")
  })

  it("keeps the own profile reachable when it has no management link", () => {
    const selfProfile = buildProfile({ id: "own", userId: "user-id" })

    const activeProfile = pickActiveProfile({
      managedProfiles: [],
      activeProfileId: null,
      selfProfile,
    })

    expect(activeProfile?.id).toBe("own")
  })

  it("returns null when the caller manages no profile", () => {
    expect(
      pickActiveProfile({ managedProfiles: [], activeProfileId: "any-profile", selfProfile: null }),
    ).toBeNull()
  })
})
