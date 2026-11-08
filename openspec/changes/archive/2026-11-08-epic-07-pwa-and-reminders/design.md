# Design

## Context

The app already: registers `public/sw.js` from `src/components/app-shell/sw-registrar`
(offline shell + Background Sync, hand-rolled — Epic 4's deliberate choice), ships
`src/app/manifest.ts` (`standalone`, `start_url: /home`, 192/512 icons), and computes
"whose turn is due" on the board in `isDue`
(`src/features/board/server/board-cards.ts:195`): whole-day distance from the last
measured day key (or `joinedAt` anchor) to the member's own cadence days, the group's
weigh-in weekday as weekly fallback, dependents excluded. Group timezone and weekday
live on the group row. Auth is Better Auth; groups/permissions expose membership,
roles, `can_log_for` grants and per-subject `visibility` (the G10 assembler in
`src/features/board/server/assemble-board.ts` is the reference read path).

No push, cron or email infrastructure exists yet. `.env.example` already reserves
`VAPID_*`, `RESEND_API_KEY`, `EMAIL_FROM`. No `vercel.json` yet.

## Goals / Non-Goals

**Goals:**

- Complete installability and notification client plumbing without touching the
  offline-shell side of `sw.js`.
- One shared, tested "due" computation used by both board and reminders — the
  reminder never drifts from what the board shows.
- Per-recipient reminder assembly: eligibility = opt-in × logging right ×
  name visibility, decided server-side (second-highest privacy surface after the board).
- A scan that degrades gracefully: one bad delivery never kills the run.

**Non-Goals:**

- No per-user reminder-time scheduling UI; the scan runs once daily per group in
  the group's own morning.
- No Serwist migration; no change to caching/offline semantics.
- No digest or weekly summary; exactly one reminder kind: "whose turn it is".
- No weight-derived data anywhere near a reminder payload — the copy bound in the
  spec makes this a hard rule, and the design adds no exception.

## Decisions

### D1 — Extend the hand-rolled `sw.js`; no Serwist

Epic 4 chose a plain worker for the offline shell. Push handling is additive
(`push` + `notificationclick` listeners) and independent of caching, so the worker
stays hand-rolled in one file with one deploy pipeline. It gains: a `push` handler
that parses the payload (garbage payload → ignore, per spec), a `notificationclick`
handler that focuses the open client or opens a new one into `/home`, and no new
cache behavior.

### D2 — One shared due rule, extracted and consumed by both board and reminders

The cadence/anchor/day-key math in `isDue` moves to a pure module
(`src/features/reminders/due-rule.ts`); the board's `isDue` calls it and the
reminder scan calls the same function per member. One rule means the spec scenario
"board says due ⇔ pipeline says due" holds by construction. The math stays
`YYYY-MM-DD` day-number based, exactly as today.

### D3 — Pure assembly, effects at the edge

Reminder orchestration is two pure functions plus one effect shell, mirroring the
`entry-ops` fold pattern that already works here:

1. `pickDueSubjects(group, members, lastMeasuredDayKeysByProfile, timezone)` →
   due subjects (uses D2).
2. `planReminders({ dueSubjects, memberships, loggingGrants, visibilityByProfile,
   optInsByGroupId })` → per-recipient plans: for every due subject S, the set of
   Users whose own profile or explicit `can_log_for` grant lists a profile that may
   log for S **and** whose viewer read of S shows S's name; dependent subjects are
   named only to their loggers, never to themselves; deduplicated on
   (user, subject, local day).
3. A slim send loop: web-push first; a `410/404` delivery reaps that subscription;
   an opted-in recipient with no live subscription falls back to Resend email; the
   copy is second person when the recipient's own profile is the subject and never
   a dependent.

The two pure functions get unit tests; the send loop gets an integration test with
injected sender fakes.

### D4 — Reads reuse the board's server primitives; no new raw route

The scan reads memberships, role presets, `can_log_for` rows, visibility settings,
last-measured day keys and profile→user links through the same server helpers the
board assembler uses. The cron route never returns that data — it aggregates per
group server-side and hands off only to the senders. The only client-callable
endpoints this epic adds are subscribe/unsubscribe (session + active-membership
checked server-side) and the secret-gated cron scan (G10 adjacency).

### D5 — Schema: two tables, one migration

- `push_opt_ins` — `user_id`, `group_id`, `enabled`, `updated_at`; unique
  `(user_id, group_id)`. The toggle's server truth: consent must exist even before
  a subscription does (email fallback needs opted-in-no-subscription recipients).
- `push_subscriptions` — `id`, `user_id`, `group_id`, `endpoint` (unique, so an
  unsubscribe can address it), `p256dh`, `auth`, `created_at`; `user_id` never
  cascades (same fit as `entries.recorded_by_user_id`).

Delivery is enabled × channel: opt-in rows decide *whether*, subscription rows
carry *how*.

### D6 — Cron shape

`vercel.json` adds one daily cron (`/api/cron/reminder-scan`, fixed UTC hour in the
family's morning range). The route is `runtime = "nodejs"` (web-push is not
edge-safe), accepts only `Bearer $CRON_SECRET` from `CRON_SECRET` env, and
`.env.example` documents `CRON_SECRET`. Inside the handler, each group decides whether its local hour is inside its scan
window, so UTC drift doesn't double-send: the real guarantee is the dedup key
(user, subject, local day).
Locally, the route is triggerable by POSTing with the header.

### D7 — Copy lives in one module, Spanish only

`src/features/reminders/copy.ts` builds title/body from the subject display name:
`"Tu turno"` / `"Es el turno de X"`, plus a plain line inviting the weigh-in —
never a number, never a verdict word. Email subject and body reuse the same
builder. The per-recipient payload carries the subject id and the resolved
eligible-for-that-recipient display name; nothing else is needed to render copy.

## Risks / Trade-offs

- **Permission prompt placement.** Browsers only grant the notification prompt on a
  real user gesture; opt-in lives inside group settings so the gesture is genuine.
- **Cron drift.** Vercel Hobby cron may drift minutes; the local-day dedup key is
  the actual no-duplicate guarantee (a second scan the same local day is a no-op).
- **iOS web push needs the installed app** (iOS 16.4+ only allows Web Push for
  Home-Screen installs). The install guidance on iOS is therefore a prerequisite
  the opt-in flow explains, not an optional nicety.
- **`beforeinstallprompt` is Chromium-only.** Chrome/Edge show the install
  affordance; iOS gets guidance text; Firefox Android may show nothing — installing
  through the browser menu still works and remains acceptable.
- **Email failure deferral.** Resend errors are logged and counted, never retried
  in-process; tomorrow's scan is the retry.
