# Proposal

Epic: `epic-06-group-board-and-awards` — covers US-6.1 through US-6.11.

## Why

Epics 1–5 shipped auth, profiles, groups/permissions, entries with offline capture, and
the per-member trend engine — but there is no shared view of the group yet. The board is
the product's centerpiece: each member sees everyone's *own* goal-relative progress side
by side, the group sees consistency (never body size), and it contains the
highest-risk code in the product, the server-side visibility filter (G10). Epic 7
(reminders) and Epic 8 (guardrail audit) both block on it.

## What Changes

- New group board surface at `/groups/[id]/board` where every member's card shows:
  name/avatar, their own progress bar and trend sparkline, and their consistency awards.
- Cards render strictly what each member's own `visibility` permits, decided **only**
  on the server: `weight_trend`, `latest_only`, `name_only` or `private` placeholder.
- Dependent cards are trend-only (direction/stability, latest weight): no target, no
  progress %, no BMI, no awards (G9).
- Members with `rankingOptOut` are excluded from the consistency strip but keep their card.
- Consistency awards (`most_consistent`, `perfect_month`, `best_streak`, `comeback_kid`)
  computed per period from each member's own cadence, persisted in a new
  `award_claims` table so board reads never recompute them.
- Private preview of "one who moved the most this month" per member: computed
  server-side against their own baseline, visible only to that member, publishable
  via `shared_public`. No group-facing magnitude ranking exists (G1).
- Notes never reach the board for anyone but the author.
- No new visual direction work: the peach comp contract already pinned
  (`.impeccable/surface-brief.md`) applies — orange sparkline + hollow dots signature move.

## Capabilities

### New Capabilities

- `group-board`: The server-side assembly of the per-viewer group board — visibility
  filtering, dependent reduction, opt-out handling, absence rules, and per-member
  progress rendering without ranked order (G10 is this capability's core contract).
- `awards`: Behaviour-consistency awards — claim computation per period, private
  magnitude reveal ("me moví más") per member, share/publish toggle, and the rule that
  no award ranks body size.

### Modified Capabilities

- `groups`: New requirement covering board reading standing — any active member can open
  the board of a group they belong to; the board read reuses the same membership proof
  as other group reads. (No existing requirement changes; the delta adds one.)

## Impact

- `src/features/groups/server/`: board assembler (single server-side function every
  board read goes through); no new raw-membership API route exists.
- `src/features/awards/` (new): consistency award computation + `award_claims`
  persistence; a new drizzle migration adds `award_claims`.
- `src/app/(app)/groups/[id]/board/` (new): private-activity screen rendering the
  assembled board; plus the "publish move" toggle shared via the
  existing `POST /api/entries` pattern (server actions where possible).
- No change to `entries`, `stats`, `profiles` behaviour — the board consumes
  `composeTrendForProfile` outputs and `listEntriesForViewer`, never raw rows.
- Guardrails touched: G1 (rank only behaviour), G2 (no raw single-reading delta shown;
  trend/no-bare-delta rule), G5/G6 (goal-relative progress from each member's own goal,
  any direction), G7 (absence honesty — due list still lives here), G8 (private never
  "due"/"missing"), G9 (dependents trend-only), G10 (server-side filtering on every read).
