# Proposal

## Why

Weight Tracker has a complete, reviewed backlog and no application. Nothing exists that
can be signed into, no schema, and no deployable target — so every later epic would be
setup work disguised as feature work. This change establishes the foundation the other
seven epics build on: a real database schema, real Google authentication, and a real
app shell that a signed-in user can reach and stay signed into.

The product's riskiest property is guardrail G10 — visibility filtering enforced
server-side on every read. That surface cannot be built on an unverified data layer, so
the foundation must be reproducible and testable from the first commit.

## What Changes

- A Next.js 16.4.5 App Router project with TypeScript, Tailwind v4 (CSS-variable
  tokens, no `tailwind.config.js`), shadcn/ui, ESLint and Prettier.
- A Drizzle schema and migration set covering exactly the tables Epic 1 reads or writes:
  Better Auth's `user`, `session`, `account` and `verification` tables, plus a
  `profiles` table whose `user_id` is nullable (a managed profile has no login) and
  whose `is_dependent` flag is independent of it (a dependent is trend-only from the
  start).
- A local Docker Postgres for development and integration tests, with
  `drizzle-kit migrate` able to rebuild the schema from an empty database in one
  command.
- Better Auth wired with the Google social provider and the Drizzle adapter
  (`better-auth/adapters/drizzle`), mounted at `app/api/auth/[...all]/route.ts`.
- A server-side session read helper and route protection: unauthenticated requests are
  redirected to sign-in rather than shown an error.
- A first-run onboarding route that a first-time signer reaches and a returning signer
  does not; interrupted onboarding resumes rather than restarts.
- Server-side sign-out that destroys the session, not only the client cookie.
- The app shell: root layout, header, content area, light and dark themes, a
  `app/manifest.ts` stub with `display: "standalone"`, and a responsive baseline that
  works at 360 px.
- Startup validation of `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, failing loudly rather than degrading
  silently.
- Every user-facing string in Spanish.

Guardrails touched: **G3** (all copy is goal-relative or neutral, never moralised) and
**G10** (the data layer that later serves filtered reads is established first, with
migrations reproducible in one command). G1, G2, G4, G5, G6, G7, G8 and G9 are not
reachable in this epic — no entries, goals, board or reminders exist yet.

User stories covered: **US-1.1** through **US-1.8**.

## Capabilities

### New Capabilities

- `auth`: Google sign-in, session persistence and expiry, server-side sign-out,
  route protection, and the first-run onboarding routing that separates a first-time
  signer from a returning one.
- `app-shell`: The application's frame — root layout, header, navigation between the
  public and authenticated areas, light and dark theme, the PWA manifest stub, the
  responsive baseline down to 360 px, keyboard operability with accessible names, and
  startup environment validation.

### Modified Capabilities

None. This is the first change; the project has no existing capabilities.

## Impact

- **New application** at the repository root: Next.js App Router project, `src/` tree
  for `app`, `components`, `db`, `auth` and `lib`.
- **New database schema**: `profiles` plus the Better Auth tables, with generated
  Drizzle migrations committed to the repository.
- **New infrastructure**: `docker-compose.yml` running `postgres:17-alpine` for local
  development and tests.
- **New dependencies**: `next`, `react`, `better-auth`, `drizzle-orm`, `drizzle-kit`,
  `postgres`, `tailwindcss`, `shadcn` components, `zod` for environment validation,
  and `vitest` for tests.
- **New environment contract**: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`, documented in
  `env.example`.
- **External dependency**: the Google OAuth client and, for US-1.8, a deployed HTTPS
  domain whose callback URL is registered as `https://<domain>/api/auth/callback/google`.
