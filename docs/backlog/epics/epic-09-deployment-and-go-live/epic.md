# Epic 9 — Deployment & go live

Everything in epics 1–8 was verified locally: port 3015, a local database, and test fixtures standing in for a family. None of it is real until it runs at a domain a family can open on a phone. This epic deploys the app, swaps the database to Neon, and verifies the surfaces that only exist in production: OAuth callbacks, email deliverability, push notifications, the reminder cron, offline capture on real devices — then hands the app to the real family.

The guardrails touched are re-verified live, not by test but on rendered screens and payloads, in US-9.7 (G3, G7, G8, G10).

## Outcome

- The app runs at `https://<domain>`, backed by Neon, and everything user-facing on it is Spanish.
- US-1.8 is closed: the Google OAuth round trip completes on the deployed domain.
- Email, push, and the cron work in production, including the production-only risks: SPF/DKIM, cron idempotency.
- The real family weighs in: 4–6 profiles with mixed goals, real entries, real phones, at least one offline capture.
- Vercel and Neon free tiers run it — no paid dependency for a family app.

## Scope

### Platform (Vercel + domain)

- Vercel project connected to the repository, with the production domain attached.
- Every variable in `.env.example` filled in with real values on the platform; nothing committed.
- `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` point at the production domain.
- The build runs `lint` and `typecheck` as gates; the app runs on the platform's assigned port, with no dev port hardcoded.

### Database (Neon swap)

- The driver swap stays isolated in the single file planned for it (`postgres-js` locally, Neon serverless in production); no route or query changes.
- `drizzle-kit migrate` against the Neon database produces the full expected schema.
- Local development is unchanged: Docker Postgres on port 5435.
- Production starts empty — no synthetic data ships.

### Auth (closing US-1.8)

- The production callback `https://<domain>/api/auth/callback/google` is registered in the Google Cloud OAuth client before the first deploy.
- Sign-in works end to end from the production domain; a returning visitor stays signed in across a browser restart.
- One Google Cloud project owns the OAuth client; no fake local OAuth path is added.

### Email deliverability

- SPF and DKIM pass for the sending domain, verified with a real message.
- The email lands in the primary inbox, sender name and copy in Spanish, sent only when the cadence says someone's turn.

### Push and cron

- The VAPID keys are production secrets; a device subscribed on the production domain receives a real push.
- The Vercel Cron schedule fires daily and sends at most one reminder per day, verified live by invoking the job twice.
- Reminder payloads name the due people and never contain a weight (G7 checked on real payloads).

### Devices

- The PWA installs to the home screen on iOS and Android and launches standalone; the iOS not-installed path shows instructions instead of a dead notification button.
- Offline: the app opens to the last cached group sheet, says it is offline, queues a weigh-in, and syncs it on reconnect.

### Real family onboarding

- The production group holds 4–6 real profiles — at least one "maintain" and one "gain" — because the mixed-goal case that motivated the design is what synthetic data hides (G6).
- One real week of weigh-ins, including an offline capture; a G10 spot check reads what the server sends to a private member and to a viewer of a dependent (G8, G10).
- Direction language is goal-relative everywhere on production screens (G3).

## Not in this epic

- Monitoring or alerting beyond each platform's own dashboard.
- Backups or disaster recovery (unchanged from Epic 8's exclusions).
- Load or scale testing beyond one family.
- A staging environment or duplicate deployment.
- Native apps or app stores.
- Any other language than Spanish.

## Acceptance criteria

- [ ] **US-9.1** The app is deployed to Vercel and reachable at the production domain.
- [ ] **US-9.2** The database runs on Neon, migrated, with local development unchanged.
- [ ] **US-9.3** Google OAuth completes on the deployed domain (closes US-1.8).
- [ ] **US-9.4** Reminder emails arrive in the inbox, in Spanish, from a verified domain.
- [ ] **US-9.5** Push and the daily cron work in production, and idempotency is verified live.
- [ ] **US-9.6** The PWA installs and works offline on real phones.
- [ ] **US-9.7** The real family weighs in for one week on production, with the guardrail spot checks passing.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 8 | Nothing deploys before the guardrail audit has run |
| Depends on | 1–7 | Every surface being verified live must exist first |
| Depends on | 1 (US-1.8) | The one acceptance item this epic closes |
| Blocks | — | Nothing — this is the last epic; v1 ships from it |

## Risks

| Risk | Mitigation |
|---|---|
| The OAuth client's redirect list does not match the production callback and the deploy stalls | Register the production callback before the first deploy; one Google Cloud project owns the client |
| The sending domain starts cold and the emails land in spam | Send only the real turn emails, verify SPF/DKIM first, and test delivery to the actual inboxes before the family relies on it |
| Cron idempotency was only ever verified against the unit suite | Invoke the job twice on one production day and assert a single send |
| Environment differences (auth URLs, VAPID keys) drift between local and production | Every environment difference lives in the platform's env vars; nothing is hardcoded |
| Free-tier limits surprise on deploy day | Vercel Hobby allows one daily cron and Neon's free tier is enough for one family — validated during this epic |

## Size

**2 working days** · 14 story points
