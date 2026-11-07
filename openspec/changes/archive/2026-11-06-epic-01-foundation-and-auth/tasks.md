# Tasks

## 1. Project scaffold

- [x] 1.1 Create the Next.js 16.4.5 project with TypeScript, App Router, Turbopack, Tailwind v4 and the `src/` directory, and verify `npm run dev` starts and `npm run build` succeeds
- [x] 1.2 Configure ESLint and Prettier with scripts `lint`, `format` and `typecheck`, and verify `npm run lint` and `npm run typecheck` both exit zero on the empty project
- [x] 1.3 Initialise shadcn/ui with CSS-variable tokens in `globals.css` and no `tailwind.config.js`, and verify a shadcn button renders with the project's token names

## 2. Database and schema (US-1.7)

- [x] 2.1 Add the Docker Compose service running `postgres:17-alpine` on port 5432 with a `weight_tracker` database, and verify `docker compose up -d` reaches a healthy state and `psql` connects
- [x] 2.2 Install Drizzle ORM, `drizzle-kit` and the `postgres` driver, and add `db:generate`, `db:migrate` and `db:studio` scripts, and verify `npm run db:generate` produces a migration
- [x] 2.3 Generate the Better Auth schema for `user`, `session`, `account` and `verification` with the provider set to `pg`, and verify the generated columns match Better Auth's expectations
- [x] 2.4 Hand-write the `profiles` table with a nullable `user_id` referencing `user`, a unique index on non-null `user_id`, `display_name`, `unit` defaulting to `kg`, a nullable `avatar_emoji`, `is_dependent` defaulting to false, and created/updated timestamps
- [x] 2.5 Create `src/db/client.ts` as the single place the driver is constructed and `src/db/schema.ts` as the single place the tables are declared, and verify no other module constructs a database client
- [x] 2.6 Add a test database and a Vitest global setup that runs the migration command against it, and verify the migration command creates every expected table, column, index and foreign key on an empty database
- [x] 2.7 Verify the migration command is a no-op on an up-to-date database by running it twice and asserting the second run applies no changes

## 3. Environment and configuration

- [x] 3.1 Add `src/constants/environment-variables.ts` validating `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with zod, and verify a missing variable throws an error naming that variable in Spanish
- [x] 3.2 Document the full environment contract, including the Epic 7 variables, in `env.example`, and verify every name matches the validation schema or is marked as future

## 4. Authentication (US-1.1, US-1.2, US-1.3)

- [x] 4.1 Configure Better Auth with `drizzleAdapter(db, { provider: "pg" })`, the Google social provider and the `nextCookies` plugin last, and verify the auth handler answers a request
- [x] 4.2 Mount the catch-all handler at `app/api/auth/[...all]/route.ts` with `toNextJsHandler(auth)`, and verify the sign-in and callback routes respond
- [x] 4.3 Build the Spanish sign-in screen with a "Continuar con Google" action that starts the OAuth flow, and verify the button is not rendered for an already-authenticated member
- [x] 4.4 Add a server action or route that signs out by destroying the server session, and verify the session cookie no longer resolves to a session after signing out
- [x] 4.5 Add integration tests that create a session directly against the test database and assert `auth.api.getSession` resolves it, that a second device does not resolve it, and that an expired or unknown token does not resolve it

## 5. Route protection and onboarding routing (US-1.4, US-1.2)

- [x] 5.1 Add `src/auth/session.ts` exposing the server-side session read, and verify it reads the session from the request headers
- [x] 5.2 Add `proxy.ts` that redirects a request without a session cookie away from protected routes and leaves public routes alone, and verify a request to a protected route without a cookie is redirected to the sign-in screen
- [x] 5.3 Add the authoritative server-side check to the protected layout, redirecting to sign-in when the session is missing or expired, and verify the protected page renders no member content in that case
- [x] 5.4 Add the redirect that sends a first-time signer to onboarding and a returning signer to the app home, keyed on whether the signed-in user owns a profile, and verify both cases with integration tests

## 6. App shell and visual direction (US-1.5, US-1.8)

- [x] 6.1 Express the pinned peach direction as CSS custom properties in `globals.css` — peach canvas, white large-radius cards, one saturated orange accent, near-black ink — with a Tailwind v4 `@theme inline` mapping and no `tailwind.config.js`, and verify the tokens resolve in a rendered page
- [x] 6.2 Build the root layout with header and content area, and the authenticated and public areas inside it, and verify navigation between them keeps the shell in place
- [x] 6.3 Implement the light and dark themes with the dark theme derived from the same warm world, and verify text remains legible in both
- [x] 6.4 Add `app/manifest.ts` declaring `display: "standalone"`, the name, the short name, the theme colour and 192 and 512 icons, and verify the manifest is served with those values
- [x] 6.5 Build the onboarding screen in Spanish — profile display name and unit — that creates the profile and moves the member to the app home, and verify the profile row is created and the redirect happens
- [x] 6.6 Make the onboarding screen resumable: verify a member who left it halfway returns to it and does not start over

## 7. Responsive and keyboard verification (US-1.5, US-1.6)

- [x] 7.1 Verify at a 360 pixel viewport that no screen scrolls horizontally, with a check that measures `scrollWidth` against `clientWidth` on each route
- [x] 7.2 Verify every interactive element has an accessible name, with a check that walks the rendered routes and reports any control without one
- [x] 7.3 Verify the sign-in flow is completable with the keyboard alone, including that focus is visible and never trapped
- [x] 7.4 Verify the primary action sits within thumb reach of the bottom of the viewport on a phone-sized screen

## 8. Guardrail and copy review (G3)

- [x] 8.1 Review every user-facing string added by this change for goal-relative, non-moralised wording, and verify no string contains "ganado", "perdido", "bien", "mal" or a red/green verdict
- [x] 8.2 Verify the accent colour is used only for data and selection, and that no second accent colour or red/green verdict appears in the rendered shell

## 9. Integration checks and documentation

- [x] 9.1 Run the full unit and integration suites against the test database and verify both pass
- [x] 9.2 Run `npm run lint` and `npm run typecheck` and verify both pass with no errors
- [x] 9.3 Verify the application boots against a database migrated from empty and that the sign-in screen renders in both themes
- [x] 9.4 Document the setup steps — starting the container, running the migration, starting the app, and registering the Google callback URL — in the repository README, and verify each command runs as written

## Workflow follow-up

- Register `https://<domain>/api/auth/callback/google` with Google and configure the deployed domain's OAuth client, then verify the round trip completes on the deployed domain (US-1.8).
- Configure Neon, swap `src/db/client.ts` to the Neon driver, and verify the same migration command builds the same schema there.
- Archive the change after the epic's acceptance list in `docs/backlog/epics/epic-01-foundation-and-auth/epic.md` is ticked.
