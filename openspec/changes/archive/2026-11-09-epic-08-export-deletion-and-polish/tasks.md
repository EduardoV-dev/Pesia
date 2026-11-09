# Tasks

Epic: `epic-08-export-deletion-and-polish`. Covers US-8.1 … US-8.8. Guardrails
G1–G10 all get their audit entry; G2/G4/G9/G10 gain executable checks; G3/G5 are a
recorded copy review.

## 1. Export assembly and rendering (US-8.1, US-8.2)

- [x] 1.1 Create `src/features/export/server/collect-export.ts`: assemble the
      member's export sections (managed profiles + settings, their goals, entries
      about them via `listEntriesForViewer`, memberships, permissions, push opt-ins)
      through the existing G10 primitives — no raw entries query. Integration tests:
      includes entries recorded by others about managed profiles; withholds foreign
      notes; excludes entries about people the member merely recorded.
- [x] 1.2 Create the JSON renderer and `GET /api/export?format=json` returning a
      download attachment; test that the file is valid, complete and reflects
      current state.
- [x] 1.3 Create the CSV renderer (one row per non-deleted entry: ISO measured date,
      ISO recorded date, weight with unit column, profile name, recorded-by name)
      and `?format=csv`; tests: deleted entries absent, unambiguous dates, unit
      labelled.
- [x] 1.4 Unauthenticated or format-less requests are refused; only the requesting
      member's own scope is ever collected.

## 2. The account surface (US-8.1, US-8.2, US-8.3 entry point)

- [x] 2.1 Create `src/app/(app)/cuenta/page.tsx`: export buttons (JSON, CSV), and
      the account-deletion entry point; Spanish copy, mobile-first, peach tokens.
- [x] 2.2 Keyboard + focus tests on the surface (tab order, visible focus).

## 3. Dependent profile removal (US-8.5)

- [x] 3.1 Add `profiles.removed_at` (nullable timestamptz) to `src/db/schema.ts`,
      generate and apply the migration.
- [x] 3.2 Create `src/features/profiles/server/remove-profile.ts`: guardian-only
      soft removal; integration tests: non-manager refused server-side; entries and
      history survive; profile gone from recordable subjects.
- [x] 3.3 Filter removed profiles out of the weigh-in sheet subjects, the board
      cards, and the due rule inputs; history reads keep including them.
      Integration tests for all three read paths plus the reminder scan.
- [x] 3.4 Add the remove action on the profile page for guardians with an explicit
      confirmation dialog stating the past stays visible; cancel loses nothing.

## 4. Account deletion (US-8.3, US-8.4, US-8.6)

- [x] 4.1 Create `src/features/account/server/delete-account.ts`: delete the user
      row and verify the cascade outcome; integration tests: sessions/login gone,
      own profile + entries about it gone, entries recorded about others remain and
      resolve `recordedByIsLegacy`, no reason state anywhere.
- [x] 4.2 Wire the deletion into the account surface with the plain-Spanish
      removed/kept disclosure shown before the confirm control; cancel is always
      available and changes nothing; after deletion the member is signed out and
      cannot sign back in.
- [x] 4.3 Test the group's view after a deletion: member absent from the member
      list, history attribution intact.

## 5. Guardrail audit (US-8.7)

- [x] 5.1 Write the executable gap-fillers: board responses carry no BMI for
      another member (G4), reminder payloads carry no numeric weight (G7), dependent
      responses carry no target/progress/rank/BMI (G9) — extend the existing suites
      where the claim is not yet asserted; run the Epic 6 G10 matrix as a gate.
- [x] 5.2 Create `docs/audit/guardrail-audit.md`: G1–G10 rows with owner,
      verification method (test file or screen review), result; screen-by-screen
      copy review for G3/G5 and the direction wording.
- [x] 5.3 G1 grep/review pass: no magnitude-ranking code outside the documented
      consistency/award rules; record the verdict in the document.

## 6. Accessibility and responsive pass (US-8.8)

- [x] 6.1 Keyboard operability across onboarding, weigh-in sheet, board, trend,
      profiles, cuenta; fix findings; record per screen in the audit document.
- [x] 6.2 Accessible names + text alternatives on the sparkline chart, progress
      bars and the weigh-in sheet (goal-relative wording, never a bare verdict).
- [x] 6.3 Focus management: profile switch, sheet open/close, navigation.
- [x] 6.4 360 px pass on every screen, no horizontal scroll; contrast check against
      WCAG AA for the pinned palette (single shipped theme, recorded as such).

## 7. Legal and trust surfaces (final epic AC)

- [x] 7.1 Create `/privacidad` and `/terminos` static pages in plain Spanish,
      written from the schema and the audit: collected, shared, never collected,
      how to export, how to delete; draft-review notice included.
- [x] 7.2 Add the not-a-medical-device and BMI-screening plain-language statements.

## 8. Close-out

- [x] 8.1 `pnpm run lint` and `pnpm run typecheck` clean; full suite green.
- [x] 8.2 Tick the epic's acceptance criteria in
      `docs/backlog/epics/epic-08-export-deletion-and-polish/epic.md`.
- [x] 8.3 Validate and archive the change; `openspec/specs/` gains `data-export`,
      `account-lifecycle`, `guardrail-audit`; commit on `development`.
