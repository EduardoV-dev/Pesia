import { describe, expect, it } from "vitest"

import { readCheckbox, readText } from "@/lib/form-data"

describe("readText", () => {
  it("returns the value of a text field", () => {
    const formData = new FormData()
    formData.set("displayName", "Ana")

    expect(readText(formData, "displayName")).toBe("Ana")
  })

  it("returns an empty string when the field is missing", () => {
    expect(readText(new FormData(), "displayName")).toBe("")
  })
})

describe("readCheckbox", () => {
  it("is true when the checkbox is checked", () => {
    const formData = new FormData()
    formData.set("isDependent", "true")

    expect(readCheckbox(formData, "isDependent")).toBe(true)
  })

  it("is false when the checkbox is not submitted", () => {
    expect(readCheckbox(new FormData(), "isDependent")).toBe(false)
  })

  it("is true when the checked value comes after a hidden false", () => {
    const formData = new FormData()
    formData.append("isDependent", "false")
    formData.append("isDependent", "true")

    expect(readCheckbox(formData, "isDependent")).toBe(true)
  })
})
