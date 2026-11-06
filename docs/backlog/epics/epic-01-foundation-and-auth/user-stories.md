# User Stories — Epic 1 — Foundation & Google authentication

## Personas in this epic

| Persona | Need |
|---|---|
| **Ana** (recorder) | Gets in with one tap and lands straight where she left off |
| **Luis** (member) | Signs in once and is not asked to sign in again on every visit |
| **Nina** (guardian/owner) | Uses the app on her phone without pinch-zooming |

---

### US-1.1 — Sign in with Google

**As a** member **I want** to sign in with my Google account **so that** I can start tracking without inventing another username and password.

**Acceptance criteria**

- [ ] Given I am signed out, when I tap "Continue with Google", then the Google consent screen opens.
- [ ] Given Google returns a valid credential, when I complete consent, then I am signed in and land on the app shell.
- [ ] Given Google returns an error or the user cancels, then I stay signed out and see a readable message — never a blank screen or a stack trace.
- [ ] Given I am already signed in, then the sign-in button is not shown.

**Story points:** 3

---

### US-1.2 — Stay signed in

**As a** member **I want** to stay signed in between visits **so that** I open the app and get straight to work.

**Acceptance criteria**

- [ ] Given I signed in yesterday, when I reopen the app today, then I am still authenticated.
- [ ] Given I signed in on a phone and reopen the same origin in another browser, then I am **not** signed in there — the session is not shared across devices.
- [ ] Given my session has expired, when I make a request, then I am redirected to sign-in rather than shown an error.

**Story points:** 2

---

### US-1.3 — Sign out

**As a** member **I want** to sign out **so that** my data is not accessible on a shared family device.

**Acceptance criteria**

- [ ] Given I am signed in, when I sign out, then the server session is destroyed and I am returned to the signed-out screen.
- [ ] Given I signed out, when I press the browser back button, then no authenticated content is shown.

**Story points:** 1

---

### US-1.4 — Arrive at onboarding

**As a** first-time user **I want** to be routed to onboarding after my first sign-in **so that** the app explains itself before I use it.

**Acceptance criteria**

- [ ] Given I have signed in for the first time, when authentication completes, then I land on onboarding.
- [ ] Given I have completed onboarding before, when I sign in again, then I land on the app home.
- [ ] Given I leave onboarding halfway, when I come back, then I resume onboarding rather than starting over.

**Story points:** 2

---

### US-1.5 — Use the app on a phone

**As a** member **I want** the app to work on my phone **so that** I can use it where the weighing actually happens — not only at a desk.

**Acceptance criteria**

- [ ] At 360 px wide the layout has no horizontal scroll.
- [ ] Primary actions are reachable with one thumb.
- [ ] Text remains legible in both light and dark themes.

**Story points:** 2

---

### US-1.6 — Operate the app without a mouse

**As a** member using assistive technology **I want** the app to be fully operable by keyboard and screen reader **so that** I can use it independently.

**Acceptance criteria**

- [ ] Every interactive element is reachable in a logical order via Tab.
- [ ] Every interactive element has an accessible name.
- [ ] Focus is visible at all times and never trapped.
- [ ] The sign-in flow is completable with the keyboard alone.

**Story points:** 2

---

### US-1.7 — Rebuild the database from one command

**As a** developer **I want** the schema to be reproducible with a single command **so that** setup and CI are deterministic.

**Acceptance criteria**

- [ ] Given an empty database, when I run the migrate script, then every table, column, index and foreign key expected by Epic 1 exists.
- [ ] Running the migrate script a second time against an up-to-date database is a no-op.
- [ ] The schema definition lives in code, not in hand-written SQL.

**Story points:** 1

---

### US-1.8 — Deploy with a working Google callback

**As a** developer **I want** the deployed app to complete Google sign-in **so that** auth is verifiable before any feature work depends on it.

**Acceptance criteria**

- [ ] The deployed domain serves the app over HTTPS.
- [ ] The Google OAuth redirect URI is registered as `https://<domain>/api/auth/callback/google`.
- [ ] The Google consent screen lists the correct app name, support email and privacy-policy link.
- [ ] A sign-in on the deployed domain creates a session and a `profiles` row.

**Story points:** 3
