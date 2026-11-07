# Design

## Context

Epic 1 shipped the login and the session. Epic 2 shipped profiles that exist
independently of a login, the goal that a profile carries, and the active profile
that every write is attributed to. Nothing yet groups people together, so nothing
yet answers the two questions this product is actually about: *who may record my
weight* and *who may see it*.

Those two questions are not the same question, and the whole epic turns on keeping
them apart. The family's recorder physically handles the scale and types everyone's
weight. That role must not hand them a dossier on every relative. This design makes
the separation structural: two different tables, two different check functions, and
no code path that lets one stand in for the other.

## Goals / Non-Goals

**Goals:**

- Make a group a closed circle that only an invitation can open.
- Express "who may record whose weight" in exactly one table, with roles as
  pre-seeded presets over it.
- Express "who may see what" per member, per group, in four levels, enforced on the
  server.
- Keep the write check and the read check in different files with no shared path.
- Let a member leave or be removed without rewriting the group's history.
- Keep at least one Owner in every group.

**Non-Goals:**

- Entries and their attribution — Epic 4. This epic stores the permission the entry
  will be checked against; it stores no weight.
- The board, the ranking and the awards — Epic 6. This epic stores the opt-out that
  the ranking will honour.
- Reminder delivery — Epic 7. This epic stores the cadence and the weigh-in day it
  will read.
- BMI, height and body metrics — Epic 5.
- Public groups, group discovery, group search — out of scope for v1 by decision.

## The permission model, before the data model

There are three distinct relationships in this epic and they must not be collapsed
into one.

| Relationship | Meaning | Checked by | Table |
|---|---|---|---|
| **Logs for** | This profile may record a weight for another profile in this group | `canLogFor` | `can_log_for` |
| **Reads** | This profile may see what another profile shares in this group | `resolveVisibleMembers` | `group_memberships.visibility` |
| **Manages** | This profile may change roles, publish invitations, set the group's settings, remove members or delete the group | `getOwnerMembership` | `group_memberships.role` |

Two of the three are about the same subject — the weigh-in — and they are stored
apart on purpose.

**Writing is governed by `can_log_for` and nothing else.** The check is one table
read plus the membership invariant. It never looks at `visibility`, and it never
returns "yes" because the reader can see the subject's trend.

**Reading is governed by `visibility` and nothing else.** The resolver returns, for
every member of the group, the level of that member's data the viewer may see. It
never looks at `can_log_for`, and it never widens a level because the viewer may
record that member's weight.

**Managing is governed by the role.** It is a group-management capability, not a
weigh-in capability, and it is the one relationship the role column owns outright.

### Why roles are presets, not a parallel system

The backlog is explicit: "There is exactly one mechanism for 'who may log for
whom': `can_log_for`. Roles are not a parallel permission system — they are the set
of rows the app pre-seeds."

So the role lives on the membership as the *preset definition*, and the permission
itself lives as rows in `can_log_for`:

| Role | May log for | May manage |
|---|---|---|
| Owner | every profile in the group | roles, invitations, settings, member removal, group deletion |
| Logger | every profile in the group | nothing |
| Member | themselves only | nothing |

Applying a role seeds rows; removing a role withdraws the rows it seeded.

### Decision 1 — `can_log_for` rows record where they came from

*Chosen:* `can_log_for.source` is `"role"` or `"explicit"`.

A row seeded by the role preset and a row granted by a member produce the same
permission, so they used to look identical. But they have different lifetimes: a
role row exists only while the role exists, while an explicit grant is a standing
consent from the member and must survive a promotion and a demotion of the person
who received it.

Without the source column the two cannot be told apart, and the rebuild that keeps
the role matrix in sync has to choose between two failures — keeping a stale role
row (a Logger who was demoted keeps recording everyone) or dropping a consent the
member gave (a member's explicit permission disappears when their role changes).
Both are unacceptable in a consent product, so the column exists. It is one column
and it makes the invariant checkable: **a `"role"` row exists if and only if the
role says it should.**

The rebuild therefore never guesses. It deletes only the `"role"` rows and re-inserts
the current matrix; `"explicit"` rows are never touched by it. When an explicit grant
arrives for a pair that already has a role row, the explicit row replaces the role
row so the member's intent survives the next demotion.

### Decision 2 — the role matrix is rebuilt, never patched

*Chosen:* `rebuildRolePermissions(groupId)` deletes every `"role"` row in the group
and re-inserts the matrix implied by the current active memberships:

- every active member gets a self row `(member, member)`;
- every active Logger and Owner gets a row for every active member.

It runs inside the same transaction as every membership write — join, leave, remove,
role change — so the matrix can never drift from the roles.

*Rejected:* incrementing rows on join and decrementing on leave. A single missed
decrement leaves a departed member's permission alive, and there is no way to prove
the matrix is correct without a full comparison.

*Rejected:* evaluating the role at check time and keeping `can_log_for` for explicit
grants only. It is simpler, but it makes the role a parallel permission system,
which is exactly what the backlog forbids, and it leaves the role and the grant in
two places that can disagree.

### Decision 3 — the check is one table read

*Chosen:* `canLogFor({ groupId, subjectProfileId, loggerProfileId })` reads the
`can_log_for` table and nothing else.

Both the logger and the subject must be active members of the group. That invariant
is maintained by the rebuild: leaving or being removed deletes the member's rows in
the same transaction that closes the membership. The check does not re-derive the
matrix, and it does not consult the role column.

A consequence worth stating plainly: **a Logger can record a member's weight whose
visibility is `private`, and cannot read that member's history.** The two are
different tables and neither check calls the other.

### Decision 4 — visibility is four levels on the membership

*Chosen:* `group_memberships.visibility` is one of `weight_trend`, `latest_only`,
`name_only`, `private`, defaulting to `weight_trend`.

| Level | The group sees |
|---|---|
| `weight_trend` | the latest weight and the trend |
| `latest_only` | the latest weight only, no trend |
| `name_only` | the name on the sheet, no numbers |
| `private` | nothing — the member renders as "Privado" |

A member always sees their own data in full, whatever they set for others.

### Decision 5 — the visibility resolver is the G10 gate

*Chosen:* `resolveVisibleMembers({ groupId, viewerProfileId })` is the only function
that assembles what a viewer may see of a group's members. It returns, per member,
the effective level, whether the name is shown, and whether the weight and the trend
are shown.

The resolver applies the viewer's own rules to every other member and never widens a
level because the viewer may record that member's weight. Epic 4 will read entries
through this same resolver, so the filter lives in one place.

For a `private` member the resolver also hides the ranking opt-out flag: showing
"excluded from the ranking" next to "Privado" would leak something about a member
who chose to share nothing.

### Decision 6 — a group is deleted, not archived

*Chosen:* deleting a group is a hard delete. The cascades remove the memberships,
the permissions, the invitations, the settings and — once Epic 4 lands — the
entries.

The backlog's SQL sketch carries a `groups.deleted_at` column, but the same backlog's
acceptance criterion says deleting "removes the group, its memberships, its entries
and its settings" and "cannot be undone". A soft delete contradicts that, and a
soft-deleted group would need filtering on every read for the rest of the product's
life. The sketch's column is dropped and the acceptance criterion wins.

### Decision 7 — membership is bound to the active profile

*Chosen:* every group action acts on behalf of the **active profile**, the same
profile the switcher in the header selects.

A profile is the person in the group, not the login. Nina can hold the Owner role
with her own profile and keep her daughter's profile as a separate member, and a
guardian can bring a child with no phone into the group by acting as that child's
profile. The login never appears in the permission tables.

### Decision 8 — leaving and being removed keep the history

*Chosen:* closing a membership sets `left_at` and deletes that member's permission
rows. Their past entries stay.

Other people weighed them and saw those numbers. Erasing them would rewrite other
people's history, and it is not what "remove a member" means. The confirmation says
so in plain words. Epic 8 owns deletion, and it is a separate, explicit action.

### Decision 9 — a group always keeps an Owner

*Chosen:* an Owner cannot leave a group or be removed from it. The server refuses
with a message that says ownership must be transferred first, and the group page
offers the transfer next to the role control.

The alternative — letting the last Owner walk away — leaves a closed group with
nobody who can publish an invitation or delete it. The transfer is the only exit.

### Decision 10 — "no recorder assigned" is a visible state

*Chosen:* when no active membership holds the Logger role, the group page shows a
"no recorder assigned" state and the Owner is prompted to appoint one.

The rule is about the Logger role, not about who *can* record: an Owner also holds
log-for-everyone, so the group is never blocked. But the family needs a named
recorder, and a silent fallback is exactly the "silently fails" the backlog forbids.

### Decision 11 — invitations are rotatable, and codes expire

*Chosen:* an invitation is a row with a token. A link token is 32 random bytes in
base64url; a code token is six characters from an alphabet with no `0`, `O`, `1`,
`I` or `L`, so it can be read aloud. Revoking sets `revoked_at` and the invitation
stops working immediately; members who already joined keep their membership.

Code invitations also carry `expires_at` and stop working after 24 hours. The
backlog's risk table calls for links that are rotatable and codes that are
short-lived; a code is the one that gets read out loud in a room, so it is the one
that should die on its own.

### Decision 12 — the group has no public surface

*Chosen:* there is no route that lists groups, searches them or accepts a group
slug. A group's page is reachable only by a member, and a group's id is not a
secret — the point is that the *group* is closed by invitation, not that its id is
unguessable. Every read of a group's members is behind the membership check.

### Decision 13 — dependent profiles are trend-only in the group too

*Chosen:* a dependent profile may be a member of a group and may be recorded, but
the server refuses to give it a role above `member`, refuses to rank it, and the
group never renders a target, a progress percentage, a BMI or a ranking position for
it. The ranking opt-out is not even offered to a dependent: there is no ranking to
opt out of.

Guardrail G9 applies wherever a dependent appears, and the group page is where a
dependent is most visible.

### Decision 14 — the cadence is the reminder opt-in

*Chosen:* `group_settings.reminders_enabled` keeps the default from the backlog,
but nothing reads it in this epic. The per-member opt-in is the cadence: it is
`null` until the member asks for one, and only a member with a cadence is ever
asked.

Guardrail G7 says reminders are opt-in, so Epic 7 must never send a reminder to a
member without a cadence, whatever the group's switch says. The member's cadence is
also private: the group sheet shows it to nobody but the member who set it.

## Risks / Trade-offs

- **[The role matrix drifts from the roles]** → The rebuild runs in the same
  transaction as every membership write and is idempotent. A test asserts that the
  matrix matches the roles after a join, a promotion, a demotion and a departure.

- **[A grant survives a role change it should not]** → The `source` column makes
  the two lifetimes explicit. A test asserts that an explicit grant survives a
  promotion and a demotion, and that a role row does not.

- **[A private member leaks through the member list]** → The resolver replaces the
  name and the avatar, hides the ranking flag and reports no weight or trend. A test
  asserts that a private member's name never reaches a viewer who is not that
  member.

- **[A member who leaves keeps recording]** → Closing the membership deletes the
  member's permission rows in the same transaction, and the check reads only those
  rows. A test asserts that a departed member's permission is gone immediately.

- **[A code is guessed]** → The alphabet has 32 characters, so a six-character code
  is about a billion combinations, it expires in 24 hours, and a failed guess tells
  the user nothing about which part was wrong.

- **[The group grows stale without a recorder]** → The "no recorder assigned" state
  is on the group page and the Owner is prompted there.

- **[The Owner role becomes a bottleneck]** → The transfer is one control next to
  the role control, and the group page shows the Owner first.

## Migration Plan

1. `drizzle-kit generate` produces a migration that creates the five new tables.
2. `drizzle-kit migrate` applies it. The change is purely additive: no existing
   table is altered and no row is rewritten.
3. Rollback is the reverse migration: drop the five tables. Nothing in Epics 1 and 2
   references them, so the rollback loses no data that the application can read.
