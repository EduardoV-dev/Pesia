# Tasks — Epic 4: Entries & offline capture

Tasks grouped by the user stories they satisfy, order by dependency: the shared server
foundation (group 1) carries the epic-level items and lands G10 verification first.

## 1. Foundation — entries schema, assembler and sync endpoint (epic-level items)

- [x] 1.1 Add `entries` table (the timezone stays on the existing `groups.timezone`,
      which Epic 1 already sets at creation — no `group_settings.timezone` column) to
      `src/db/schema.ts`, generate and run the migration. **Verify**: `drizzle-kit
      generate && drizzle-kit migrate` passes against local Postgres :5435; migration
      SQL reviewed.
- [x] 1.2 Implement `listEntriesForViewer` in
      `src/features/entries/server/entry-access.ts` (visibility-filtered, notes
      stripped to the author, `deleted_at IS NULL`, both timestamps returned).
      **Verify**: unit tests for every `visibility` level, the hidden-subject case,
      note stripping, and deleted-entry exclusion.
- [x] 1.3 Implement `createEntry`, `editEntry`, `deleteEntry` in
      `src/features/entries/server/entry-writes.ts` using the existing `canLogFor`
      helper and an `assertEntryEditor` check (creator user or subject manager);
      canonical kg storage; reject weights outside 1.00–300.00 kg with the Spanish
      range message; reject future `measured_at`. **Verify**: integration tests —
      refusal without permission is server-side with a Spanish reason; a recorder
      granted write to a hidden subject still reads nothing; out-of-range and
      future-measured creates refused; duplicate flush safe (same entry id twice →
      one row).
- [x] 1.4 Add `POST /api/entries` batched upsert (max 50) with per-item
      `saved`/`failed` verdicts and no GET handler; every item re-runs the write
      checks at apply time. **Verify**: integration test for multi-item batch, and a
      codepath test asserting zero raw entry reads outside `listEntriesForViewer`.
- [x] 1.5 Write the G10 integration suite: every visibility level × note-author matrix
      against the assembler behaves server-side. **Verify**: tests pass; this group
      lands before any UI task starts.

## 2. US-4.1 — A member records their own weight

- [x] 2.1 Build the weigh-in sheet on `home`: loggable-profile selector seeded with the
      group roster, numeric keypad (`inputMode="decimal"`), measured date defaulting
      to today, kg canonical storage. **Verify**: a member records their own weight
      and the row shows both timestamps equal to "now" in Spanish-rendered form.
- [x] 2.2 Mirror the server range validation client-side with the same Spanish message
      ("El peso debe estar entre 1 y 300 kg."). **Verify**: out-of-range input shows
      the message and produces no request and no entry.

## 3. US-4.2 & US-4.10 — Record for others, never the wrong person

- [x] 3.1 Sheet always names the subject prominently before and after the save;
      explicit next-person action; next-person preview after save. **Verify**:
      interactive review of a multi-person weigh-in session.
- [x] 3.2 Filter the profile selector and the log actions by `can_log_for` state, and
      surface the server's Spanish refusal when write is refused. **Verify**:
      integration test on the refusal path (elaborates 1.3's server-side refusal with
      its reason rendered).
- [x] 3.3 Playwright-style manual checklist: recording for someone without permission is
      impossible from the UI and refused by direct request. **Verify**: checklist in
      the epic `epic.md` tasks area.

## 4. US-4.4, US-4.5 & US-4.6 — Backdate, correct, delete

- [x] 4.1 Measured date editable on edit (not in the future); recorded time preserved
      and still displayed separately. **Verify**: an entry backdated from Monday to
      Sunday still shows Monday as recorded time and Sunday as measured time.
- [x] 4.2 Edit affordance visible only when `assertEntryEditor` would pass; server
      refuses other users. **Verify**: integration test for the non-editor refusal;
      UI test that the affordance appears for the subject and the recorder only.
- [x] 4.3 Delete with confirmation dialog (shadcn-pattern `alert-dialog` over radix-ui),
      append-only soft delete, no placeholder or deleted count in any view. **Verify**:
      integration test that history after delete contains neither the entry nor a
      marker, and the trend input excludes it.

## 5. US-4.7, US-4.8 & US-4.9 — Attribution, private note, own history

- [x] 5.1 History section on `profiles/[profileId]` for visible subjects: newest first,
      measured and recorded shown as two distinct Spanish lines, recorder name on each
      row. **Verify**: member sees their own history and third-party-recorded entries
      (US-4.9 acceptance).
- [x] 5.2 Private note field on create/edit; note withheld from every other viewer via
      the assembler; the note renders for its author only (spec-exact: nobody but the
      author). **Verify**:
      extends 1.5's note-author matrix integration tests; manual check as another member.
- [x] 5.3 Attribution storage check: `recorded_by_user_id` never nulled/cascaded —
      integration test deletes a user's login row directly (the same hard delete an admin
      path performs) and asserts entries keep their recorder with the legacy flag. **Verify**:
      test passes.

## 6. US-4.3 & US-4.10 — Offline capture

- [x] 6.1 Implement the IndexedDB queue (`weight-tracker-ops` store: op payloads with
      status/attempts/reason) and flush library in `src/features/entries/offline/`.
      **Verify**: unit test of ordered replay and idempotence (flush the same queue
      three times → one row).
- [x] 6.2 Wire the service worker with an offline fallback for the app shell, register
      Background Sync tag `entry-flush` (Chromium), flush on `online` and message-based
      trigger via `postMessage` (app mount + SW nudge). iOS falls back to `online` + app
      open. Implemented as a hand-written `public/sw.js` with the same triggered
      behaviours: `@serwist/next` is webpack-only and this project builds with Turbopack
      on Next 16; the file carries a shortcut comment naming the upgrade path. **Verify**: dev-mode Chromium test with offline
      toggle, and the app-mount path unit-tested.
- [x] 6.3 Offline snapshot reads for the sheet history: last payload cached per subject
      in IndexedDB, rendered with stale marker ("sin conexión — datos guardados en tu
      dispositivo") while offline. **Verify**: opening the app offline shows the sheet
      and cached history; a fresh write lands in the queue UI.
- [x] 6.4 Queued/synced/failed badges on entries; failed shows Spanish reason and stays
      available for correction. **Verify**: offline entry → queued → online → saved;
      a revoked-permission flush leaves the entry failed with its reason.

## 7. Epic acceptance, guardrail copy review and checks

- [x] 7.1 G2/G3/G5 copy review of every new Spanish string: no deltas, no
      passed/failed verdicts, no nudges; neutral verbs only. **Verify**: explicit copy
      review recorded in the epic file (entries list direction wording is Epic 5's).
- [x] 7.2 Tick the epic acceptance list in `docs/backlog/epics/epic-04-entries-and-offline/epic.md`
      and reconcile any false claims. **Verify**: side-by-side acceptance-criteria run.
- [x] 7.3 `pnpm run lint` and `pnpm run typecheck` pass with zero errors; full test
      suite green. **Verify**: both commands clean.
