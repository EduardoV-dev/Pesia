# Design

## Context

The repository contains a product backlog and nothing else: no application, no schema,
no dependency manifest. See `proposal.md` for motivation and `specs/auth/spec.md` and
`specs/app-shell/spec.md` for the behaviour contract.

Two constraints shape the technical approach:

- **The database must be runnable today.** Neon credentials do not exist yet, and the
  user will configure the cloud database at deploy time. Development, the full test
  suite and every migration must work against a local Postgres container now.
- **The schema is the foundation for G10.** Later epics enforce visibility filtering on
  server-side reads. The schema, its migrations and the test harness must therefore be
  correct and reproducible before any feature is layered on top.

## Goals / Non-Goals

**Goals:**

- A Next.js project that boots, migrates, signs a member in with Google, and survives a
  reload with the session intact.
- One command that rebuilds the whole schema from an empty database.
- A local Postgres in Docker so that development and the integration suite need no
  third-party credentials.
- A driver swap to Neon at deploy time that touches one file and no query.
- An environment contract that fails loudly and in Spanish when something is missing.

**Non-Goals:**

- Any weight entry, goal, group, board or reminder. Those belong to Epics 2–7.
- Production deployment, custom domains and the Google consent screen configuration.
  Those need credentials the user does not have yet.
- A dark theme that is mechanically inverted. The pinned direction's dark variant is
  derived from the same world (warm deep ground, same orange) — a design decision, not
  a palette inversion.

## Decisions

### The database driver is `postgres-js` now, and the Neon swap lives in one file

The whole application imports a single `db` instance. Today that instance is created by
`drizzle-orm/postgres-js` over a `postgres` client pointed at the Docker container. At
deploy time it is created by `drizzle-orm/neon-http` over `@neondatabase/serverless`.

**Why:** the query API, the table definitions and every `db.select()` call are
identical across the two drivers — only the client construction differs. Isolating it
in `src/db/client.ts` means the Neon migration is a one-file change plus one line in
`drizzle.config.ts`, and no query is ever rewritten.

**Alternative considered:** starting on `neon-http` and requiring Neon credentials
immediately. Rejected: it blocks all local work and all integration testing until
credentials arrive, and Neon still speaks the PostgreSQL wire protocol over TCP, so
there is no capability lost by starting local.

**Alternative considered:** running two drivers behind a runtime switch. Rejected as
speculative — a single `if` in one file is enough, and a runtime switch would make the
production path the less-travelled one.

### "Onboarding complete" means "a profile exists for this user"

No separate flag is stored. A member has completed onboarding exactly when a `profiles`
row exists whose `user_id` equals their Better Auth user id.

**Why:** it removes a column and a state to keep in sync, and it matches the backlog:
US-2.1 says a profile is created when onboarding completes. The redirect logic becomes
a single query — "does this user have a profile?" — which is the same query the app
shell needs for the header anyway.

### Route protection is enforced twice: `proxy.ts` optimistically, the server authoritatively

`proxy.ts` (Next.js 16's replacement for `middleware.ts`) checks the presence of a
session cookie and redirects unauthenticated requests away from protected routes
without a database round trip. Every protected server component and route handler then
calls `auth.api.getSession({ headers })` and redirects on its own if the session is
missing or expired.

**Why:** the proxy gives a fast, correct redirect for the common case; the server-side
check is the actual guarantee. A cookie can be present and still be invalid, and a
client-side-only check would let protected content reach the browser.

**Alternative considered:** proxy-only protection. Rejected — an expired or tampered
cookie would pass the proxy and render authenticated content.

### The auth tables are generated, the product tables are hand-written

Better Auth owns `user`, `session`, `account` and `verification`. Their definitions are
produced by Better Auth's own schema generator so that column names, indexes and
foreign keys match the library's expectations exactly. Only `profiles` is written by
hand.

**Why:** hand-copying an auth schema is how adapter mismatches happen; the generator is
the source of truth and is re-runnable when the library is upgraded.

### `profiles.user_id` is nullable and unique when present; `is_dependent` is a separate flag

A profile with no `user_id` is a managed profile — someone without a login, such as a
grandparent or a child. A profile with `is_dependent = true` is trend-only. The two
flags are independent on purpose: a grandparent is managed but keeps her own goal, and
a dependent is both managed and trend-only.

**Why:** the backlog's data model requires it, and collapsing the two into one flag
would make "a dependent with her own account" impossible to express.

### Environment variables are validated by one zod schema at module load

`src/constants/environment-variables.ts` parses the process environment once and throws a Spanish error naming the
missing variable. `src/db/client.ts` and `src/auth/auth.ts` both import it.

**Why:** the failure mode of a missing `DATABASE_URL` is otherwise a confusing driver
error several layers down, and the failure mode of a missing OAuth secret is a broken
sign-in button discovered by a user.

### Tokens are CSS variables in `globals.css`; Tailwind v4 needs no config file

The pinned peach direction is expressed as CSS custom properties under `:root` and a
dark override under `.dark`, with Tailwind v4's `@theme inline` mapping those variables
onto utility names. There is no `tailwind.config.js`.

**Why:** this is how Tailwind v4 and shadcn/ui are meant to work, and it keeps the
visual direction editable as design tokens rather than as scattered utility classes.

### Integration tests run against a real Postgres, isolated per test file

The suite has two Vitest projects. Unit tests run in Node with no database. Integration
tests run against the Docker container's `weight_tracker_test` database, whose schema
is created by the same migration command the application uses. Each integration test
file wraps its work in a transaction that is rolled back at the end.

**Why:** the G10 matrix that Epic 3 and Epic 6 depend on is a database-level assertion.
Mocking the database would test the mock. Rollback gives each file isolation without
recreating the schema.

### The pinned direction's dark theme is derived, not inverted

The light theme is the peach canvas with white cards. The dark theme uses a deep warm
brown ground, cards in a slightly lifted warm charcoal, the same orange accent and the
same ink hierarchy — a different material from the same world, not the same colours
with the lightness flipped.

**Why:** a mechanical inversion of a warm peach produces a cold, muddy grey that reads
as a different product.

## Risks / Trade-offs

- **Google's OAuth callback is HTTPS-only in production** → the deployed domain and its
  registered callback are required for US-1.8; local development uses the
  `http://localhost:3010` callback that Google allows. No fake local OAuth path is
  added.
- **Better Auth's Drizzle adapter import path changed between releases** → the path is
  verified against the installed version's export map before wiring, and pinned in
  `AGENTS.md` as `better-auth/adapters/drizzle`.
- **The Neon driver swap is untested until credentials exist** → the swap is confined to
  one file and the query layer is driver-agnostic, so the risk is limited to client
  construction; it is validated immediately after Neon is configured.
- **A local Postgres in Docker is a development dependency** → CI and any other
  environment run the same container through `docker-compose.yml`, and the connection
  string is the only difference.
- **Better Auth's cookie handling in Server Actions** → the `nextCookies()` plugin is
  enabled and placed last in the plugin array, which is the documented requirement.

## Migration Plan

There is no existing deployment to migrate. The rollout is: bring up the container,
run the migration command against an empty database, then start the app. Rollback is
dropping the database and re-running the migration command, which is safe because the
schema is defined entirely in code.

## Open Questions

- The dark theme's exact values can be tuned during the Epic 1 UI pass without changing
  the specs or the approach.
- The deployed domain and the Neon project are needed only for US-1.8 and the deploy
  step; they do not change the schema, the approach or the task breakdown.
