# User Stories — Epic 9 — Deployment & go live

## Personas in this epic

| Persona | Need |
|---|---|
| **Ana** (recorder) | A URL the family opens every weigh-in beside the scale, that always works |
| **Nina** (owner) | To run production without paying, and without a machine of ours left switched on |
| **Luis** (member) | Notifications and offline that behave as they did locally, on his phone |
| **Sofía** (private member) | Production proof that her invisibility is enforced by the server, not by luck |

---

### US-9.1 — Deploy to Vercel at a real domain

**As a** Nina **I want** the app deployed at a real domain **so that** the family stops depending on a dev server on a laptop.

**Acceptance criteria**

- [ ] The app is reachable at `https://<domain>` and loads on a phone.
- [ ] Every variable in `.env.example` is set with a real value on the platform; no secret is committed anywhere.
- [ ] `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` point at the production domain.
- [ ] The deployed build gates on `lint` and `typecheck`, and nothing in production depends on the dev port.

**Story points:** 2

---

### US-9.2 — Swap the database to Neon

**As a** Nina **I want** production data in Neon **so that** nothing of ours has to be running for the app to work.

**Acceptance criteria**

- [ ] The driver swap is isolated in the single file planned for it; no route, query or schema file changes.
- [ ] `drizzle-kit migrate` against the Neon database produces the full expected schema.
- [ ] Local development still runs on Docker Postgres on port 5435, unchanged.
- [ ] Production starts with an empty database — no synthetic data ships.

**Story points:** 1

---

### US-9.3 — Close US-1.8: Google OAuth on the deployed domain

**As a** Nina **I want** sign-in to work on the production domain **so that** the family can actually use the app.

**Acceptance criteria**

- [ ] `https://<domain>/api/auth/callback/google` is registered in the Google Cloud OAuth client before the first deploy.
- [ ] Signing in with Google from the production domain completes the round trip and lands in the app.
- [ ] A returning visitor stays signed in across reloads and a browser restart.
- [ ] One Google Cloud project owns the OAuth client, and no fake local OAuth path exists.

**Story points:** 2

---

### US-9.4 — Reminder emails arrive in the inbox

**As a** Luis **I want** the email reminder to actually arrive **so that** I know the group's weigh-in is due.

**Acceptance criteria**

- [ ] SPF and DKIM pass for the sending domain, verified with a real message.
- [ ] The email arrives from a verified domain and lands in the primary inbox, not spam.
- [ ] Sender name and body copy are the app's Spanish copy — no English reaches the inbox either.
- [ ] Emails are sent only when the cadence says someone's turn, and never mention a weight.

**Story points:** 2

---

### US-9.5 — Push and the cron work in production

**As a** Ana **I want** the notification naming whose turn it is **so that** nobody forgets a weigh-in.

**Acceptance criteria**

- [ ] The VAPID keys are set as production secrets, and a device subscribed on the production domain receives a real push.
- [ ] The Vercel Cron schedule fires daily and sends at most one reminder per day.
- [ ] Idempotency is verified live: running the job twice in one day does not send a second notification.
- [ ] A real payload names the due people and contains no weight value.

**Story points:** 2

---

### US-9.6 — Install and use offline on real phones

**As a** Luis **I want** the PWA behaviours verified on my phone **so that** the app works where the scale is.

**Acceptance criteria**

- [ ] The app installs to the home screen on iOS and Android and launches without browser chrome.
- [ ] On iOS, before installation, the app shows install instructions instead of a notification button that cannot work.
- [ ] With no connection, the app opens the last cached group sheet and says it is offline.
- [ ] A weigh-in recorded offline queues, shows as queued, and syncs when the connection returns.

**Story points:** 2

---

### US-9.7 — The real family weighs in

**As a** Nina **I want** the family actually on the app **so that** the shared history is kept for real again.

**Acceptance criteria**

- [ ] The production group has 4–6 real profiles, including at least one "maintain" goal and one "gain" goal.
- [ ] One week of real weigh-ins is logged through the production app, including at least one offline capture.
- [ ] Direction language is goal-relative on every production screen a member sees.
- [ ] A production spot check reads what the server sends to a private member and to a viewer of a dependent, and it contains nothing more.
- [ ] Anything that falls out during the week is recorded as a task before it is fixed.

**Story points:** 3
