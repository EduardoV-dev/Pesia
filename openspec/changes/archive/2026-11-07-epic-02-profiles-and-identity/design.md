# Design

## Context

Epic 1 shipped the login, the session, the `profiles` table and the app shell. The
`profiles` table as it stands has three properties that block this epic: `user_id`
carries a unique index (one profile per login), there is no link table recording who
may manage a profile that has no login, and there is no table for goals.

The `user` table belongs to Better Auth and is not ours to reshape, so "who manages
this profile" cannot live there. Entries — the thing a profile is measured by — do
not exist until Epic 4, so the baseline of a goal has no entry to read yet.

## Goals / Non-Goals

**Goals:**

- Make a profile an identity that exists independently of a login.
- Keep every profile read filtered on the server, with one function that assembles it.
- Derive the goal direction from the person's own target and never assume it.
- Keep weights canonical in kilograms while each profile displays in its own unit.

**Non-Goals:**

- Groups, roles, visibility and ranking — Epic 3. This epic stores *who may manage a
  profile* because a managed profile without an owner is unreachable; it does not
  model membership, and it does not decide who may log for whom.
- Entries, and the record of who typed a weigh-in — Epic 4.
- BMI, height and any body metric — Epic 5.
- Progress charts and trend engines — Epic 5. This epic ships the goal and the
  calculation the trend will read.

## Decisions

### Permission model (before the data model)

There are two distinct relationships in this epic and they must not be collapsed.

| Relationship | Meaning | Checked by |
|---|---|---|
| **Manages** | This login may read and edit this profile, and set its goal | `canManageProfile(userId, profileId)` |
| **Owns a login** | This profile is the account of a person who signed in | `profiles.userId` column |

`profiles.userId` answers "does this profile have a login of its own". It is **not**
the authorisation check: a managed profile has `userId` NULL yet is fully editable by
the person who manages it. Authorisation lives in `profile_managers`.

Reads and writes in this epic share one gate — `canManageProfile`. A separate
write-only permission (`can_log_for`) does not exist yet and is Epic 3's job; when it
arrives it will be a different check, not a reuse of this one.

**The server-side function that assembles every filtered read is
`getManagedProfiles(userId)`** (`src/features/profiles/server/get-managed-profiles.ts`).
It is the only function in the codebase that returns more than one profile, and it
joins `profiles` against `profile_managers` on the caller's id. Every other read goes
through `getProfileForManager(userId, profileId)`, which calls the same check and
returns `null` when the caller may not see the profile. There is no function that
returns a profile without one of those two gates, so no route can leak a profile.

The active profile is a **hint, never authority**. `resolveActiveProfile(userId)`
reads the cookie, then re-checks the profile against `getManagedProfiles`. A cookie
naming a profile the user does not manage is discarded and the user's own profile is
used instead.

### Decision 1 — A link table instead of a manager column on `profiles`

*Chosen:* `profile_managers(profile_id, user_id)` with a composite primary key.

*Rejected:* putting the manager on `profiles.user_id`. It cannot express "Nina manages
grandma's profile" while `user_id` stays NULL for profiles without a login, which the
backlog's own table requires.

*Rejected:* a boolean "managed" flag. It says that a profile is managed but not by
whom, so the profile would still be unreachable.

*Rejected:* a `manager_id` column on `profiles`. It allows exactly one manager. The
backlog speaks of "the people who manage a profile", and a second guardian is a
normal case; the table costs nothing extra to allow it.

The table also keeps the invariant simple: a profile with no login is reachable
exactly through its manager rows, so "profiles I manage" is one join for both the
self-owned and the managed case.

### Decision 2 — One self-owned profile per login, enforced by a partial unique index

*Chosen:* drop `profiles_user_id_unique` and add
`uniqueIndex(...).on(profiles.userId).where(profiles.userId IS NOT NULL)`.

A login may own one profile of its own — that is what "the profile that is my account"
means — but it may manage any number of profiles for other people. A plain unique
index on `user_id` forbids both owned and managed profiles for the same login, and
would also have to be relaxed for NULLs. The partial index keeps the real invariant
while allowing many NULL rows, which is what managed and dependent profiles have.

### Decision 3 — The goal table stores a band around a target, not a null target

*Chosen:* `goals.target_weight_kg` is NOT NULL; `goals.band_kg` is nullable and set
only for the maintain direction.

The backlog's SQL sketch annotates `target_weight_kg` as "null when direction =
'maintain'", but the prose in the same document says maintain is "expressed as a band
around a target" and US-2.4 says "I set a target and a band width". A null target
leaves a maintain goal with no centre and no band to be inside of, so the prose wins
and the sketch's comment is corrected. `band_kg` carries the meaning the comment
attached to the target.

`baseline_weight_kg` is NOT NULL, matching the sketch. It is the weight at the moment
the goal was set.

### Decision 4 — The goal form asks for the current weight

*Chosen:* setting or changing a goal submits the current weight together with the
target. That weight is the baseline.

There are no entries until Epic 4, so there is nothing else to read a baseline from.
Asking for it is honest and it is exactly what the backlog means by "the weight at
the moment the goal was set". When Epic 4 lands, the form pre-fills the field from the
latest entry and the baseline can come from that entry instead; nothing in the data
model changes, because the baseline is a number either way.

*Rejected:* a nullable baseline filled in later by a backfill job. It would leave
goals without a baseline for an unknown window and would make progress undefined in
the meantime.

### Decision 5 — Direction is derived once, at goal creation, and stored

*Chosen:* `deriveGoalDirection(currentWeightKg, targetWeightKg)` returns `lose`,
`gain` or `maintain`, and the result is written to `goals.direction`.

The comparison happens against the baseline at the moment the goal was set. Storing
the derived direction keeps it stable while the person weighs: a goal to lose stays a
goal to lose even after the first kilo comes off. A target change creates a new goal
and derives the direction again.

`maintain` is never derived from a comparison — it is chosen explicitly, because a
target equal to the current weight is a coincidence, not an intention.

### Decision 6 — The active profile lives in a cookie

*Chosen:* an HTTP-only cookie named `weight-tracker.active_profile` holding the
profile id, written by a server action when the user switches.

*Rejected:* a column on `user`. It would create a circular foreign key between `user`
and `profiles` and would put a Better Auth-owned table under our migration burden for
a value that is device-local.

*Rejected:* `localStorage`. The active profile decides which profile subsequent
entries are attributed to; a value the browser can edit must never be authority.
The cookie is a hint that the server re-validates on every use, exactly like the
session cookie, and it is HTTP-only so no script reads it.

### Decision 7 — Units are a presentation concern over canonical kilograms

*Chosen:* `weightKgToDisplay(kg, unit)` and `displayToWeightKg(value, unit)` are pure
functions. Every weight is stored in kilograms; the profile's `unit` decides what is
shown and what is accepted.

The direction comparison happens in kilograms on both sides, so a member who thinks in
pounds gets the same derived direction as one who thinks in kilograms.

### Decision 8 — Progress is a pure function with a clamp

*Chosen:* `calculateGoalProgress(goal, currentWeightKg)` returns a percentage
clamped to 0–100, plus the goal-relative wording key.

For `lose` and `gain` the progress is the share of the distance from baseline to
target that has been covered. For `maintain` the progress is 100% inside the band and
falls off outside it, never below 0.

*Rejected:* letting progress go negative to signal "worse". A negative percentage is
a verdict attached to a number, which is exactly what guardrail G3 forbids.

The wording keys are `toward_goal`, `away_from_goal` and `stable`. They are rendered
in Spanish at the call site.

## Risks / Trade-offs

- **[The management link table can drift from reality]** → Every write that creates a
  profile creates its manager row in the same transaction, and a profile with no
  manager row is unreachable by design. A test asserts that a profile created
  without a manager row is not returned by `getManagedProfiles`.

- **[A user could accumulate profiles for other people]** → Epic 8 owns deletion.
  Until then the switcher lists every managed profile with an unambiguous label, so a
  shared laptop stays legible.

- **[The goal form asks for a weight that is not an entry]** → The value is stored as
  the baseline, not as an entry, so no entry is fabricated and no attribution is
  invented. Epic 4 introduces entries with their own attribution.

- **[Changing the unit does not convert stored weights]** → Intentional. Kilograms
  are canonical, so history never changes; only its presentation does.

- **[A partially unique index is less obvious than a plain one]** → The partial
  predicate is written in the schema next to the table it belongs to and covered by an
  integration test that creates two managed profiles and one self profile for the
  same login.

## Migration Plan

1. `drizzle-kit generate` produces a migration that creates `goals` and
   `profile_managers` and swaps the profiles index.
2. `drizzle-kit migrate` applies it. The new tables are additive and the dropped
   unique index only relaxes a constraint, so no data is rewritten and no row is lost.
3. Rollback is the reverse migration: drop `goals` and `profile_managers` and restore
   `profiles_user_id_unique`. Only safe while no user has more than one profile, which
   is the case on the day this ships.
