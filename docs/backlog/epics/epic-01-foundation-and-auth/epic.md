# Epic 1 — Foundation & Google authentication

A deployable Next.js application where a user signs in with Google, lands in a first-run onboarding shell, and stays signed in across visits. The database schema, auth wiring and deployment pipeline are real by the end of this epic, so every later epic is feature work rather than setup work.

## Outcome

- A user can sign in with Google on the deployed domain and reach an authenticated app shell.
- Sessions survive page reloads and browser restarts.
- The database can be rebuilt from scratch with one command.
- The app runs on a phone screen and is operable by keyboard.

## Scope

### Project scaffold

- `git init`, `create-next-app` with TypeScript, App Router, Turbopack, Tailwind v4
- ESLint + Prettier wired to the project scripts
- `shadcn/ui` initialised (theme tokens as CSS variables in `globals.css`; **no** `tailwind.config.js` — v4 uses CSS-first config)
- Neon Postgres project + `@neondatabase/serverless`
- Drizzle ORM configured with `drizzle-orm/neon-http`; `drizzle-kit` scripts for `generate` and `migrate`

### Database

Only the tables Epic 1 actually reads or writes land here. Later epics add their own tables with their own migrations — the schema grows with the code instead of speculating ahead of it.

```sql
-- Better Auth owns: user, session, account, verification

profiles (
  id            uuid primary key,
  user_id       text null references user(id) on delete cascade,
  display_name  text not null,
  unit          text not null default 'kg',       -- 'kg' | 'lb'
  avatar_emoji  text null,
  is_dependent  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
)
-- user_id NULL  => managed profile: no login of its own (kid, grandparent, shared laptop)
-- is_dependent  => child-like profile: trend-only, no target, no BMI, no ranking
```

> The two flags are orthogonal on purpose. A grandparent may be managed (no login) while still owning a goal. A kid is both managed and dependent.

### Authentication

- Better Auth with the Google social provider (`socialProviders.google`)
- `drizzleAdapter(db, { provider: "pg" })`
- Catch-all handler mounted at `app/api/auth/[...all]/route.ts` via `toNextJsHandler(auth)`
- Session read helper + route protection (unauthenticated users are redirected to sign-in)
- Sign-out

### App shell

- Root layout with header, content area, and light/dark theme
- Responsive baseline: single column on phones, comfortable on desktop
- `app/manifest.ts` stub with `display: "standalone"` (full PWA work lands in Epic 7)
- Environment validation for `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`

## Not in this epic

- Groups, memberships or invitations (Epic 3)
- Goals, targets or BMI (Epics 2 and 5)
- Weight entries of any kind (Epic 4)
- Service worker, offline behaviour, push notifications (Epic 7)
- Any `profiles` column beyond the ones listed above — `height_cm` arrives in Epic 5

## Acceptance criteria

- [ ] **US-1.1** A user can sign in with Google and is authenticated. — *The flow is wired and the session round trip is covered by integration tests, but the Google consent screen has not been exercised: it needs the OAuth client credentials.*
- [x] **US-1.2** The session survives a reload and a new browser session.
- [x] **US-1.3** Signing out ends the session on the server, not only in the client.
- [x] **US-1.4** A first-time signer is routed to onboarding; a returning signer is not.
- [x] **US-1.5** The shell is usable at 360 px wide with no horizontal scrolling.
- [x] **US-1.6** Every interactive element is reachable and operable by keyboard, with an accessible name.
- [x] **US-1.7** `drizzle-kit migrate` against an empty database produces the full expected schema.
- [ ] **US-1.8** The deployed domain completes the Google OAuth round trip (`https://<domain>/api/auth/callback/google`). — *Pending: needs the Google OAuth client and the deployed domain.*
- [x] `npm run lint` and `npm run typecheck` pass with no errors.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| — | — | Starting point |
| Blocks | 2 | Profiles need a signed-in user |
| Blocks | 3 | Groups need a user to own them |

## Risks

| Risk | Mitigation |
|---|---|
| Google OAuth fails locally because the callback is HTTPS-only | Develop against the deployed domain or a tunnel from day one; do not add a fake local OAuth path |
| Better Auth's Drizzle adapter import path changed between releases | Pin the version at install and verify the path (`better-auth/adapters/drizzle` vs `@better-auth/drizzle-adapter`) before wiring the adapter |
| `profiles.user_id` cascades on account delete while entries must not | Deletion semantics are owned by Epic 8; entries keep their own attribution column that never cascades |

## Size

**2 working days** · 16 story points
