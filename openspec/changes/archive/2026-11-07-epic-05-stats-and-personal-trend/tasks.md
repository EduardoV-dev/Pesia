# Tasks — Epic 5: Stats engine & personal trend

## 1. Pure stats math (US-5.5, US-5.3, US-5.9, US-5.1)

- [x] 1.1 Create `src/features/stats/trend-math.ts` with the named constants
      `DIRECTION_DEADBAND_KG_PER_WEEK = 0.3`, `ROLLING_WINDOW_DAYS = 7`,
      `MIN_DAILY_VALUES_PER_WINDOW = 2`, and the pure functions `dailyValue`,
      `rollingMean(daily, window = 7)`, `pctBodyMassChange`, `bmiValue`,
      `directionFromSeries`. No db, no React imports. Verify: module compiles with
      `pnpm run typecheck`.
- [x] 1.2 Unit tests for `directionFromSeries`: a flat week reports `stable`; a
      sustained movement ≥ 0.3 kg/week reports a direction; either end-window with
      fewer daily values than the floor, or an insufficiently covered span, reports
      insufficient data instead of a direction. Verify: `pnpm run test` deadband suite
      passes (US-5.5, G2 pinned constant).
- [x] 1.3 Unit tests for `dailyValue`, `rollingMean` (window edges, windows holding
      multiple readings), `pctBodyMassChange` (sign, zero/negative start guard) and
      `bmiValue` (170 cm / 70 kg ≈ 24.2; invalid height refused). Verify: `pnpm run
      test` (US-5.3 math, US-5.9 window floor, US-5.8 formula).
- [x] 1.4 Unit tests pinning `calculateGoalProgress` clamping and maintain-band
      results (the existing goals spec behaviour, now test-locked). Verify: `pnpm run
      test` (US-5.4, US-5.6, US-5.7 semantics).

## 2. Server composition + G10 (US-5.2, US-5.10, US-5.7, G10)

- [x] 2.1 Create `src/features/stats/compose-trend.ts`: the single server-side
      composition from `listEntriesForViewer` output to the trend view
      (`points`, `direction`, `pctChange`, `baselineKg`, `baselineLabel`,
      `progress`), using the latest rolling-mean weight as current and the goal
      baseline — or, with no goal, the earliest entry with its "primera pesada"
      label. Verify: unit tests over the composition with fixtures.
- [x] 2.2 Integration tests: composition against real Postgres over
      `listEntriesForViewer` — a viewer with no standing for the subject gets no
      data (G10, write≠read); goal math stays out of `EntryView`. Verify:
      `pnpm run test` integration suite.
- [x] 2.3 Unit tests for goal-relative wording source data: the same series fed
      against two opposite targets produces opposite direction outcomes out of the
      composition, and both come out with no moral argument attached. Verify:
      `pnpm run test` (G6, US-5.2).

## 3. Private BMI data (US-5.8, G4, G9)

- [x] 3.1 Add `heightCm integer null` and `bmiEnabled boolean not null default false`
      to `profiles`; `drizzle-kit generate`, review SQL, `drizzle-kit migrate` on
      5435. Verify: migration applies on the local database and re-runs clean
      (`pnpm run db:migrate`).
- [x] 3.2 Create `src/features/stats/server/bmi-writes.ts` with the opt-in/opt-out
      write: manager-gated like `goal-writes`, only the member's own login may
      toggle for a profile with a login, dependents refused (same copy pattern as
      `saveGoal`). Height validated positive and ≤ 250 cm. Verify: unit tests for
      the refusal matrix (G4 opt-in default, G9 dependent refusal).
- [x] 3.3 Integration test: toggling off stops the BMI value from being composed;
      toggling never grants any other read. Verify: `pnpm run test`.

## 4. Trend comp pick (US-5.1 — impeccable flow)

- [x] 4.1 Build the trend comp at `.impeccable/mocks/` against the pinned surface
      brief (sparkline with hollow dot markers over a dotted grid, heavy numerals,
      orange accent doing data only) with the screen's states: with-goal,
      maintain, no-target, dependent, insufficient data, BMI on/off. Verify: comp
      file exists and was put in front of the user for the pick.
- [x] 4.2 Record the picked comp in the surface brief before building the page.
      Verify: `.impeccable/surface-brief.md` notes the accepted layout.

## 5. Trend screen (US-5.1 … US-5.10 display surfaces)

- [x] 5.1 Create `src/app/(app)/trend/page.tsx` (gated by `getProfileForManager`)
      rendering the shared server `TrendSection` for the active profile, and reuse
      the section under the managed-profile detail page. Verify: `pnpm run lint` +
      `pnpm run typecheck` pass.
- [x] 5.2 The trend card: static SVG sparkline (hollow dot markers, dotted grid,
      orange only), `role="img"` with Spanish `aria-label`, visually-hidden text
      summary, readable at 360 px. Verify: copy review + a 360 px rendering check
      (US-5.1).
- [x] 5.3 Direction, percentage change and progress cards with the pinned Spanish
      wording ("Moviendo hacia tu objetivo" / "Alejándote de tu objetivo" /
      "Estable"), the baseline label ("desde el inicio de tu objetivo" or "desde tu
      primera pesada"), the 0–100 % progress, the maintain-band distance copied
      without verdict, and no raw two-reading delta anywhere (G2, G3, G5; US-5.2,
      US-5.3, US-5.4, US-5.6, US-5.7).
- [x] 5.4 The states as first-class content: no entries, insufficient data, no
      target (trend + direction + pct change, no progress bar, no deficiency
      framing) and dependent trend-only (no target, progress or BMI surfaces).
      Verify: rendering checks against fixtures (US-5.9, US-5.10, G9).
- [x] 5.5 BMI card: opt-in asks height, off by default, screening framing with the
      doctor pointer, no category labels, no colour coding, toggle-off hides the
      value. Verify: rendering checks + copy review (US-5.8, G4).

## 6. Guardrail copy review + acceptance

- [x] 6.1 Copy review of every new Spanish string against the pinned wording list:
      no verdict words, no "ganado/perdido", no nudges, goal direction words only;
      nothing English. Verify: review notes recorded in the epic acceptance.
- [x] 6.2 Run the full suite: `pnpm run test`, `pnpm run lint`, `pnpm run
      typecheck`; tick the epic's acceptance list in
      `docs/backlog/epics/epic-05-stats-and-personal-trend/epic.md`.

## Workflow follow-up

- Archive with `/openspec-archive-change epic-05-stats-and-personal-trend` after
  acceptance is ticked and checks pass.
- Commit on `development` with a conventional `feat(epic-05)` message.
