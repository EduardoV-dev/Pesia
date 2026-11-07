import { afterEach, describe, expect, it, vi } from "vitest"

const VALID_VALUES = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5435/weight_tracker_test",
  BETTER_AUTH_SECRET: "secreto-de-prueba-suficientemente-largo-32",
  BETTER_AUTH_URL: "http://localhost:3010",
  GOOGLE_CLIENT_ID: "cliente-de-prueba",
  GOOGLE_CLIENT_SECRET: "secreto-de-prueba",
} as const

const REQUIRED_VARIABLES = Object.keys(VALID_VALUES) as (keyof typeof VALID_VALUES)[]

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function importEnvironmentModuleWith(missingVariable: string) {
  vi.resetModules()
  vi.stubEnv(missingVariable, "")

  for (const variable of REQUIRED_VARIABLES) {
    if (variable !== missingVariable) {
      vi.stubEnv(variable, VALID_VALUES[variable])
    }
  }

  return import("@/constants/environment-variables")
}

describe("environment variables", () => {
  it.each(REQUIRED_VARIABLES)("fails naming %s when it is missing", async (missingVariable) => {
    await expect(importEnvironmentModuleWith(missingVariable)).rejects.toThrow(missingVariable)
  })

  it("fails with a message the user can act on", async () => {
    const importPromise = importEnvironmentModuleWith("DATABASE_URL")

    await expect(importPromise).rejects.toThrow(/env\.example/)
  })

  it("loads when every required variable is present", async () => {
    vi.resetModules()

    for (const variable of REQUIRED_VARIABLES) {
      vi.stubEnv(variable, VALID_VALUES[variable])
    }

    const environmentModule = await import("@/constants/environment-variables")

    expect(environmentModule.SERVER_ENVIRONMENT.DATABASE_URL).toBe(VALID_VALUES.DATABASE_URL)
  })
})
