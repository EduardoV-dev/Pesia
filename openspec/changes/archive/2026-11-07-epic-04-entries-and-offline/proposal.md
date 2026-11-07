# Proposal — Epic 4: Entries & offline capture

## Why

The app has groups, roles and permissions but nothing to record yet: a weigh-in cannot
be logged, so there is no product — Epics 5 and 6 have no data to compute from. Epic 4
brings the core write path: an entry that is recorded for the person in front of you,
attributed permanently, backdated to the day it was measured, correctable, deletable,
and capturable with no signal at grandma's house.

Covers `epic-04-entries-and-offline` in the backlog: **US-4.1** through **US-4.10** plus
the epic-level acceptance items (server-side refusal without permission; both timestamps
displayed distinctly).

## What Changes

- New `entries` table: client-generated UUID v4 `id`, canonical `weight_kg`, separate
  `measured_at` / `recorded_at`, permanent `recorded_by_user_id` attribution (no cascade,
  never nulled), `edited_at` / `edited_by_user_id`, `deleted_at` for append-only deletion,
  and a `note` that is private to its author forever.
- A weigh-in sheet: one screen records for the selected profile, names the person
  prominently, previews the next person, and supports quick succession of multiple
  people (US-4.10).
- Offline capture: the sheet and history work with no connection; writes queue in
  IndexedDB and flush on reconnect, app open, and Background Sync where supported;
  the queue flushes idempotently so a retried sync upserts on `id` instead of
  duplicating (US-4.3, US-4.10).
- Entry HTTP endpoint (write) and server-side filtered reads: `can_log_for` governs
  who may create an entry for a subject; `visibility` governs who may read it. The
  client never receives a raw profile+entries dump (US-4.2, refusal is server-side).
- Correction and deletion: recorder and subject may edit/delete; edits are attributed
  and timestamped; a deleted entry leaves no placeholder (US-4.5, US-4.6).
- Own-history screen: newest first, measured and recorded dates shown distinctly,
  including entries a recorder logged on the member's behalf (US-4.7, US-4.9).
- Not in this epic: statistics, trends, direction language over entry data (Epic 5);
  the board (Epic 6); reminders (Epic 7); bulk backfill; scale import.

## Capabilities

### New Capabilities

- `entries`: the recorded weigh-in itself — creation permission, attribution, dual
  timestamps, private notes, correction, deletion, and visibility-filtered history.
- `offline-capture`: entry capture with no network — the local queue, snapshot reads,
  the exactly-once flush, and the honest queued/synced UI states.

### Modified Capabilities

_None._ `permissions` already specifies `can_log_for` as a write check separate from
`visibility`; Epic 4 consumes it without changing its requirements.

## Impact

- **Schema**: new `entries` table in `src/db/schema.ts` + `drizzle-kit generate` /
  `migrate` migration. No change to existing tables. `recorded_by_user_id` is a loose
  `text` reference with no FK cascade — deleting a login keeps the attribution.
- **New feature module**: `src/features/entries/` (domain + server read/write functions
  + offline queue) exercising the existing `canLogFor` write check and the existing
  visibility model from `src/features/groups`.
- **New API route**: `POST /api/entries` accepting a batch of entry upserts for the
  offline flush; reads stay server-side (server components for `.authed` history, the
  sync route is the only client-callable write path).
- **UI**: weigh-in sheet on `home`, entry history on `profiles/[profileId]`, entry
  edit/delete affordances. All copy Spanish; recorded/measured timestamps shown
  distinctly; no delta numbers, no verdict language anywhere.
- **PWA**: Serwist service worker with an offline fallback page, the IndexedDB write
  queue, and Background Sync registration (iOS falls back to `online` event + app open).
- **Guardrails touched**: G2 (no raw single-reading delta rendered — verified in copy
  review of the sheet/history), G3/G5 (neutral, unmoralised copy — copy review),
  G6 (recording permission never infers a goal direction), G9 (dependents can be
  recorded for, via managed-profile access, but no target or progress shown), G10
  (every entry read is filtered server-side by visibility — integration tests), and
  §2.3 of the agent instructions (write≠read: recording a weight grants no read of
  that subject's history — integration test).
