# Weight Tracker

An invite-only PWA where one recorder logs everyone's weight on a shared screen, each
member sees their own goal-relative trend, and the group sees consistency — never body
size.

The full product definition lives in [`docs/backlog/epics/`](docs/backlog/epics/README.md),
and the working instructions for any agent live in [`AGENTS.md`](AGENTS.md).

> **The application is in Spanish only.** Every user-facing string — UI, errors, emails,
> reminders, legal pages — is Spanish. Code identifiers, comments and docs are English.

---

## Stack

| Concern   | Choice                                                                                  |
| --------- | --------------------------------------------------------------------------------------- |
| Framework | Next.js 16.4.5 (App Router, Turbopack), React 19.3.1, TypeScript                        |
| Styling   | Tailwind v4 with CSS-variable tokens in `src/app/globals.css` — no `tailwind.config.js` |
| Auth      | Better Auth 1.7.18 with the Google social provider                                      |
| Data      | Drizzle ORM 0.45.4 over `postgres-js`; PostgreSQL 17 in Docker                          |
| Tests     | Vitest 5.1 — unit tests plus integration tests against a real PostgreSQL                |

---

## Setup

### 1. Environment file

```bash
cp env.example .env.local
```

Fill in the values. `DATABASE_URL` points at the local container; the Google values come
from a Google Cloud OAuth client whose authorised redirect URI is
`http://localhost:3000/api/auth/callback/google`.

Generate the auth secret with:

```bash
openssl rand -base64 32
```

> The template is named `env.example` rather than `.env.example` because the workspace
> permission rules block writes to `.env*` paths.

### 2. Database

```bash
docker compose up -d
```

This starts PostgreSQL on port **5435** (5432 was already taken on this machine) and
creates both `weight_tracker` and `weight_tracker_test`.

### 3. Schema

```bash
npm run db:migrate
```

The schema is defined in code in `src/db/schema.ts`; the generated SQL lives in
`drizzle/`. Running the command a second time is a no-op.

### 4. Run

```bash
npm run dev
```

The app is at `http://localhost:3000`.

---

## Commands

| Command               | What it does                                                                    |
| --------------------- | ------------------------------------------------------------------------------- |
| `npm run dev`         | Development server                                                              |
| `npm run build`       | Production build                                                                |
| `npm run lint`        | ESLint                                                                          |
| `npm run typecheck`   | `tsc --noEmit`                                                                  |
| `npm test`            | Unit + integration suite (needs the database running)                           |
| `npm run check:ui`    | 360 px overflow, accessible names and focus visibility — needs a running server |
| `npm run db:generate` | Generate a migration from the schema                                            |
| `npm run db:migrate`  | Apply migrations                                                                |
| `npm run db:studio`   | Drizzle Studio                                                                  |

`npm run check:ui` reads `BASE_URL`, `DATABASE_URL` and `BETTER_AUTH_SECRET` from the
environment; it defaults to `http://localhost:3000`.

---

## Database driver

Development and tests run on `postgres-js` against the local container. Production will
use Neon. The swap is isolated in **`src/db/client.ts`** — the query layer and the table
definitions are identical across drivers, so no query changes when it happens.

---

## Guardrails

Ten product guardrails govern every epic; they are acceptance criteria, not aspirations.
They live in [`docs/backlog/epics/README.md`](docs/backlog/epics/README.md#guardrails-apply-to-every-epic).
The highest-risk one is **G10**: visibility filtering is enforced server-side on every
read, and it ships with an integration test matrix before anything behind it.
