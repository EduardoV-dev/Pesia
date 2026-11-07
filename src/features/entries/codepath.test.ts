import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Task 1.4's codepath verification: the `entries` table is reachable only from
 * the assembler and the write module. Any other module reading rows directly
 * would be an unfiltered G10 route by construction.
 */
const RAW_ENTRY_QUERY_PATTERN = /\b(from|insert|update|delete)\(\s*entries\b/

const ALLOWED_ENTRY_MODULES = new Set([
  "src/features/entries/server/entry-access.ts",
  "src/features/entries/server/entry-writes.ts",
])

const SRC_ROOT = path.resolve(import.meta.dirname, "../../..")

function listSourceFiles(dir: string, relative = ""): string[] {
  const names = readdirSync(dir)
  const collected: string[] = []

  for (const name of names) {
    const absolutePath = path.join(dir, name)
    const relativePath = relative ? `${relative}/${name}` : name

    if (statSync(absolutePath).isDirectory()) {
      collected.push(...listSourceFiles(absolutePath, relativePath))
    } else if (/\.(ts|tsx)$/.test(name) && !relativePath.endsWith(".test.ts")) {
      collected.push(relativePath)
    }
  }

  return collected
}

describe("no module queries the entries table outside its named paths", () => {
  it("routes every entry read through the assembler", () => {
    const offenders: string[] = []

    for (const relativePath of listSourceFiles(SRC_ROOT)) {
      if (relativePath.startsWith("src/db/")) {
        continue
      }

      if (ALLOWED_ENTRY_MODULES.has(relativePath)) {
        continue
      }

      const contents = readFileSync(path.join(SRC_ROOT, relativePath), "utf8")

      if (RAW_ENTRY_QUERY_PATTERN.test(contents)) {
        offenders.push(relativePath)
      }
    }

    expect(offenders).toEqual([])
  })

  it("exposes no GET handler on the sync route", async () => {
    const route = (await import("@/app/api/entries/route")) as Record<string, unknown>

    expect(typeof route.POST).toBe("function")
    expect(route.GET).toBeUndefined()
    expect(route.HEAD).toBeUndefined()
  })
})
