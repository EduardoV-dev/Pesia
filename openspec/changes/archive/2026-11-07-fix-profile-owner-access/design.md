# Design

## Context

Epic 2 introduced two relationships: a profile can be linked to a login
(`profiles.user_id`) and a login can manage a profile (`profile_managers`). The gate
that decides who may read a profile uses the management link alone, which is the right
default for a profile that belongs to somebody else.

Profiles created by Epic 1's onboarding were linked to a login but never got a
management link, because the table did not exist yet. The result was a member whose
profile existed but was invisible to the gate, and two routes that disagreed about
where that member belongs.

## Goals / Non-Goals

**Goals:**

- A linked profile is always reachable for its owner.
- The app home and the onboarding can never send a member back and forth.

**Non-Goals:**

- Changing who may read a profile that belongs to somebody else. The gate stays exactly
  as it is.
- Deciding what happens when a member owns no profile but manages other people's
  profiles. That stays with Epic 3.

## Decisions

### Decision 1 — The owner fallback lives in the active profile resolution, not in the gate

*Chosen:* `resolveActiveProfile` falls back to the caller's own linked profile when the
managed list yields no active one.

*Rejected:* widening `getProfileForManager` to also accept `profiles.user_id`. It would
work, but it changes the function that guardrail G10 rests on, and the defect did not
need it. The gate keeps a single rule: the management link.

*Rejected:* a union inside `getManagedProfiles`. It would make the management link
optional in the one query every profile read depends on, for a case a migration
repairs once.

The fallback is safe because `profiles.user_id` is the account itself: the profile is
the caller's own by definition, so no rule about other people's data is relaxed.

### Decision 2 — One function decides the active profile

*Chosen:* the app home and the app layout both call `resolveActiveProfile`.

The loop existed because the home page asked "is there an active profile?" while the
onboarding page asked "is there an own profile?" — two questions whose answers could
disagree. With the owner fallback, the own profile always produces an active profile,
so "no active profile" now implies "no own profile" and the two answers can never
contradict each other.

### Decision 3 — The backfill is a migration

*Chosen:* `drizzle/0002_backfill_profile_owners.sql`, generated with
`drizzle-kit generate --custom`.

The rows are data, not schema, but the repair has to run exactly once, in order, on
every environment — including a fresh database — which is what a migration guarantees.
The statement is idempotent, so running it against a database that never had the old
rows is a no-op.

## Risks / Trade-offs

- **[The fallback masks a broken invariant]** → The migration repairs the rows and the
  integration test covers the exact shape Epic 1 left behind, so the shape stays a
  known, tested case instead of an accident.

- **[The management link and the owner fallback can disagree]** → A member whose own
  profile has no management link sees it as the active profile, but the profile editor
  still refuses it, because the editor goes through the management gate. The migration
  removes the case; the fallback only keeps the member out of a redirect loop in the
  meantime.

- **[A second Google Cloud project is more console work]** → Nothing in the code can
  change the name Google displays; the README now states the requirement so the next
  setup does not repeat it.
