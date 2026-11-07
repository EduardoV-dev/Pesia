# Proposal

## Why

A member whose profile was created before the `profile_managers` table existed could
never open the app: `/home` found no active profile and sent them to `/onboarding`, and
`/onboarding` found their profile and sent them back to `/home`. The browser gave up with
`ERR_TOO_MANY_REDIRECTS` after a handful of hops.

The defect is not only the missing data. Epic 2 read "a profile I manage" from the
management link alone, so a profile linked to a login was unreachable to that login
whenever the link was missing — and the two pages disagreed about where the member
belongs, which is what closed the loop.

## What Changes

- A profile linked to a login stays reachable for that login, even when it carries no
  explicit management link. The active profile resolves to it as a fallback, and the
  member lands on the app home instead of bouncing between the onboarding and the home.
- The `profiles` capability states the guarantee, so the loop cannot come back silently.
- A migration backfills the management link for every profile that has a login but no
  link, repairing the rows Epic 1 left behind.
- The README records that the Google OAuth client needs a Google Cloud project whose
  OAuth app branding is this app's name, because Google takes the name shown on the
  sign-in screen from the project and not from the client.

Guardrails touched: **G10** (every profile read is still filtered server-side; the gate
itself is unchanged and the fallback only ever returns the caller's own linked profile,
which the caller may see by definition). No other guardrail is reachable in this change:
there are no entries, groups, board or reminders.

User stories covered: none — this is a defect in the Epic 2 delivery. It repairs
**US-2.1** (a signed-in user can own a profile and reach the app with it) and **US-2.8**
(the active profile is always resolvable).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profiles`: a profile linked to a login must stay reachable for that login, and a
  signed-in member must be routed to exactly one of the onboarding and the app home.

## Impact

- **Database**: a new migration that backfills `profile_managers` for the profiles that
  have a login and no management link.
- **Server modules**: `src/features/profiles/server/active-profile.ts` gains the
  resolved active profile with the owner fallback; `getSelfProfile` is memoised per
  request like `getManagedProfiles`.
- **Routes**: the app home and the app layout resolve the active profile through the
  same function, so they can no longer disagree.
- **Tests**: the fallback is covered by a unit test and by an integration test over the
  exact shape Epic 1 left behind.
- **Docs**: the README explains the Google Cloud project requirement for the OAuth
  client.
