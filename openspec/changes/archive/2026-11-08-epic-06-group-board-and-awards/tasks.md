# Tasks

Epic: `epic-06-group-board-and-awards`. Covers US-6.1 … US-6.11. Guardrails G1, G2,
G5, G6, G7, G8, G9, G10 touched.

## 1. Schema and award math (before any surface)

- [x] 1.1 Add `award_claims` table to `src/db/schema.ts` and generate the migration
      with `pnpm drizzle-kit generate`; verify `pnpm drizzle-kit migrate` on the
      dev database.
- [x] 1.2 Create `src/features/awards/consistency.ts`: the pure award engine
      (`computeConsistencyAwardTypes`) with inputs `entryMeasuredAts`, `cadenceDays`,
      `weighInWeekday`, `periodStart/End` (group timezone) and output the subset of
      `most_consistent | perfect_month | best_streak | comeback_kid` earned,
      applying every minimum bar from the epic (3 expected for most_consistent,
      2 for perfect_month, 2 for the streak, gap ≥ 2× cadence for comeback).
      Unit tests for each award and each minimum bar.
- [x] 1.3 Unit test: a member whose cadence cannot be derived earns nothing.
- [x] 1.4 Create `src/features/awards/server/award-writes.ts`:
      `saveAwardClaims(groupId, profileId, types, period)` upserts on the unique
      key, idempotent; integration test that recompute does not duplicate.

## 2. The assembler (G10) — the riskiest code, tested first

- [x] 2.1 Create `src/features/board/server/assemble-board.ts` with
      `assembleGroupBoard({ groupId, viewerProfileId, viewerUserId })` returning
      the exhaustive `BoardMembership` union per member (`visible | nameOnly |
      private | optedOut` plus dependent variant), decorated with sharing-safe
      trend data, progress and public awards.
- [x] 2.2 G10 integration matrix: real Postgres, seeded group, assert for every
      combination of viewer role (owner/logger/member) × subject visibility
      (4 levels) × dependent flag × ranking opt-out exactly which fields exist
      per member card.
- [x] 2.3 Integration test: notes appear in the payload only when the viewer is the
      note's author, at every visibility level.
- [x] 2.4 Integration test: `can_log_for` for a `name_only`/`private` subject does
      not widen the viewer's payload.
- [x] 2.5 Integration test: due/late state exists only for members whose grant
      shows name and who are not dependents and not opted-out-private — a `private`
      member is never "due" in any payload (G8), and hidden members are omitted,
      not explained.
- [x] 2.6 Pure assertions: progress bars carry no ordinal field; the payload has no
      cross-member magnitude comparison except the private reveal (US-6.10, G1).
- [x] 2.7 Put a `server-only` import on the assembler and write a test that fails
      if any other module reads `entries` for board purposes without it.

## 3. Awards wiring

- [x] 3.1 Create `src/features/awards/server/biggest-change.ts`: per-member private
      computation of whether the member moved the most in the period; only the
      member's own payload carries the claim (US-6.6).
- [x] 3.2 Integration test: the reveal exists exactly once — for the member it is
      about — in their own payload, absent from every other member's payload.
- [x] 3.3 Create the publication toggle (server action
      `setClaimPublication(claimId, shared)`) gated to claims of the caller's own
      profile (US-6.7); integration test that unpublishing removes it again.
- [x] 3.4 Computation trigger: `POST /api/awards/compute` (auth + membership)
      plus lazy catch-up on board read when last-month claims are missing; test.

## 4. Board surface (`/groups/[id]/board`)

- [x] 4.1 Add navigation entry to the group screen (Spanish label "Tablero").
- [x] 4.2 Create `src/app/(app)/groups/[id]/board/page.tsx` (RSC, active-profile
      resolution, group standing check → not-found if not member).
- [x] 4.3 Extract the shared `TrendSparkline` from the existing trend screen
      (orange line, hollow dot markers) so the board and trend reuse one signature
      component; adapt to `.impeccable/surface-brief.md` tokens (peach canvas,
      white cards, orange accent, dotted plot field for any plot).
- [x] 4.4 Render member cards per `BoardMembership` variant: full card (own goal-
      relative progress bar + sparkline + public award chips), latest-only (weight
      without sparkline), name-only, private placeholder card ("Privado"), dependent
      card (trend direction only, no progress bar), opted-out (card, no strip row).
      All copy from the shipped Spanish glossary; direction words remain
      "hacia/alejándose/estable", never moralised (G3/G5/G6).
- [x] 4.5 Consistency strip: behaviour-ordered row of members with their
      consistency awards; no weight, no body magnitude (G1).
- [x] 4.6 Private reveal UI: a small card, only for the viewer labelled "Me moví más
      en el mes" with a publish chip; hidden for everyone else (US-6.6/6.7).
- [x] 4.7 Rendering test (RTL): a `private` member renders the placeholder and no
      name/number; a dependent renders no progress bar; the strip never shows
      a body-size comparison.
- [x] 4.8 Empty state: group without entries ("Todavía no hay pesadas registradas").

## 5. Close-out

- [x] 5.1 `pnpm run lint` && `pnpm run typecheck` green.
- [x] 5.2 Full vitest run green (unit + integration).
- [x] 5.3 Tick the epic's acceptance list in
      `docs/backlog/epics/epic-06-group-board-and-awards/epic.md`.
- [x] 5.4 Guardrail review: G1/G2/G7/G8/G9/G10 each has a test or a copy review note.
      G1: consistency-strip + award-compute tests (a single behaviour order; reveal once, own payload only).
      G2: board payload carries goal-relative progress and composed trend only (assemble-board guards, board-page RTL).
      G7: due flags scoped to named, non-dependent members; deadlines never named-data (guarded tests).
      G8: private members own no card and no due state in any payload (both board test suites).
      G9: dependent cards carry direction only; never in the strip (matrix + RTL).
      G10: server-side filtering under every viewer × visibility × dependent × opt-out, notes author-only, no can_log_for widening, architecture test on the assembler.
- [x] 5.5 Update the board nav surface in `app-shell` labels if copy changed.
      No shared app-shell label list exists: the board entry is the group screen link ("Ver el tablero"), copy unchanged elsewhere.
