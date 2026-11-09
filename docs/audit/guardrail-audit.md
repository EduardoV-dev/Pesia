# Guardrail audit — Epic 8

The ten guardrails from `docs/backlog/epics/README.md`, verified once as a gate for
Epic 8 and re-runnable from the cited tests at any time.

- **Owner**: product owner (Eduardo), with the test suite as the mechanical gate.
- **Method legend**: `test` = executable check in the suite; `test + screen review` =
  the code path is asserted and the rendered copy was read; `screen review` = copy
  verified by reading every rendered string.
- **Date**: 2026-11-09. Re-run the cited tests (or `pnpm vitest run`) after any
  change that touches the cited module.

| # | Guardrail | Verification | Result |
|---|-----------|--------------|--------|
| G1 | No ranking by magnitude of body change; rank behaviour only | `test + screen review` — `src/features/board/server/assemble-board.guards.test.ts` ("payload shape G1/US-6.10": no rank/ordinal/place keys, no `isBest`/`mostMoved`); grep pass over `.sort(` in `src/features/`: the only comparison sort is `assemble-board.ts:198` (consistency award tier + join order, never weight); chronological sorts elsewhere | PASS |
| G2 | No raw single-reading delta; rolling trend with deadband only | `test + screen review` — `src/features/stats/compose-trend.test.ts`, `trend-math.test.ts` (7-day mean, named deadband constant); screens show only trend direction, 7-day mean and baseline-relative percentage | PASS |
| G3 | Goal-relative, never moralised language | `screen review` — direction labels: "Moviendo hacia tu objetivo" / "Alejándote de tu objetivo" / "Estable" (`trend-section/index.tsx`, `goal-summary/index.tsx`); grep for `ganad/perdid/perder/lograste` in `src/`: zero hits; progress wording is "% del camino", never verdicts | PASS |
| G4 | BMI optional, off by default, private, never on the board | `test` — `src/features/stats/server/bmi-writes.test.ts` (opt-in, dependent refusal), `assemble-board.guards.test.ts` ("payload privacy keys G4/G9": with BMI enabled + height stored, the serialized board payload contains no `bmi`/`heightCm` key for any member) | PASS |
| G5 | No calorie or weight-loss nudges | `screen review` — grep for `calor/kcal/dieta/adelgaz/quemar` in `src/`: zero hits; no calorie data is collected at all (schema has no such column) | PASS |
| G6 | Goal direction derives from the member's own target, never defaulted to "lose" | `test` — `src/features/stats/compose-trend.test.ts` + `src/features/goals/` tests: direction computed from the stored goal (`maintain` and `gain` are first-class); profiles without a goal show a trend with no direction | PASS |
| G7 | Reminders opt-in, name whose turn, never a weight | `test` — `src/features/reminders/plan-reminders.test.ts:174` (plan keys are exactly recipient/subject/name), `scan.test.ts` (per-recipient eligibility, opt-in gate, dependents never self-reminded); notification copy renders from `PlannedReminder` only | PASS |
| G8 | Hidden members render as "private"; never infer a reason | `test` — `assemble-board.guards.test.ts` (private member owns no card, one placeholder, absent from due lists and counts), `entry-access.test.ts` (private subject → no entry view at all); no departure-reason state exists anywhere | PASS |
| G9 | Dependents trend-only: no target, progress, ranking or BMI | `test` — `assemble-board.guards.test.ts` (dependent card: no `progress`/`sparkline`/`awardTypes`/`isDue`/`rankingOptOut` keys, never in the strip; goal refusal + BMI refusal in `bmi-writes.test.ts`) | PASS |
| G10 | Visibility filtering enforced server-side on every read | `test (gate)` — the Epic 6 matrix: `src/features/board/server/assemble-board.test.ts` + `assemble-board.guards.test.ts` + `src/features/entries/server/entry-access.test.ts` (every visibility × viewer combination against real Postgres); architecture checks assert `listEntriesForViewer` is the only filtered read and every reading module is `server-only` | PASS |

## Screens reviewed for copy (G3/G5)

Onboarding, weigh-in sheet (empty/selected/stale/offline states), entry history
(edit/delete confirmations), trend section (direction pills, stat cards), board
(all five card kinds), group settings, member settings, profile editor, sign-in,
cuenta (export + deletion disclosure), privacidad, terminos. All direction copy is
goal-relative; all user-facing strings are Spanish.

## Accessibility pass (US-8.8) — same date

- **Keyboard**: every interactive element is a native `button`/`a`/`input`; the two
  destructive flows use Radix `AlertDialog` (focus trap, Escape, restore). No
  `onClick` on non-interactive elements.
- **Charts and progress**: sparkline is `role="img"` with a goal-relative
  `aria-label` (+ `sr-only` fallback when empty); the goal-progress bar is
  `role="progressbar"` with `aria-valuenow`/`aria-valuetext`; the weigh-in sheet's
  inputs are labelled, its member picker exposes `aria-pressed`.
- **Focus**: visible `:focus-visible` outline (2 px accent, offset 2) globally.
- **360 px**: single-column flex layouts, wrapping pill rows, no fixed widths, no
  horizontal scroll.
- **Contrast (WCAG AA, both themes)**: fixed on 2026-11-09 within the pinned
  palette — light `--ink-muted` `#8c817a → #6e645c` (3.79 → 5.77 on white), light
  `--accent` `#f97316 → #c2410c` (white button labels 2.80 → 5.18; sparkline UI
  2.80 → 5.18), light `--accent-strong` `→ #9a3412` (chips on accent-soft 3.19 → 6.55),
  dark `--destructive` `#b3261e → #ffb4a9` (2.24 → 8.63) with
  `--destructive-foreground: #1c1613`. One shipped warm-peach theme pair; every
  text token pair now ≥ 4.5:1.

## Legal surfaces (US-8.7 adjacent)

`/privacidad` and `/terminos` (Spanish, plain language) written from the schema and
this audit: collected / shared / never collected / export / deletion, plus the
not-a-medical-device and BMI-screening statements. Draft quality — flagged inside
both pages as needing professional review before launch.
