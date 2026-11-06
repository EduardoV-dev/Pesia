# Weigh In — product backlog

An invite-only PWA where one recorder logs everyone's weight on a shared screen, each member sees their own goal-relative trend, and the group sees **consistency — never body size**.

The product exists because a family weighs everyone in together, and the shared history was lost when the laptop stayed behind. Mobile-first, closed by default, and built so that comparison can never turn into shame.

**Working title:** "Weigh In" — cosmetic, rename freely.

---

## Quick path

1. Read the [guardrails](#guardrails-apply-to-every-epic) below — they are acceptance criteria, not aspirations.
2. Read the [epic index](#epic-index) to see the execution order.
3. Pick the next epic with no unresolved dependencies.
4. Open its `epic.md` for scope, then its `user-stories.md` for the work items.

---

## Guardrails (apply to every epic)

These were settled during product discovery. They exist because self-weighing is safe but **comparison framing is not**: research on self-weighing shows no increase in disordered-eating symptoms, while clinical guidance warns that frequent weighing and body-focused comparison can feed harmful behavior. The app must never become the thing that pushes.

Every epic is done only when its stories satisfy these. Where an epic touches one, the story repeats it as an explicit acceptance criterion.

| # | Guardrail | Where it bites |
|---|---|---|
| G1 | Never rank by magnitude of body change. Rank behavior only. | Board, awards |
| G2 | Never show a raw single-reading delta. Only rolling trends with a deadband. | Stats, board |
| G3 | Direction language is goal-relative ("moving toward your goal"), never moralized. | All copy |
| G4 | BMI optional, off by default, private to the member, never on the board, framed as a screening measure. | Stats |
| G5 | No calorie or weight-loss nudges. "Maintain" and "Gain" are first-class goals. | Stats, copy |
| G6 | Goal direction derives from the user's own target. Never assume "lose". | Profiles, stats |
| G7 | Reminders are opt-in, name whose turn it is, never mention a weight. | Reminders |
| G8 | Hidden members render as "private". The app never infers a reason for absence or non-sharing. | Board, reminders |
| G9 | Dependents are trend-only: no target, no progress %, no ranking, no BMI. | Profiles, board |
| G10 | Visibility filtering is enforced **server-side on every read**. The client never receives data the viewer may not see. | Board, entries |

> **G10 is the highest-risk surface in the product.** If it leaks, the app is toxic. It gets integration tests before anything else ships.

---

## Epic index

| # | Epic | Outcome | Depends on | Stories | Size |
|---|---|---|---|---|---|
| 1 | [Foundation & Google auth](epic-01-foundation-and-auth/epic.md) | Deployable app where a user signs in with Google and lands in onboarding | — | 8 | 2 d |
| 2 | [Profiles & identity](epic-02-profiles-and-identity/epic.md) | A profile exists independently of a login, so kids, grandparents and shared laptops all work | 1 | 10 | 1.5 d |
| 3 | [Groups, roles & permissions](epic-03-groups-and-permissions/epic.md) | Closed groups with roles, log permissions, per-member visibility and ranking opt-out | 2 | 17 | 2 d |
| 4 | [Entries & offline capture](epic-04-entries-and-offline/epic.md) | Anyone with permission logs a weigh-in, offline, attributed, correctable | 3 | 10 | 2.5 d |
| 5 | [Stats engine & personal trend](epic-05-stats-and-personal-trend/epic.md) | Each member sees their own goal-relative trend with no false alarms | 4 | 10 | 2 d |
| 6 | [Group board & awards](epic-06-group-board-and-awards/epic.md) | The group sees consistency and each person's own progress, filtered by consent | 5 | 11 | 2 d |
| 7 | [PWA & reminders](epic-07-pwa-and-reminders/epic.md) | Installable app that nudges the recorder about whose turn it is | 4 | 10 | 2 d |
| 8 | [Export, deletion & guardrail audit](epic-08-export-deletion-and-polish/epic.md) | Users can take their data and leave; the whole app passes the guardrail audit | 6, 7 | 8 | 1.5 d |

**Total: 84 stories, 179 story points, 15.5 working days** for one developer — about 3 weeks with buffer.

---

## Execution order

```
Epic 1 ──▶ Epic 2 ──▶ Epic 3 ──▶ Epic 4 ──▶ Epic 5 ──▶ Epic 6 ──▶ Epic 8
                                  └──────────────────────▶ Epic 7 ────────┘
```

Epic 4 is the convergence point: Epic 5 (stats) and Epic 7 (reminders) both depend on it and can run in parallel afterwards.

---

## Personas used across all epics

| Persona | Who | What they need |
|---|---|---|
| **Ana** | The recorder. Owns the scale, logs everyone's weight. | Speed, offline reliability, one-handed entry |
| **Luis** | Member with a phone. Logs his own weight. | To know if he is moving toward *his* goal, not a global scale |
| **Mara** | Managed profile. A kid with no phone and no login. | Her guardian records her weight; nobody scores her |
| **Nina** | Guardian and group Owner. Manages her kid and her own profile. | Control over who logs and who sees what |
| **Sofía** | Member with visibility set to private and ranking opt-out on. | Certain that the app never surfaces her data or her absence |

---

## Out of scope for v1 (deliberately, so it does not creep in)

Body fat and body composition · calories or nutrition tracking · photos · public groups, discovery or group search · native mobile apps · smart-scale device integration · comments or a social feed · punitive streaks · admin tooling beyond roles.

**Why no feed or comments:** that is where body shaming breeds fastest, and nothing in the brief needs them.

---

## Open items blocking M1

1. **Domain + hosting sign-up.** Google OAuth needs a public HTTPS callback (`https://<domain>/api/auth/callback/google`). The deployed domain is required before auth can be tested end to end.
2. **A real family group for testing.** 4–6 profiles with real goal directions — at least one "maintain" and one "gain" — so the mixed-goal case that motivated the design is actually exercised. Synthetic data hides exactly the bugs that matter here.

---

## Stack (verified against current docs)

| Concern | Choice |
|---|---|
| Framework | Next.js 16.2.9, App Router, Turbopack, React 19 |
| Language | TypeScript |
| Styling | Tailwind v4 + shadcn/ui (`npx shadcn init`; theme tokens as CSS variables in `globals.css`; no `tailwind.config.js`) |
| Auth | Better Auth 1.7.15 — `socialProviders.google`, `drizzleAdapter(db, { provider: "pg" })`, mounted via `toNextJsHandler` at `app/api/auth/[...all]/route.ts` |
| Data | Drizzle ORM + `@neondatabase/serverless` (`drizzle-orm/neon-http`); `drizzle-kit generate` → `drizzle-kit migrate` |
| Offline | Serwist service worker (Next 16 + Turbopack pattern), IndexedDB write queue |
| PWA | `app/manifest.ts` with `display: "standalone"` + icons |
| Notifications | `web-push` (VAPID) behind Vercel Cron; Resend for email fallback |
| Hosting | Vercel (Hobby) + Neon (Free) — free tiers cover a closed family app |

**Version caution:** Better Auth's Drizzle adapter import path changed between releases (`better-auth/adapters/drizzle` vs `@better-auth/drizzle-adapter`). Pin the version at install and verify which path matches.

---

## Document conventions

- Each epic folder holds `epic.md` (scope and acceptance) and `user-stories.md` (the work items).
- Story IDs are `US-<epic>.<n>` and are referenced by acceptance criteria in the epic file.
- Acceptance criteria use Given/When/Then so they can be verified without reconstructing intent.
