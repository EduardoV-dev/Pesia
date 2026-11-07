# Design — Epic 5: Stats engine & personal trend

## Context

Epic 4 shipped the entry write path and the G10 assembler `listEntriesForViewer`
(`src/features/entries/server/entry-access.ts`). Epic 2 already shipped the goal model
(`goals.direction/targetWeightKg/bandKg/baselineWeightKg/baselineAt/active`, superseded
on change, history kept) and its progress semantics: `src/features/goals/progress.ts`
computes `calculateGoalProgress` / `calculateMaintainProgress` clamped 0–100 with
direction keys `toward_goal | away_from_goal | stable`, and the Spanish wording lives in
`GoalSummary` ("Moviendo hacia tu objetivo" / "Alejándote de tu objetivo" / "Estable").

What does not exist: any stats module, a trend screen, the deadband — `GoalSummary` is a
placeholder that feeds the baseline back as the "current" weight — `pctBodyMassChange`,
gap handling, height/BMI profile fields, and any chart.

There is no `src/features/stats/`. The only existing pure math is
`src/features/goals/progress.ts` (unit-testable, untested so far) and
`src/lib/weight-units.ts`.

## Goals / Non-Goals

**Goals:**

- Pure, unit-tested stats functions with zero UI dependency.
- One trend composition server-side that reuses `listEntriesForViewer` for every read.
- The member trend screen: smoothed line + raw points, goal-relative direction with the
  deadband, percentage change, progress/maintain reuse, no-target and dependent views.
- Optional private BMI behind an opt-in stored on the profile.

**Non-Goals:**

- The group board and awards (Epic 6 renders others' trends; this epic never surfaces a
  trend outside the member's own/managed view).
- Reminders (Epic 7), export (Epic 8).
- Reworking the home page's `GoalSummary` card: it keeps its wording and math; the trend
  screen is the live surface. Feeding it real current weights instead of the placeholder
  stays out of scope.
- Any forecast ("you will reach..." style claims) — deliberately excluded by the epic.
- A charting dependency.

## Decisions

### 1. Permission model before the data model

No new write path beyond the BMI opt-in; reads are the whole epic.

| Action | Check | Where |
|---|---|---|
| Read trend of subject S | This epic: S is the viewer's own profile **or** one they manage (`getProfileForManager`). The data itself always composes through the G10 assembler | `src/features/entries/server/entry-access.ts` `listEntriesForViewer({ viewerProfileId, viewerUserId, subjectProfileId })` |
| BMI opt-in on profile S | S is not a dependent; if S has a login, only that login's user may toggle; otherwise any manager of S | new `src/features/stats/server/bmi-writes.ts` |
| Height + opt-in stored | Same write, same checks; manager-authored Zod validation like `goal-writes` | same |

**The named assembler for every filtered read stays `listEntriesForViewer`.** The trend
composition calls it, never reads `entries` directly. Board-level composition for other
members remains Epic 6's work on top of the same pieces; nothing here grants a member a
trend of a profile they do not manage or own.

### 2. Pure stats module (`src/features/stats/`)

`src/features/stats/trend-math.ts` — no imports from db, no React, defined once:

- `DIRECTION_DEADBAND_KG_PER_WEEK = 0.3` (the one named constant; floor, not ceiling).
- `ROLLING_WINDOW_DAYS = 7`, `MIN_DAILY_VALUES_PER_WINDOW = 2` (enough-data floor),
  `PCT_CHANGE_DECIMALS = 1`.
- `dailyValue(entries)` → mean weight per calendar day (day = `measuredAt` resolved in
  the profile's group timezone, reusing the existing day-key helper).
- `rollingMean(daily, window = 7)` → moving average; windows with fewer daily values
  than the floor produce `null` (used by the gap rule).
- `directionFromSeries(rollingSeries)` → `{ outcome: "toward" | "away" | "stable",
  insufficient }`: compares the latest window mean against the mean 4 weeks prior,
  normalised to kg/week. `insufficient = true` when either end-window lacks data or the
  28-day span is not covered (renders as the "not enough data" state). Deadband applies
  to the normalised weekly movement.
- `pctBodyMassChange(current, start)` → `(current − start) / start × 100`, guarded for
  `start ≤ 0`.
- `bmiValue(weightKg, heightCm)` → `weightKg / (heightCm/100)²`, rounded to 1 decimal.

`src/features/stats/compose-trend.ts` — the single server-side composition: entries →
`EntryView[]` (via the assembler) → series → the trend view object
`{ points, direction, pctChange, baselineKg, baselineLabel, progress }`. Progress is
`calculateGoalProgress` fed with the **latest rolling-mean weight** as current (the
rolling mean is the weight this engine believes; single readings never drive it).
Every value a screen shows flows from this one composition.

No dependency is added for math; plain TS. Unit tests cover: deadband (flat week →
stable; ≥0.3 kg/week sustained → direction), `dailyValue` multi-reading days,
`rollingMean` window edges, gap/insufficient matrices, pct-sign edges, BMI arithmetic
(170 cm / 70 kg ≈ 24.2), and that `calculateGoalProgress` keeps clamping — the existing
goals spec requirement, now pinned by tests too.

### 3. Trend screen

Route `src/app/(app)/trend/page.tsx`, server component:

- Renders for the **active profile** (profile switcher already changes whose trend it
  is); `getProfileForManager` gates it, so Nina can open Mara's trend from the managed
  profile page, which reuses the same `TrendSection` components below its history.
- Chart: hand-rolled static SVG **sparkline with hollow dot markers over a dotted-grid
  field** — the pinned signature move from the surface brief. No chart library, no
  interactivity beyond the accessible summary; `role="img"` + Spanish `aria-label` and a
  visually-hidden text summary (`US-5.1` a11y bullet).
- Sections in the pinned peach system (heavy grotesk numerals, one orange accent doing
  data + selection work only): trend card, direction words, percentage change labelled
  "desde …" (explicit baseline name — goal start date, or "tu primera pesada" when no
  goal exists), progress card for lose/gain, maintain-band card ("Estás a X de tu
  banda", no verdict), BMI card only when opted in, and the insufficient/no-target/
  no-entries states as first-class content — never error-ish.
- G2 by construction: nothing on the screen prints a difference between two readings.
- Impeccable flow: build the trend comp (`.impeccable/mocks/`) against the surface brief
  and put it in front of the user **before** building the page; the pinned direction
  makes the comp a layout expression, not a re-roll.

### 4. BMI as private profile data

Schema (additive): `profiles.heightCm integer null`, `profiles.bmiEnabled boolean
not null default false`. One transformation per existing pattern
(`drizzle-kit generate` → `migrate` on the 5435 Postgres). BMI shows only when
`bmiEnabled` + `heightCm` + a weight exist; the toggle-off hides the value at once.
Copy, screening framing and the doctor pointer are the spec's — no category labels, no
colour coding — and the flag never feeds any ranking, share or board path (absence of
code, plus G10 keeps BMI out of `EntryView` entirely).

### 5. Verification of the guardrails this epic touches

- **G10 / write≠read context**: integration tests — a viewer without standing gets no
  trend data; the composition is asserted to run on `listEntriesForViewer` output; BMI
  and goal math never appear in `EntryView`.
- **G2**: unit tests pin the deadband; copy review asserts no screen prints a
  two-reading delta.
- **G3**: copy review of the trend screen against the pinned wording list
  ("moviendo hacia tu objetivo" / "alejándote de tu objetivo" / "estable"; no
  "ganado/perdido", no verdict, no colour carrying meaning).
- **G4**: tests — opt-in default off; off hides the value; no category labels in copy.
- **G5**: copy review — "Mantener"/"Subir" treated like "Bajar"; no nudge copy.
- **G6**: unit tests — identical series against opposite targets produce opposite
  wording out of the composition.
- **G9**: integration tests — dependent trend renders history + direction + stability only;
  goal form, progress card and BMI surface are absent; `bmi-writes` refuses dependents.

## Risks / Trade-offs

- [A tight deadband still manufactures false alarms] → 0.3 kg/week is the floor pinned
  by a named-constant unit test; stricter feel comes from the band, not the deadband.
- [The rolling mean lags a real change by a few days] → accepted: smoothing early is
  exactly the anti-false-alarm behaviour the product wants.
- [Percent change with no goal] → baseline becomes the earliest recorded weight and the
  label says so; no progress bar renders.
- [Height typed wrong produces junk BMI] → height is validated positive, bounds-checked
  (≤ 250 cm), collected only on opt-in, and the screen frames BMI as a screening number.
- [Trend page duplicates the profile page's data path] → one shared server section;
  both surfaces reuse the same composition, nothing reads `entries` directly.

## Migration Plan

1. `drizzle-kit generate` (two additive `profiles` columns), review SQL,
   `drizzle-kit migrate` against local Postgres (5435). No backfill; rollback = drop
   the columns.
2. Land in order: pure math + unit tests → composition + G10 integration tests → BMI
   write + tests → comp pick → trend screen + states. Each step buildable.

## Open Questions

_None blocked. The comp pick (pinned direction) only shapes layout, which the user
chooses before the screen is built._
