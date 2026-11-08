import { afterEach, describe, expect, it, vi } from "vitest"

import { scanReminderGroups } from "@/features/reminders/server/scan"
import type { ReminderScanCounts } from "@/features/reminders/server/scan"

vi.mock("@/features/reminders/server/scan", () => ({
  scanReminderGroups: vi.fn(),
}))

import { GET } from "./route"

const ZERO_COUNTS: ReminderScanCounts = {
  groupsScanned: 0,
  remindersPlanned: 0,
  pushesSent: 0,
  subscriptionsReaped: 0,
  sendFailures: 0,
}

const authorizedRequest = (secret: string): Request =>
  new Request("http://localhost/api/cron/reminder-scan", {
    headers: { authorization: `Bearer ${secret}` },
  })

afterEach(() => {
  vi.unstubAllEnvs()
  vi.mocked(scanReminderGroups).mockReset()
})

describe("the reminder-scan cron route", () => {
  it("refuses a call without the trigger secret and never scans", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret")

    const response = await GET(authorizedRequest("wrong"))

    expect(response.status).toBe(401)
    expect(scanReminderGroups).not.toHaveBeenCalled()
  })

  it("refuses a call when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "")

    const response = await GET(authorizedRequest(""))

    expect(response.status).toBe(401)
    expect(scanReminderGroups).not.toHaveBeenCalled()
  })

  it("runs the scan with the secret and reports the counts", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    vi.mocked(scanReminderGroups).mockResolvedValue(ZERO_COUNTS)

    const response = await GET(authorizedRequest("s3cret"))

    expect(response.status).toBe(200)
    expect(scanReminderGroups).toHaveBeenCalledTimes(1)
    expect(await response.json()).toMatchObject({ ok: true })
  })
})
