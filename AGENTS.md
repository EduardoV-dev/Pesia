# Weight Tracker — Agent Instructions

Durable instructions for any agent working in this repository. Read this file before
planning or changing anything.

---

## 1. What this product is

An invite-only PWA where one recorder logs everyone's weight on a shared screen, each
member sees their own goal-relative trend, and the group sees **consistency — never body
size**. Mobile-first, closed by default, built so comparison can never become shame.

The full product definition lives in `docs/backlog/epics/` — 9 epics, 91 user stories.
Read `docs/backlog/epics/README.md` first; it contains the guardrail table that governs
every epic.

---

## 2. Hard rules

### 2.1 The application is in Spanish only

Every user-facing string is Spanish: UI labels, buttons, empty states, validation and
error messages, emails, push notification copy, reminders, the privacy policy and the
terms of use. No English reaches the user.

Developer-facing material stays in English: identifiers, code comments, OpenSpec
artifacts and these docs — they match the existing backlog.

Direction language is goal-relative and never moralised. Use
"moviendo hacia tu objetivo" / "alejándote de tu objetivo" / "estable". Never
"ganado", "perdido", "bien", "mal", or a bare number with a red/green verdict.

### 2.2 Guardrails G1–G10 are acceptance criteria, not aspirations

They live in `docs/backlog/epics/README.md`. The ones that shape code most:

| #   | Guardrail                                                                      | Where it bites   |
| --- | ------------------------------------------------------------------------------ | ---------------- |
| G1  | Never rank by magnitude of body change. Rank behaviour only.                   | Board, awards    |
| G2  | Never show a raw single-reading delta. Only rolling trends with a deadband.    | Stats, board     |
| G3  | Direction language is goal-relative, never moralised.                          | All copy         |
| G4  | BMI optional, off by default, private to the member, never on the board.       | Stats            |
| G5  | No calorie or weight-loss nudges. "Maintain" and "Gain" are first-class goals. | Stats, copy      |
| G6  | Goal direction derives from the user's own target. Never assume "lose".        | Profiles, stats  |
| G7  | Reminders are opt-in, name whose turn it is, never mention a weight.           | Reminders        |
| G8  | Hidden members render as "private". Never infer a reason for absence.          | Board, reminders |
| G9  | Dependents are trend-only: no target, no progress %, no ranking, no BMI.       | Profiles, board  |
| G10 | Visibility filtering is enforced server-side on every read.                    | Board, entries   |

**G10 is the highest-risk surface in the product.** If it leaks, the app is toxic. It
gets integration tests before anything behind it ships. There is no client-side
filtering step, and no API route that returns raw membership plus raw entries.

### 2.3 Write permission is not read permission

`can_log_for` governs writes. `visibility` governs reads. They are separate checks with
no code path that treats one as the other. A Logger may record Ana's weight without
being able to open Ana's trend.

### 2.4 Entries are append-only and attributed

- `id` is a client-generated UUID v4, so a retried sync upserts instead of duplicating.
- `recorded_by_user_id` never cascades and is never nulled.
- `measured_at` (when the person stood on the scale) and `recorded_at` (when it was
  typed) are different facts and are always displayed distinctly.
- Notes on entries are private to their author at every visibility level.
- A deleted entry leaves no placeholder — a "hidden entry" marker would itself leak that
  something was withheld.

---

## 3. How to work here

### 3.1 OpenSpec drives the build

One OpenSpec change per epic, in the order below. For each change:

```
openspec new change "<name>"     # proposal -> specs -> design -> tasks
/openspec-apply-change <name>    # implement, ticking tasks as they land
/openspec-archive-change <name>  # fold delta specs into openspec/specs/
```

| #   | Change                               | Capabilities                                          |
| --- | ------------------------------------ | ----------------------------------------------------- |
| 1   | `epic-01-foundation-and-auth`        | `auth`, `app-shell`                                   |
| 2   | `epic-02-profiles-and-identity`      | `profiles`, `goals`                                   |
| 3   | `epic-03-groups-and-permissions`     | `groups`, `permissions`                               |
| 4   | `epic-04-entries-and-offline`        | `entries`, `offline-capture`                          |
| 5   | `epic-05-stats-and-personal-trend`   | `stats`                                               |
| 6   | `epic-06-group-board-and-awards`     | `group-board`, `awards`                               |
| 7   | `epic-07-pwa-and-reminders`          | `pwa`, `reminders`                                    |
| 8   | `epic-08-export-deletion-and-polish` | `data-export`, `account-lifecycle`, `guardrail-audit` |
| 9   | `epic-09-deployment-and-go-live`     | infra only — no capability deltas (proposal, design, tasks) |

Do not implement an epic without its change. Do not skip the archive step — the
accumulated `openspec/specs/` is the real system spec.

### 3.2 UI work starts with impeccable comps

Before writing any screen:

1. `impeccable init` has produced `PRODUCT.md` (it owns product truth).
2. Run `impeccable concept-seed --scope direction --mode operate` and follow the
   direction it prints.
3. Build the comps it asks for, put them in front of the user, and **wait for the
   pick**. The user chooses the direction of the UI.
4. Record the chosen direction in the surface brief, then build against it.

The app is an **Operate** surface: the world contributes type, palette, density and one
signature move, never the layout, the navigation model or the controls. Every control
is a standard web control the visitor already knows.

**The visual direction is already decided** (user-pinned, 2026-11-06): warm peach
gradient canvas, pure-white large-radius cards, one saturated orange accent, near-black
ink, big heavy grotesk numerals, dotted-grid plot fields, pill chips. The signature move
is the orange sparkline with hollow dot markers. The full contract lives in
`.impeccable/surface-brief.md`; the reference comp is
`.impeccable/mocks/peach/weigh-in-sheet.html`. Build against it — do not re-roll the
direction, and do not introduce a second accent colour or a red/green verdict.

### 3.3 Standards to load before editing code

- `ev-coding-standards` → then `ev-review-nextjs`, `ev-review-react`,
  `ev-review-typescript` for the scoped files, plus `ev-api-contracts` for API routes.
- `ponytail` for every coding task: smallest complete change, no speculative options.
- `go-testing` / framework-appropriate testing guidance for test work.
- `neon-postgres` when touching Neon, branches or migrations.

Read them; do not work from memory.

### 3.4 Git

- `main` is production. Never commit to it.
- `development` is where all work happens. Commit per epic, conventional commit
  messages, no `Co-Authored-By` and no AI attribution.
- Never force-push, never amend a pushed commit, never commit secrets.

---

## 4. Stack

| Concern       | Choice                                                                                |
| ------------- | ------------------------------------------------------------------------------------- |
| Framework     | Next.js 16.4.5, App Router, Turbopack, React 19.3.1                                   |
| Package mgr   | pnpm 12 — use `pnpm run <script>`, never `npm`                                        |
| Ports         | Next.js always on **3015** (fixed in the `dev`/`start` scripts); Postgres on **5435** |
| Language      | TypeScript                                                                            |
| Styling       | Tailwind v4 + shadcn/ui — CSS variables in `globals.css`, **no** `tailwind.config.js` |
| Auth          | Better Auth 1.7.18 — adapter import path is `better-auth/adapters/drizzle`            |
| Data          | Drizzle ORM 0.45.4, `drizzle-kit generate` → `drizzle-kit migrate`                    |
| DB driver     | `postgres-js` locally (Docker Postgres); the Neon swap is isolated in one file        |
| Offline       | Serwist 9.5.13 service worker, IndexedDB write queue                                  |
| PWA           | `app/manifest.ts`, `display: "standalone"`                                            |
| Notifications | `web-push` (VAPID) behind a Vercel Cron; Resend for email fallback                    |
| Tests         | Vitest 5.1 (unit + integration against real Postgres)                                 |

**Version caution:** Better Auth's Drizzle adapter import path changed between releases.
It is `better-auth/adapters/drizzle` in 1.7.x — verify before wiring.

---

## 5. Environment variables

Never commit real values. `.env.example` documents the contract — copy it to
`.env.local` and fill it in.

```
DATABASE_URL                 # postgres://user:pass@localhost:5435/weight_tracker
BETTER_AUTH_SECRET           # openssl rand -base64 32
BETTER_AUTH_URL              # http://localhost:3015 in dev
GOOGLE_CLIENT_ID             # Epic 1
GOOGLE_CLIENT_SECRET         # Epic 1
NEXT_PUBLIC_APP_URL          # Epic 1
VAPID_PUBLIC_KEY             # Epic 7
VAPID_PRIVATE_KEY            # Epic 7
VAPID_SUBJECT                # Epic 7, mailto: of the domain contact
RESEND_API_KEY               # Epic 7
EMAIL_FROM                   # Epic 7, a verified sending domain
```

---

## 6. Definition of done for an epic

1. Every acceptance criterion of its user stories passes, and the epic's own acceptance
   list is ticked in `docs/backlog/epics/<epic>/epic.md`.
2. Guardrails the epic touches are covered by a test or an explicit copy review.
3. `pnpm run lint` and `pnpm run typecheck` pass with no errors.
4. The OpenSpec change is archived and `openspec/specs/` reflects the behaviour.
5. The work is committed on `development` and reported to the user with what shipped,
   what is verified and what is still open.
