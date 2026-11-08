# Design

## The one rule: one assembler, no raw routes

The board is a private (auth-gated) server-rendered screen (RSC) at
`src/app/(app)/groups/[id]/board/page.tsx`. Its whole payload comes from a single
called function, `assembleGroupBoard({ group, viewerProfileId })` in
`src/features/board/server/assemble-board.ts`. No other board read path, and no API
route serving `groupMemberships` joined with `entries` raw, exists.

The assembler does, in order:
1. Gating: active membership of the viewer (same `getMembership` proof as group reads).
2. Fetch the visible-member skeleton via `resolveVisibleMembers` (already the read
   check for member views, G10) — the viewer's own card bypasses visibility.
3. For each member whose grant shows weight or trend and is not private, read that
   member's entries **through `listEntriesForViewer`** (the existing filtered read) —
   the board never queries `entries` itself.
4. Compose per-member data with `composeTrend` (existing stats engine) for the
   sparkline + direction, with the member's own goal; dependents get
   goals suppressed upstream (already handled by `composeTrendForProfile`).
5. Punch in dependencies-correct progress bar data (goal-directed %) only for
   members whose grant shows trend (G2: no bare delta).
6. List due-but-late state per member from cadence/weekday for members whose grant
   shows name only (G7: due lists skip private and dependents).
7. Decorate cards with stored `award_claims` for the period (next section).

The screen component receives the final typed payload; it has no per-card client
filter and not a single object with body-magnitude cross-comparison. Tests assert the
payload, not the markup.

## Visibility/Sizing read: map, don't invent

`GroupVisibility` values are already `weight_trend | latest_only | name_only | private`.
The assembler reuses `resolveVisibilityGrant`. The board card renderer takes an
exhaustive union `BoardMembership` (`visible` | `nameOnly` | `private` | `optedOut`)
so TypeScript forces the four cases to be handled.

## Awards

Award computation goes in `src/features/awards/`:
- `compute-consistency.ts` (pure, unit-testable): given one member's entries,
  cadence days, weigh-in weekday and period boundaries, returns the award types earned.
- `award-writes.ts`: persists/upserts into `award_claims`, keyed
  `(groupId, profileId, awardType, periodStart)`. Uses a drizzle
  `onConflictDoUpdate` so idempotent recomputation does not duplicate.
- `award-reads.ts`: reads claims for a period, filtered to `shared_public` for the
  public strip and per-viewer for private reveals.
- Trigger: a `POST /api/awards/compute` route (called after a weigh-in lands) plus a
  catch-up call on board read when the previous month's claims are missing — lazy
  computation keeps it honest without a cron. (Epic 7 decides scheduling/notifications.)
- Share/publish: a small server action `setClaimPublication(claimId, shared)`, called
  only for claims whose `profileId` matches the viewer's own profile.

Strictly private per-member computation: the "largest change" (US-6.6/6) reveal is
computed **per member** by comparing the member's own baseline movement against the
group maximum — server-side, inside the assembler, only when viewer is that member —
and never included for others. It is the same `award_claims` row with a
magnitude-type (`biggest_change`), always `shared_public=false` until the member opts in.

## Schema change

New migration adds `award_claims` exactly as the backlog defines it (uuid pk,
group/profile refs with `on delete cascade`, award_type text, period_start/end date,
computed_at timestamptz, shared_public boolean default false,
unique `(group_id, profile_id, award_type, period_start)`).

## Board surface (visual)

Existing peach contract applies — white cards on gradient, orange sparkline with
hollow dots (extract the shared `TrendSparkline` from the trend screen's existing
sparkline svg rather than building a second chart), pill chips for award badges,
`skeleton`-style private placeholder cards. Reuse `MemberVisibilityBadge` copy keys
("Privado") already shipped. Every label is Spanish, matching the shipped glossary:
"Tu turno" style due chips are not moralised and never say "ausente" for a private member.

## Tests

- **G10 integration matrix (the pre-requisite)**: for every role ∈
  {owner, logger, member, visitor(null)} × subject visibility ∈
  {weight_trend, latest_only, name_only, private} × isDependent × rankingOptOut,
  assert the assembled payload's shape: which fields exist or don't. Seeded
  database, real Postgres (existing vitest integration harness).
- Awards pure math: share math, perfect month, streak, comeback (gap ≥ 2× cadence).
- Idempotent recompute: repeat compute produces same claim rows.
- Private reveal: computed but never present in another viewer's payload.
- No regression in `visibility.test.ts` / `entry-access.test.ts` (unchanged).

## Out of scope (from the backlog)

Push delivery and scheduling (Epic 7). Entry capture (Epic 4). Stats computation
beyond re-weaving existing outputs (Epic 5). Comments/reactions (permanently excluded).
The "biggest loser" leaderboard (permanently excluded).
