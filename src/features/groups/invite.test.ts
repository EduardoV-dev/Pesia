import { describe, expect, it } from "vitest"

import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/features/groups/invite"

describe("the invitation code", () => {
  it("leaves out the characters that get confused when read aloud", () => {
    expect(INVITE_CODE_ALPHABET).not.toContain("0")
    expect(INVITE_CODE_ALPHABET).not.toContain("O")
    expect(INVITE_CODE_ALPHABET).not.toContain("1")
    expect(INVITE_CODE_ALPHABET).not.toContain("l")
    expect(INVITE_CODE_ALPHABET).not.toContain("I")
  })

  it("accepts a code written in any case", () => {
    expect(isValidInviteCode("k7m2qx")).toBe(true)
    expect(isValidInviteCode("K7M2QX")).toBe(true)
  })

  it("reads a code the way it is written down", () => {
    expect(normalizeInviteCode(" k7m 2qx ")).toBe("K7M2QX")
  })

  it("refuses a code of the wrong length", () => {
    expect(isValidInviteCode("K7M2Q")).toBe(false)
    expect(isValidInviteCode("K7M2QXX")).toBe(false)
  })

  it("refuses a code with a character outside the alphabet", () => {
    expect(isValidInviteCode("K7M2Q0")).toBe(false)
    expect(isValidInviteCode("K7M2QO")).toBe(false)
  })

  it("is six characters long", () => {
    expect(INVITE_CODE_LENGTH).toBe(6)
  })
})
