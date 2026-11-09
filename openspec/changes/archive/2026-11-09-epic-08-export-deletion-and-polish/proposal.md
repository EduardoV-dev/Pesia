# Proposal

Epic: `epic-08-export-deletion-and-polish` — covers US-8.1 through US-8.8.

## Why

Epics 1–7 shipped the whole product surface, but members cannot take their data with
them and cannot leave. A product built so comparison never becomes shame has to prove
it: the ten guardrails become a recorded audit with executable checks, every screen
passes an accessibility pass, and the legal promises people are owed (privacy policy,
terms, not-a-medical-device statement) exist before there are real users.

## What Changes

- **Data export (`data-export` capability).** A member can download everything the
  app holds about them, generated on request:
  - **JSON** (complete): every profile they manage (own + managed), every goal of
    those profiles, every non-deleted entry recorded *about* those profiles
    (including entries somebody else typed), their group memberships, their
    permissions, and their settings. Notes written by other recorders are withheld —
    a note is private to its author at every level, including inside exports.
  - **CSV** (spreadsheet): one row per entry about the managed profiles — measured
    date, recorded date, weight with its unit, profile, who recorded it. ISO dates;
    deleted entries absent.
  - The export never includes entries about other people the member merely recorded:
    those belong to them.
- **Account lifecycle (`account-lifecycle` capability).**
  - **Delete my account** from the account surface, behind an explicit confirmation
    that states, in plain Spanish, what is removed (login, sessions, own profile,
    entries recorded about me) and what stays (entries I recorded about other people,
    attributed permanently with a legacy indicator — already guaranteed by the
    `entries` spec). The group's observable state reflects the departure — the member
    is gone from the member list, history attribution keeps the name — and no reason
    is ever shown.
  - **Remove a dependent profile** by its guardian, behind an explicit confirmation:
    future recording stops (gone from the weigh-in sheet, cannot be recorded against,
    excluded from due rules), while history already seen by others stays.
- **Guardrail audit (`guardrail-audit` capability).** G1–G10 become a recorded
  checklist (owner + verification method + result) in `docs/audit/guardrail-audit.md`,
  backed by executable checks where feasible; G10 runs the Epic 6 integration matrix
  as a gate. Includes the accessibility pass (keyboard operability, accessible names
  on charts/progress/weigh-in sheet, focus management, 360 px, WCAG AA contrast) and
  the legal surfaces: `/privacidad`, `/terminos`, and the plain-language
  not-a-medical-device statement, all written from the schema and the audit.

## Capabilities

### New Capabilities

- `data-export`: The on-request export of a member's own data as complete JSON and
  spreadsheet-friendly CSV, scoped to the profiles they manage, honoring note privacy
  and entry attribution.
- `account-lifecycle`: Account deletion with its deliberate asymmetry (explained
  before confirmation), the fate of other people's data, and guardian removal of a
  dependent profile that stops future recording without rewriting the past.
- `guardrail-audit`: The final product audit — the G1–G10 checklist with executable
  checks, the accessibility pass, and the legal/trust surfaces in Spanish.

## Impact

- `src/features/export/` (new): export assembly over the existing G10 read
  primitives (`listEntriesForViewer` already withholds foreign notes and resolves
  legacy attribution), JSON and CSV rendering.
- `src/features/account/` (new): account deletion orchestration (relies on the
  schema's existing FK cascades: user → sessions/accounts/profiles; profile →
  entries/goals/memberships) and dependent soft-removal.
- `src/db/schema.ts` + one migration: `profiles.removed_at` (soft removal for
  managed profiles). `recorded_by_*` already outlives logins — no change there.
- `src/app/(app)/cuenta` (new): the account surface — export buttons, account
  deletion flow. Dependent removal lives on the existing profile page for guardians.
- `src/app/privacidad`, `src/app/terminos` (new): static Spanish legal pages.
- `docs/audit/guardrail-audit.md` (new) plus audit-focused tests where gaps exist.
- `AGENTS.md` epic table: this is the last epic; archiving it completes the backlog.
