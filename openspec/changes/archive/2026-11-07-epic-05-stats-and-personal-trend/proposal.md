# Proposal

## Why

Epic 4 shipped entries; every member can log weights, but nobody can *read* a trend.
The product promise — "each member sees their own goal-relative trend, with no false
alarms and no moralising" — is still unmet, and Epic 6 (board and awards) blocks on it.

## What Changes

- New pure-function stats engine (`dailyValue`, `rollingMean`, `direction` with a
  0.3 kg/week deadband, `pctBodyMassChange`), unit-tested independently of the UI.
- A member's trend screen: smoothed 7-day-mean line over raw readings, goal-relative
  direction wording, percentage change against the active baseline, progress reusing
  the existing goal-progress semantics, and an accessible text summary.
- Honest-trend rules: gaps are rendered as gaps, direction is only reported when there
  is enough data on both sides of the comparison window, and a requires-enough-data
  "insufficient data" state replaces fabricated directions.
- First-class no-target view: trend, direction and percentage change with no progress
  bar and no framing that not having a goal is a deficiency.
- Dependent profiles remain trend-only: history, direction, stability — no target, no
  progress, no BMI.
- Optional, private BMI: opt-in toggle stored on the profile (off by default), height
  collected only when the member turns it on, screening-measure framing with a
  see-your-doctor pointer, no category labels, no colour coding, never compared,
  toggleable off.
- The existing direction display applies the deadband: a below-threshold movement
  reads "Estable" instead of a direction.

This epic **computes and shows the member's own trend**. Rendering others' trends on the
group board and awards stays Epic 6; stats never calls any surface outside the member's
own/managed view.

## Capabilities

### New Capabilities

- `stats`: Covers the personal trend: the pure math over entries (daily means, the
  7-day rolling mean, the deadband-squared direction, the percentage change, the
  optional BMI), the honest-trend rules (gaps, enough data), the member trend screen
  and its accessible summary, the no-target view, and the BMI reference behaviour and
  its privacy.

### Modified Capabilities

- `profiles`: Adds an opt-in BMI reference as private profile data — a height in cm
  collected only on opt-in and a toggle that is off by default and can be turned off,
  refused for dependent profiles.

## Impact

- `src/features/stats/` (new): pure functions, composition server-side, trend screen
  components, unit tests for deadband and formulas, integration tests composing the
  engine over `listEntriesForViewer`.
- `src/db/schema.ts` + migration: `profiles.heightCm` (nullable), `profiles.bmiEnabled`
  (default false).
- `src/features/goals/progress.ts`: gains the deadband in the direction key it returns.
- `src/app/(app)/`: a trend route for the active profile; the managed-profile detail
  page reuses the same trend component. All reads keep composing
  `listEntriesForViewer` (G10 stays server-side).
- Guardrails touched: **G2** (no raw single-reading delta anywhere — unit-tested deadband
  + copy review), **G3** (goal-relative wording already in place; verified by copy
  review), **G4** (BMI off by default, private, no labels — tested toggle state and copy
  review), **G5** ("Maintain"/"Gain" first-class, no nudges — copy review), **G6**
  (direction derives from the member's own target — unit tests over both directions),
  **G9** (dependents trend-only — tested refusal of goal/progress/BMI surfaces),
  **G10** (stats reads go through the server-side assembler — integration tests).
