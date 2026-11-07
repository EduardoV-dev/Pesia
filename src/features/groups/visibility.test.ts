import { describe, expect, it } from "vitest"

import { resolveVisibilityGrant } from "@/features/groups/visibility"

describe("resolveVisibilityGrant", () => {
  it("shows the name, the weight and the trend when everything is shared", () => {
    expect(resolveVisibilityGrant("weight_trend")).toEqual({
      showsName: true,
      showsWeight: true,
      showsTrend: true,
    })
  })

  it("shows the latest weight without the trend", () => {
    expect(resolveVisibilityGrant("latest_only")).toEqual({
      showsName: true,
      showsWeight: true,
      showsTrend: false,
    })
  })

  it("shows the name without any number", () => {
    expect(resolveVisibilityGrant("name_only")).toEqual({
      showsName: true,
      showsWeight: false,
      showsTrend: false,
    })
  })

  it("shows nothing at all when the member is private", () => {
    expect(resolveVisibilityGrant("private")).toEqual({
      showsName: false,
      showsWeight: false,
      showsTrend: false,
    })
  })
})
