import { describe, expect, it } from "vitest"

import type { ReminderCandidate, ReminderGraph } from "./plan-reminders"
import { PLANNED_REMINDER_FIELDS, planReminders } from "./plan-reminders"

const TODAY_KEY = "2026-11-08"

function candidate(overrides: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    profileId: "profile-1",
    displayName: "Ana",
    isDependent: false,
    visibility: "weight_trend",
    cadenceDays: 7,
    joinedDayKey: "2026-01-01",
    lastMeasuredDayKey: "2026-11-01",
    ...overrides,
  }
}

function graph(overrides: Partial<ReminderGraph> = {}): ReminderGraph {
  return {
    weighInWeekday: 6,
    todayKey: TODAY_KEY,
    loggerProfileIdsBySubject: { "profile-1": ["profile-2"] },
    userIdsByProfile: { "profile-1": ["user-1"], "profile-2": ["user-2"] },
    optInUserIds: ["user-1", "user-2"],
    ...overrides,
  }
}

describe("planReminders", () => {
  it("plans one reminder per eligible recipient: own turn plus eligible loggers", () => {
    const plans = planReminders({ candidates: [candidate()], graph: graph() })

    expect(plans).toEqual([
      { recipientUserId: "user-1", subjectProfileId: "profile-1", subjectDisplayName: null },
      { recipientUserId: "user-2", subjectProfileId: "profile-1", subjectDisplayName: "Ana" },
    ])
  })

  it("plans the subject's own second-person turn without a name", () => {
    const plans = planReminders({
      candidates: [candidate()],
      graph: graph({ loggerProfileIdsBySubject: {} }),
    })

    expect(plans).toEqual([
      { recipientUserId: "user-1", subjectProfileId: "profile-1", subjectDisplayName: null },
    ])
  })

  it("prefers the own-turn copy over the named copy for the same user", () => {
    // user-1 owns the subject and also logs for it through profile-2.
    const plans = planReminders({
      candidates: [candidate()],
      graph: graph({
        userIdsByProfile: { "profile-1": ["user-1"], "profile-2": ["user-1"] },
      }),
    })

    expect(plans).toEqual([
      { recipientUserId: "user-1", subjectProfileId: "profile-1", subjectDisplayName: null },
    ])
  })

  it("skips candidates that are not due", () => {
    const plans = planReminders({
      candidates: [candidate({ lastMeasuredDayKey: "2026-11-06" })],
      graph: graph(),
    })

    expect(plans).toEqual([])
  })

  it("is never due without a cadence and without a group weekday", () => {
    const plans = planReminders({
      candidates: [candidate({ cadenceDays: null })],
      graph: graph({ weighInWeekday: null }),
    })

    expect(plans).toEqual([])
  })

  it("denies reminders to users who did not opt in (G7)", () => {
    const plans = planReminders({
      candidates: [candidate()],
      graph: graph({ optInUserIds: ["user-2"] }),
    })

    expect(plans).toEqual([
      { recipientUserId: "user-2", subjectProfileId: "profile-1", subjectDisplayName: "Ana" },
    ])

    const onlySelf = planReminders({
      candidates: [candidate()],
      graph: graph({ loggerProfileIdsBySubject: {}, optInUserIds: [] }),
    })

    expect(onlySelf).toEqual([])
  })

  it("a private subject is named to no one; only the own turn remains (G8)", () => {
    const plans = planReminders({
      candidates: [candidate({ visibility: "private" })],
      graph: graph(),
    })

    expect(plans).toEqual([
      { recipientUserId: "user-1", subjectProfileId: "profile-1", subjectDisplayName: null },
    ])
  })

  it("a name-only subject still reaches loggers with the name only", () => {
    const plans = planReminders({
      candidates: [candidate({ visibility: "name_only" })],
      graph: graph(),
    })

    expect(plans).toEqual([
      { recipientUserId: "user-1", subjectProfileId: "profile-1", subjectDisplayName: null },
      { recipientUserId: "user-2", subjectProfileId: "profile-1", subjectDisplayName: "Ana" },
    ])
  })

  it("a read right without a logging right plans nothing", () => {
    const plans = planReminders({
      candidates: [candidate()],
      graph: graph({ loggerProfileIdsBySubject: {} }),
    })

    expect(plans).not.toContainEqual(
      expect.objectContaining({ recipientUserId: "user-2" }),
    )
  })

  it("a dependent subject is only named to its loggers, never as an own turn (G7, G9)", () => {
    const plans = planReminders({
      candidates: [candidate({ isDependent: true })],
      graph: graph({ loggerProfileIdsBySubject: {} }),
    })

    expect(plans).toEqual([])
  })

  it("deduplicates several logging profiles behind one user", () => {
    const plans = planReminders({
      candidates: [candidate()],
      graph: graph({
        loggerProfileIdsBySubject: { "profile-1": ["profile-2", "profile-3"] },
        userIdsByProfile: {
          "profile-1": ["user-1"],
          "profile-2": ["user-2"],
          "profile-3": ["user-2"],
        },
      }),
    })

    expect(plans).toEqual([
      { recipientUserId: "user-1", subjectProfileId: "profile-1", subjectDisplayName: null },
      { recipientUserId: "user-2", subjectProfileId: "profile-1", subjectDisplayName: "Ana" },
    ])
  })
})

describe("G7 copy bound on the plan", () => {
  it("carries no field beyond the three name-and-turn fields", () => {
    const plans = planReminders({
      candidates: [candidate()],
      graph: graph({ optInUserIds: ["user-2"] }),
    })

    expect(plans).toHaveLength(1)
    expect(Object.keys(plans[0]!).sort()).toEqual([...PLANNED_REMINDER_FIELDS].sort())
  })

  it("carries no numeric server data in any plan", () => {
    const serialized = JSON.stringify(planReminders({ candidates: [candidate()], graph: graph() }))
    const values = [...serialized.matchAll(/"([-\d.]+)"/g)].map((match) => match[1])

    expect(values).toEqual([])
  })
})
