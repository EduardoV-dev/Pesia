# Proposal

## Why

Epic 1 gave the application a login, a session and a data layer, but a login is not a
person. The real family this app is for weighs everyone together: a kid with no phone,
a grandmother who will never use Google, and a shared laptop that several people log
in from. Epic 1's `profiles` table can hold exactly one profile per login, so today
those people cannot exist at all, and nobody can own a goal.

This change makes a profile an independent identity. A login may own one profile of
its own and manage any number of profiles for other people. Every profile carries its
own unit and its own goal, and the goal's direction is derived from the target the
person chose — never assumed. Without this, Epic 3 has no membership to attach, Epic 4
has no subject to attribute an entry to, and Epic 5 has no goal to be relative to.

## What Changes

- The `profiles` table loses its one-profile-per-login uniqueness and gains a
  `profile_managers` link table that records who may manage each profile. A managed
  profile keeps `user_id` NULL — it has no login and can never be signed into — while
  the manager row is what makes it reachable from the device of the person who
  manages it.
- A new `goals` table holds one active goal per profile: a direction, a target weight
  in kilograms, an optional maintain band, the baseline the goal started from, and the
  moment it was set. Superseded goals are kept as history.
- Goal direction is **derived**, never assumed: a target below the current weight
  means "lose", above means "gain", and "maintain" is chosen explicitly and expressed
  as a band around a target. Changing a target supersedes the goal, resets the
  baseline to the current weight and restarts progress at 0%.
- Weights are stored canonically in kilograms. A profile's display unit (kg or lb)
  changes what the app shows and what it accepts, and never rewrites history.
- An active profile can be switched server-side and is remembered in a cookie. The
  cookie is a hint, never authority: every read re-validates that the signed-in user
  manages the profile it names.
- A dependent profile is trend-only. The server refuses to create a goal for it, and
  it offers no target, no progress percentage and no BMI.
- New screens: a profile switcher in the app header, a profile editor (display name,
  avatar, unit), a goal form, and a form to create a managed or dependent profile.
- Every profile read goes through a function that checks management server-side. No
  route returns a profile the reader does not manage.
- Every user-facing string added here is in Spanish.

Guardrails touched: **G5** ("maintain" and "gain" are first-class goals and no copy
pushes weight loss), **G6** (direction derives from the person's own target), **G9**
(dependents are trend-only — no target, no progress, no BMI) and **G10** (every
profile read is filtered server-side; the client never receives a profile it may not
see). G1, G2, G3, G4, G7 and G8 are not reachable in this epic: there are no entries,
no board, no rankings and no reminders yet.

User stories covered: **US-2.1** through **US-2.10**.

## Capabilities

### New Capabilities

- `profiles`: The profile as an identity independent of a login — owning a profile,
  managing a profile for someone else, dependent (trend-only) profiles, display name,
  avatar and unit, profile switching, and the server-side rule that a profile is only
  ever exposed to the people who manage it.
- `goals`: A profile's goal — the derived direction, the target weight, the maintain
  band, the baseline and the reset-on-change rule, plus the progress calculation that
  stays inside 0–100% and never moralises.

### Modified Capabilities

None. `auth` and `app-shell` keep their current requirements.

## Impact

- **Database**: a new migration adding `goals` and `profile_managers`, and replacing
  the `profiles_user_id_unique` index with a partial unique index that still allows
  only one self-owned profile per login.
- **Server modules**: new profile and goal modules under `src/features/`, a
  replacement for `getProfileByUserId`, and an active-profile resolver that validates
  against the caller's managed profiles.
- **Client modules**: a profile switcher, a profile editor form, a goal form and a
  new-profile form, all as client components inside the feature folders that own them.
- **App shell**: the header gains the switcher; the home screen names the active
  profile and links to its goal and to profile management.
- **No new dependencies.** Unit conversion, direction derivation and progress use
  plain arithmetic; forms use the server actions and Zod validation already in place.
