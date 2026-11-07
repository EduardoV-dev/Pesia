export type GroupWriteCode =
  | "invalid_input"
  | "not_a_member"
  | "not_an_owner"
  | "owner_must_transfer"
  | "last_owner"
  | "dependent_profile"
  | "not_found"

export type GroupWriteResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly code: GroupWriteCode
      readonly errorMessage: string
    }
