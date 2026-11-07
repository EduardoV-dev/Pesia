import { describe, expect, it } from "vitest"

import {
  formatMeasuredAt,
  formatRecordedAt,
  groupDayKey,
  instantWithNowTimeOfDay,
  safeTimeZone,
  todayKeyInTimeZone,
} from "./entry-format"

describe("group day and instant math", () => {
  it("keeps the measured day stable across timezones", () => {
    const instant = instantWithNowTimeOfDay("2026-11-06", "America/Argentina/Buenos_Aires")

    expect(groupDayKey(instant, "America/Argentina/Buenos_Aires")).toBe("2026-11-06")
    expect(groupDayKey(instant, "UTC")).toBe("2026-11-06")
  })

  it("returns an instant in the past for today across offset bands", () => {
    for (const timeZone of ["UTC", "America/Santiago", "Asia/Shanghai", "Pacific/Kiritimati"]) {
      const instant = instantWithNowTimeOfDay(todayKeyInTimeZone(timeZone), timeZone)

      expect(instant.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000)
    }
  })

  it("falls back to UTC for unknown zone names instead of throwing", () => {
    expect(safeTimeZone("Mars/Olympus")).toBe("UTC")
    expect(groupDayKey(new Date("2026-11-06T23:30:00Z"), "Mars/Olympus")).toBe("2026-11-06")
  })
})

describe("Spanish timestamp rendering", () => {
  it("formats measured and recorded distinctly", () => {
    const measured = new Date("2026-11-01T03:00:00Z")
    const recorded = new Date("2026-11-02T00:34:00Z")

    expect(formatMeasuredAt(measured, "UTC")).toBe("1 nov")
    expect(formatRecordedAt(recorded, "UTC")).toBe("2 nov, 12:34 a. m.")
  })
})
