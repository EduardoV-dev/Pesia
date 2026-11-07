export const INVITE_KINDS = ["link", "code"] as const

export type InviteKind = (typeof INVITE_KINDS)[number]

/** No `0`/`O`, no `1`/`l`/`I`: the code is read aloud, so it must survive a room. */
export const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

export const INVITE_CODE_LENGTH = 6

export const INVITE_CODE_EXPIRY_HOURS = 24

export const INVITE_CODE_EXPIRY_MS = INVITE_CODE_EXPIRY_HOURS * 60 * 60 * 1000

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]/g, "")
}

export function isValidInviteCode(value: string): boolean {
  const code = normalizeInviteCode(value)

  if (code.length !== INVITE_CODE_LENGTH) {
    return false
  }

  return [...code].every((character) => INVITE_CODE_ALPHABET.includes(character))
}
