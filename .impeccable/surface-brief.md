# Surface brief — Weight Tracker (app shell, all routes)

## Scope and visitor mode

Every screen of the product: sign-in, onboarding, the weigh-in sheet, the group sheet,
the group board, trends, settings, export and the legal pages. Mode: **Operate**. The
visitor came to get a job done — record a weight, see a trend, manage a group.

## Audience, job, action

Ana records the family's weigh-ins on a phone, one-handed, often offline. Luis checks
whether he is moving toward his own target. Nina manages her kid and her group. Sofía
is in the group and shares nothing. The primary action is always one obvious control on
screen.

## Chosen direction and memorable moment

Pinned by the user from a supplied reference image: a warm peach canvas with white,
large-radius cards floating on it, one saturated orange doing all the work, a big
near-black numeral, and an orange sparkline with hollow dot markers over a dotted grid.
The memorable moment is the **sparkline with its hollow dots**: every member's trend is
that one mark, and it is the only place the accent colour appears as data.

The reference also carried a verdict language ("You are slightly overweight", "-0.8kg vs
last week", "-1 Score", "Take Less Breaks!"). That language is **excluded**: it breaks
guardrails G2, G3, G4 and G5. The visual world is kept; the semantics are replaced.

## Direction contract

**THESIS** — A family weigh-in is a warm, domestic surface, not a clinical dashboard: a
peach table where each person's record sits as a white card, and where the only number
that looks like a verdict is a number measured against the person's own goal.

**OWN-WORLD** — Canvas is a soft apricot/peach gradient (`#FDE4CE` → `#FBD3B4`), cards
are pure white with a 24–28 px radius and a soft low shadow, ink is near-black
(`#1A1614`) and labels are warm grey (`#8A7F78`). One accent, a saturated orange
(`#F97316` / `#EA580C`), carries the data line, the active chip and the icon badge —
and nothing else. Numerals are set in a tight, heavy grotesk; labels are small and
quiet. Dotted-grid plot fields, not ruled paper and not axes.

**STORY** — The visitor can record the whole family in one continuous flow, and every
number they read is measured against their own goal rather than against a scale.

**FIRST VIEWPORT** — The weigh-in sheet. Card order: the active member's identity and
unit; the big numeral with the goal-relative sentence under it and the icon badge
beside it; the orange sparkline card with the range chips (7 d / 1 mes / 3 mes / Todo)
and the trend's own caption; then the recording card (the weight input plus its date
and attribution); then the day's sheet (who is done, who is next). The single primary
control ("Guardar peso") sits at the bottom, thumb-reachable.

**FORM** — Position 1 of the pinned reference's world (user-pinned, not rolled). Seed
reference: `seed: none (unavailable)` — the direction was pinned by the user from a
supplied image, not rolled.

**FINISH** — "unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance"

## Rules this direction must not break

- The accent orange marks data and selection. It is **never** a good/bad verdict.
  Direction is carried by words ("Moviendo hacia tu objetivo", "Estable",
  "Alejándote de tu objetivo"), never by red/green.
- No raw single-reading delta anywhere. The plot shows a rolling 7-day mean; gaps are
  drawn as gaps.
- No category labels, no BMI verdict, no score, no calorie or weight-loss nudge, no
  advice card. The reference's "Take Less Breaks!" has no equivalent in this product.
- The app never shows another member's data that their visibility setting excludes, and
  never implies why someone is absent.
- Every user-facing string is Spanish.

## Unresolved decisions

- Dark theme: the reference is light-only. A dark theme must be derived from the same
  world (deep warm brown ground, white cards, the same orange) rather than inverted
  mechanically.
- Whether the group board reuses the member card shape or gets its own density.
