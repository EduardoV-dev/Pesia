# Design

## Context

Epics 1–7 left the full product surface standing: Better Auth logins with Google,
profiles (own + managed dependents without login), groups with per-subject
visibility, entries with dual timestamps and denormalized attribution
(`recordedByUserId` deliberately has **no** FK so attribution outlives logins), the
stats engine, the G10 board assembler (`src/features/board/server/assemble-board.ts`),
and the reminder pipeline. The entry read primitive
`listEntriesForViewer` (`src/features/entries/server/entry-access.ts:39`) already
withholds other people's notes (`assembleView` shows a note only to its author) and
resolves `recordedByIsLegacy` via a left join on `user` — the legacy indicator
account deletion needs is already computed everywhere.

Schema facts that drive the decisions: `user` cascades to `session`, `account` and
`profiles`; `profiles` cascades to `goals`, `group_memberships`, `entries` (by
`profile_id`); `entries.recorded_by_user_id` has no FK and never cascades.
`deletedAt` soft-deletes entries. No settings page exists yet; the profile switcher
and profile pages exist under `(app)/profiles`. The app ships a single warm-peach
theme. Vitest runs unit + integration against real Postgres (44 files / 314 tests).

## Goals / Non-Goals

**Goals:**

- A member can take their data (JSON complete, CSV spreadsheet) without contacting
  anyone, honoring every privacy rule the app already enforces.
- A member can leave (delete account) and a guardian can remove a dependent, with
  consequences stated in plain Spanish *before* confirmation and other people's data
  untouched.
- The guardrails become a recorded, executable audit instead of a promise.
- Every screen passes keyboard/reader/contrast/360 px checks; legal pages exist.

**Non-Goals:**

- Group-wide export (v1.5), any format beyond JSON/CSV.
- Legal review or compliance advice — the pages are drafts from actual behaviour.
- Two-factor authentication, retention schedules, backups.
- Changing any read path's visibility semantics — export *reuses* them.

## Decisions

### D1 — Export reuses `listEntriesForViewer`; no second read path

The export assembles through the same G10 primitive the app already trusts: for each
profile the member manages, read with that profile as the viewer. This inherits note
privacy (foreign notes withheld at the source), legacy attribution and the
deleted-rows exclusion for free. Memberships, permissions (`can_log_for` rows where
the member's profiles appear on either side) and settings (profile fields, push
opt-ins) are read directly — they contain nothing visibility-bound. A second raw
export query would duplicate the one rule G10 exists to protect.

### D2 — One export route, `format` picks the renderer

`GET /api/export?format=json|csv` answers with a `Content-Disposition` attachment.
JSON is the complete export; CSV renders only the entry rows (measured ISO date,
recorded ISO date, weight with unit column, profile name, recorded-by name).
Award claims are not part of the spec'd export contents; they stay out (lazy: the
spec lists the seven sections, nothing more). If a member wants awards later, the
JSON shape is additive.

### D3 — Deletion rides the FK cascades already in the schema

Deleting the `user` row cascades sessions, accounts and the own profile; the profile
cascade removes its entries, goals and memberships. Entries recorded *about others*
survive because `recorded_by_user_id` has no FK — and `recordedByIsLegacy` turns
true automatically once the user row is gone. No tombstones, no "hidden entry"
markers (a marker would itself leak). Group notification without reason: the
observable state IS the notification — the member disappears from the member list
and history keeps the attributed name; no departure-reason state, no banner, no
inference. This is a scoped interpretation of US-8.4's "the group is notified";
flagged in the proposal for review. Push subscriptions/opt-ins for the deleted
`user_id` become inert rows (no FK by design); the sender already tolerates failed
endpoints.

### D4 — Dependent removal is a soft `removed_at`, not a delete

A hard delete would cascade the dependent's entries — rewriting a past others
already saw. `profiles.removed_at` (nullable timestamptz, one migration) marks the
removal: the weigh-in sheet, board cards, due rule and recordable-subject queries
filter `removed_at IS NULL`, while history reads keep including the entries. Only
guardians (profile managers) may remove; server-side check mirrors the manager
lookup the edit path already uses. Removal of one's *own* profile is not offered —
that is account deletion (one path per outcome).

### D5 — The audit is a document plus tests that cannot rot silently

`docs/audit/guardrail-audit.md` records each of G1–G10 with owner (product owner),
verification method and result. Executable checks: most already exist as tests from
Epics 5–7 (stats deadband, BMI privacy, dependent trend-only, G10 matrix, reminder
payload bounds) — the audit task is to verify they still cover the claim and add the
missing assertions (notably: no board response carries BMI for another member; no
reminder payload carries a numeric weight). Copy-bound guardrails (G3, G5, and the
direction wording) get a screen-by-screen review recorded in the document. The
document cites test files so a future regression is findable.

### D6 — Accessibility: fix on the existing screens, verify by checklist

Keyboard operability, accessible names on the sparkline/progress bars/weigh-in
sheet, focus management on profile switch and sheet close, and the 360 px pass are
verified screen by screen and recorded in the audit document. Contrast is checked
against the pinned palette (peach canvas, white cards, orange accent, near-black
ink) for WCAG AA — the pinned direction is not re-rolled if a token needs nudging
within its own hue. There is one shipped theme; the audit records that.

### D7 — Legal pages are static, Spanish, and written from the schema

`/privacidad` and `/terminos` are server-rendered static pages whose claims are
checked against `src/db/schema.ts` and the audit document: what is stored (profiles,
goals, entries, notes, memberships, subscriptions), what is shared (visibility
rules), what is never collected (calories, nothing health-related beyond weight),
and how to export/delete. Both state the not-a-medical-device and BMI-screening
plain-language lines. Draft quality, marked as needing professional review.

## Risks / Trade-offs

- **Deletion asymmetry surprises a member** → the confirmation screen carries the
  full removed/kept list before the confirm control (US-8.6) — this is the risk the
  epic itself names first.
- **Soft-removed profile leaks into a forgotten query** → a single source for
  "recordable subjects" filters `removed_at`; the integration tests cover sheet,
  board and due paths for removed profiles.
- **Export with a huge history** → bounded by a family's entries (hundreds, not
  millions); the route streams the CSV response without pagination. Revisit only if
  a real group outgrows it.
- **"Notified without reason" interpretation** → if the user wants an explicit
  in-app notice on the board instead of the observable-state reading, it is a
  small additive follow-up before archive.
