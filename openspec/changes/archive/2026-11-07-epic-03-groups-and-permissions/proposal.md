# Proposal

## Why

Epic 2 made a profile an identity that exists without a login. Nothing yet decides
who belongs with whom. Today the app has one screen, one profile, and a card that
says the family has no group — the product's central noun does not exist.

Epic 3 is where the consent model becomes real. A group is a closed circle that only
an invitation can open; inside it, roles decide who may record and who may decide;
each member decides what the group sees of them. The single rule that makes the rest
of the product safe is that **writing is not reading**: the recorder who weighs
everyone must not inherit a year of everyone's history.

The app earns the right to show a number only after this model exists. Epic 4 needs a
group, a subject and a permission check to attribute an entry to. Epic 6 renders
exactly what this permission model allows. Epic 7 reads the cadence and the weigh-in
day stored here.

## What Changes

- A new `groups` table holds a closed group with a name, a timezone and the user who
  created it. A group has no public URL, no listing and no search: it is reachable
  only through an invitation.
- A new `group_memberships` table binds a profile to a group with a role, a
  visibility level, a ranking opt-out and a personal weigh-in cadence. The unique
  pair `(group_id, profile_id)` means a member who leaves and comes back reuses the
  same row, closed by `left_at`.
- Roles are **presets over one permission table**, never a parallel system. A new
  `can_log_for` table is the only record of "who may record whose weight", and the
  role is the set of rows the app pre-seeds when the role is applied. A row records
  whether it was seeded by the role preset or granted by the member, so a role
  change never silently drops a consent the member gave.
- A new `group_settings` table stores the group's weigh-in weekday, the optional
  weigh-in time and the reminders switch that Epic 7 will read.
- A new `invites` table stores link and code invitations. A link is long and
  rotatable; a code is six unambiguous characters that expire. Both are revocable
  and stop working the moment they are revoked.
- **Two separate checks, with no code path that treats one as the other.**
  `canLogFor` decides writes and reads only the `can_log_for` table. Visibility
  decides reads and lives on the membership. Neither function calls the other.
- Visibility is per member, per group, with four levels: weight and trend, latest
  weight only, name only, and private. A private member renders as "Privado" — the
  app never states or implies a reason for their absence.
- Ranking opt-out is independent of visibility: a member may be fully visible and
  still choose not to be ranked.
- Leaving or being removed closes the membership and **keeps the person's past
  entries in the group's history**. Other people weighed them and saw those
  numbers; erasing them would rewrite other people's history. Deletion is Epic 8's
  job, and it is a separate, explicit action.
- A group always has at least one Owner: an Owner cannot leave or be removed before
  transferring ownership.
- When the last Logger leaves, the group says plainly that no recorder is assigned
  and prompts the Owner to appoint one, instead of failing silently.
- New screens: the group list with creation and code entry, the group page with
  members, invitations, settings and the member's own permissions, and the
  invitation landing page.
- Every user-facing string added here is in Spanish.

Guardrails touched: **G3** (direction and permission language is never moralised),
**G8** (hidden members render as "Privado" and no reason for absence is ever
inferred), **G9** (a dependent profile is trend-only — it never receives a target, a
progress percentage or a ranking), **G10** (visibility filtering is enforced
server-side on every read; there is no route that returns raw membership plus raw
entries) and **G1** (ranking opt-out exists so ranking can be behaviour-based in
Epic 6). G2, G4, G5 and G7 are not reachable here: there are no entries, no board,
no BMI and no reminders yet.

User stories covered: **US-3.1** through **US-3.17**.

## Capabilities

### New Capabilities

- `groups`: The closed group — creation, invitation-only joining, link and code
  invitations, revocation, membership lifecycle, roles, the group's weigh-in
  settings, and the rule that a group always keeps an Owner.
- `permissions`: Who may record whose weight (`can_log_for`), who may see what
  (the four visibility levels), the ranking opt-out, the personal weigh-in cadence,
  and the hard separation between the write check and the read check.

### Modified Capabilities

None. `auth`, `app-shell`, `profiles` and `goals` keep their current requirements.

## Impact

- **Database**: a new migration adding `groups`, `group_memberships`, `can_log_for`,
  `group_settings` and `invites`. The changes are additive; no existing row is
  rewritten.
- **Server modules**: new group and permission modules under `src/features/groups/`
  and `src/features/permissions/`, plus the two checks — `canLogFor` for writes and
  the visibility resolver for reads.
- **Client modules**: a group list, a group page, an invitation landing page and the
  forms that create groups, join them, manage members, publish invitations and set
  the member's own permissions.
- **App shell**: the home screen stops saying the family has no group and points at
  the real group list.
- **No new dependencies.** Invitation tokens use `node:crypto`, the code alphabet is
  a constant, and forms use the server actions and Zod validation already in place.
