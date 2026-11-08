# Proposal

Epic: `epic-07-pwa-and-reminders` — covers US-7.1 through US-7.10.

## Why

Epics 1–6 shipped auth, profiles, groups, entries with offline capture, the trend
engine and the board — but the app is still only reachable through a browser tab, and
nobody is nudged when someone's weigh-in is due. The product's premise (Ana logs
everyone on a shared screen) breaks the moment nobody remembers whose turn it is.
This epic makes the app installable and delivers the only push channel the product
has: an opt-in reminder that names whose turn it is (G7). This is the second-highest
privacy surface after the board: a reminder that names hidden members or mentions a
weight would leak through notifications, so every reminder payload is assembled
per-recipient on the server (G10, G8).

## What Changes

- **Installable app (`pwa` capability).** The manifest landed in Epic 1 and the
  offline service worker in Epic 4 (`public/sw.js`). This epic completes
  installability and the notification plumbing:
  - `beforeinstallprompt` capture plus an install affordance so Android/desktop
    users can add the app; iOS standalone instructions in Spanish.
  - The service worker gains `push` and `notificationclick` handlers and the
    notification permission / subscription lifecycle.
  - Icons get `purpose: "maskable"` variants; the manifest keeps `standalone`.
- **Reminders (`reminders` capability).** A daily Vercel Cron job (protected by
  `CRON_SECRET`) computes, per group in its own timezone, which members' turn is due
  — reusing the same cadence/anchor math the board's `isDue` already embodies — and
  notifies only eligible users:
  - Each user opts in per group server-side; opting in requests notification
    permission and registers a web-push subscription (stored in a new
    `push_subscriptions` table). Opting out removes it.
  - The reminder names whose turn it is ("Es el turno de Mara") **and nothing more**:
    never a weight, never a direction, never a number (G7).
  - A due name only ever reaches users who can see that subject's name under the
    board's own visibility rules — decided per recipient server-side; a private
    subject is invisible to reminders, and those users simply don't hear about that
    subject (G8, G10). Dependents are only ever a *logger's* nudge subject; a
    dependent user is never told to weigh themselves.
  - Recipients for a subject's turn: users behind profiles that can log for the
    subject (self-log by role, or a `can_log_for` grant) **and** can see the
    subject's name. Deduplicated; a subject logged by many loggers yields subject-
    addressed reminders only to eligible ones.
  - Users without a push subscription who still opted in get an email fallback via
    Resend, under the same copy rules as the push (names and turns, never weights).
- No change to board, stats or entries behavior: reminders read membership, grants,
  last-measured day keys and visibility — no new raw-entries route exists.

## Capabilities

### New Capabilities

- `pwa`: Installability and the notification client contract — install affordance
  and iOS guidance, notification permission request, web-push subscription
  lifecycle from the client, and the service worker's `push` / `notificationclick`
  behavior (Spanish copy, focus-or-open routing, no weight in any notification).
- `reminders`: The server-side reminder pipeline — the daily cron with its secret
  gate, per-group timezone scheduling, whose-turn computation, per-recipient
  eligibility (logging right × name visibility × opt-in), push delivery and the
  Resend email fallback, with the G7 bound (names and turns only, never weights).

## Impact

- `src/features/reminders/` (new): due computation shared with the board's rules,
  per-recipient reminder assembly, send orchestration.
- `src/features/push/` (new): subscription endpoints (`subscribe`, `unsubscribe`),
  web-push sender wrapper, VAPID config from env.
- `src/features/pwa/` (new): install affordance client components, notification
  opt-in UI wired into group settings.
- `public/sw.js`: extended push + notificationclick + keepAlive handled in place;
  no Serwist migration (Epic 4 deliberately used a hand-rolled worker).
- `src/db/schema.ts` + one migration: `push_subscriptions`.
- `src/app/api/reminders/*`, `src/app/api/cron/reminder-scan/route.ts` (new);
  `vercel.json` with the daily cron; `.env.example` gains `CRON_SECRET`.
- Settings surface: notification opt-in/out per group, install hint.
