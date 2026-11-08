# Tasks

Epic: `epic-07-pwa-and-reminders`. Covers US-7.1 … US-7.10. Guardrails G7, G8, G10
touched; G2/G3 honored by the copy bound.

## 1. The shared due rule (before any surface)

- [x] 1.1 Create `src/features/reminders/due-rule.ts`: extract the pure day-key
      math from the board's `isDue` (last-measured anchor, `joinedAt` fallback,
      cadence days, weekly fallback via the group weekday; dependents stay
      excluded at the callers); unit tests for the board's documented cases.
- [x] 1.2 Rewire `src/features/board/server/board-cards.ts` `isDue` to the shared
      rule; board tests still pass unchanged.

## 2. Schema, opt-in and subscriptions

- [x] 2.1 Add `push_opt_ins` and `push_subscriptions` to `src/db/schema.ts`
      (unique `(user_id, group_id)` opt-in; unique `endpoint` subscription;
      `user_id` never cascades) and generate the migration with
      `pnpm drizzle-kit generate`; verify `pnpm drizzle-kit migrate` on the dev
      database.
- [x] 2.2 Create `src/features/push/server/opt-in-writes.ts`: enable/disable the
      `(user, group)` opt-in row server-side; integration test for the
      upsert-on-toggle path.
- [x] 2.3 Create `src/features/push/server/subscription-endpoints.ts` plus the
      API route pair: subscribe stores (endpoint, keys, group) for an active
      member; unsubscribe deletes by endpoint for its owner. Integration tests:
      non-member refused; wrong-owner endpoint cannot delete rows.

## 3. The due scan and per-recipient assembly (G10/G8 — tested first)

- [x] 3.1 Create `src/features/reminders/server/plan-reminders.ts` (pure):
      due subjects per group → per-recipient plans with eligibility =
      opt-in × logging right (role or grant) × name visibility, dependent subjects
      named only to loggers, dedup (user, subject, local day). Unit matrix:
      private/name-only/weight/trend visibility × opt-in × grant.
- [x] 3.2 Unit tests for G7 copy bounds in `plan` output: no weight field, no
      delta, no progress lands in any plan payload; name only for eligible recipients.
- [x] 3.3 Create `src/features/reminders/server/scan.ts`: per-group timezone
      window checks, assembles reads through the board's server primitives, hands
      plans to the senders, isolates delivery failures (counts, no abort). One
      integration test against the dev database with fake senders: three groups in
      different timezones, mixed visibility, one dead push endpoint reaped, email
      fallback for opted-in-without-subscription.

## 4. Sends

- [x] 4.1 Create `src/features/push/server/push-send.ts`: VAPID config from env,
      send-or-reap (410/404 deletes the subscription) with the documented channel
      behavior; unit test the reap branch with a fake.
- [x] 4.2 Create `src/features/reminders/server/email-send.ts`: Resend fallback for
      opted-in recipients without a live subscription; failure logged and counted,
      no retry loop.
- [x] 4.3 Create `src/features/reminders/copy.ts`: one Spanish builder —
      `"Tu turno"` / `"Es el turno de X"` + one plain body line; assert no digit
      from weight data can enter the string; reused by push and email.

## 5. Client surface

- [x] 5.1 Add `push` + `notificationclick` handlers to `public/sw.js` with
      `waitUntil`-safe parsing (garbage payload ignored) Spanish fallback text and
      focus-or-open routing; keep the offline shell untouched.
- [x] 5.2 Create the opt-in section in group settings: enable/disable toggle per
      group wired to the opt-in endpoints, browser permission request on the
      enable gesture, Spanish state copy and denied-permission guidance; record —
      with the enabled flag — the device subscription register/unregister on
      success and failure.
- [x] 5.3 Create the install affordance: `beforeinstallprompt` capture + Spanish
      install button, iOS `Añadir a la pantalla de inicio` guidance, hidden when
      standalone/prompt unavailable.
- [x] 5.4 Add `purpose: "maskable"` icon variants to the manifest; icons on both
      size buckets.

## 6. Cron wiring

- [x] 6.1 Add `CRON_SECRET` to `.env.example`; create
      `src/app/api/cron/reminder-scan/route.ts` (nodejs runtime, Bearer secret
      gate, per-group local-window scan); unauthorized call refused, no trigger.
- [x] 6.2 Add `vercel.json` with the daily cron entry pointing at the scan route.
- [x] 6.3 Integration test the route: wrong secret → 401 nothing sent; right
      secret → plans sent per group; dedup key prevents a same-local-day second run.

## 7. Epic close-out

- [x] 7.1 `pnpm run lint`, `pnpm run typecheck`, `pnpm run test` all green.
- [x] 7.2 Manual desktop pass: install affordance appears, opt-in keeps after
      reload, offline shell unchanged, notification shows Spanish copy with no
      weight on a locally triggered scan.
- [x] 7.3 Tick the epic's acceptance list and update
      `docs/backlog/epics/README.md` with the shipped-epic note; guardrails G7/G8
      reviewed against the notification copy and recipient matrix.
- [x] 7.4 Commit on `development` with a conventional message; report shipped,
      verified and open items.
