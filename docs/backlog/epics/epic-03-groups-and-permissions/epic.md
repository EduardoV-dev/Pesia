# Epic 3 — Groups, roles & permissions

Closed groups, reachable only by invite, with three roles, an explicit "who may log for whom" permission, and per-member control over what the group can see. This is where the consent model becomes real — and where the app earns the right to show anybody a number.

## Outcome

- A group can be created, joined by invitation only, and deleted by its owner.
- Roles (Owner / Logger / Member) exist as presets over a single permission table.
- Any member can restrict what the group sees of them, and can opt out of ranking.
- Log permissions are independent of viewing permissions.
- Removing or replacing the recorder never breaks the group.

## Scope

### Data model

```sql
groups (
  id                uuid primary key,
  name              text not null,
  created_by_user_id text not null,
  timezone          text not null default 'UTC',   -- how measured_at is rendered
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz null
)

group_memberships (
  id                uuid primary key,
  group_id          uuid not null references groups(id) on delete cascade,
  profile_id        uuid not null references profiles(id) on delete cascade,
  role              text not null,                   -- 'owner' | 'logger' | 'member'
  visibility        text not null default 'weight_trend',
                    -- 'weight_trend' | 'latest_only' | 'name_only' | 'private'
  ranking_opt_out   boolean not null default false,
  cadence_days      integer null,                   -- null = no personal cadence
  joined_at         timestamptz not null default now(),
  left_at           timestamptz null,
  unique(group_id, profile_id)
)

can_log_for (
  group_id            uuid not null references groups(id) on delete cascade,
  subject_profile_id  uuid not null references profiles(id) on delete cascade,
  logger_profile_id   uuid not null references profiles(id) on delete cascade,
  granted_by_user_id  text not null,
  primary key (group_id, subject_profile_id, logger_profile_id)
)

group_settings (
  group_id           uuid primary key references groups(id) on delete cascade,
  weigh_in_weekday   integer null,                  -- 0 = Sunday
  weigh_in_time      time null,
  reminders_enabled  boolean not null default true
)

invites (
  id          uuid primary key,
  group_id    uuid not null references groups(id) on delete cascade,
  kind        text not null,                        -- 'link' | 'code'
  token       text not null unique,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz null
)
```

### Roles as presets over one permission table

There is exactly one mechanism for "who may log for whom": `can_log_for`. Roles are not a parallel permission system — they are the set of rows the app pre-seeds.

| Role | May log for | May manage | Notes |
|---|---|---|---|
| Owner | every profile in the group | roles, invites, settings, member removal, group deletion | at least one Owner always exists |
| Logger | every profile in the group | nothing | the family's designated recorder |
| Member | themselves only | nothing | the default |

Self-logging is itself a `can_log_for` row (`subject = logger = me`), so there is no special case in the permission check.

### Logging is not viewing

**The single most important rule in this epic.** The ability to *write* an entry never implies the ability to *read* a profile's history. A logger may be permitted to record Ana's weight on Sunday without being able to open Ana's trend for the past year — reading follows `visibility`, writing follows `can_log_for`.

This keeps the two permission systems separate, so the recorder (who physically handles the scale) does not automatically gain a dossier on every relative.

### Visibility

Per member, per group, one of four levels:

| Level | The group sees |
|---|---|
| `weight_trend` (default) | Latest weight and the trend |
| `latest_only` | Latest weight only, no trend |
| `name_only` | The member's name on the sheet, no numbers |
| `private` | Nothing — renders as "private" |

Notes attached to entries are always private to their author, at every visibility level.

A member who sets `private` is also excluded from "who hasn't weighed in yet" reminders (guardrail G8). The app never states or implies a reason for a hidden or absent member.

### Ranking opt-out

A per-member, per-group flag that removes the member from the board's ranking and awards while keeping them on the sheet. It is independent of visibility: a member can be fully visible in the group and still choose not to be ranked.

### Membership lifecycle

- **Removing a member** (Owner) or **leaving** (self): the membership is closed, but **their past entries stay in the group's history**. Other people weighed them and saw those numbers; erasing them would rewrite other people's history. Removing a member is not a data-purge action — Epic 8 owns deletion.
- **The recorder leaves**: the group must not be orphaned. The Owner is prompted to appoint a new Logger, and the group shows a clear "no recorder assigned" state until they do.

## Not in this epic

- The group board and its visibility-filtered rendering (Epic 6) — this epic builds the permission model; Epic 6 renders it
- Entries themselves (Epic 4)
- Reminder delivery (Epic 7); this epic stores the cadence and weigh-in-day settings they read
- Ranking computation and awards (Epic 6)
- Public groups, group discovery or search — out of scope for v1 by decision

## Acceptance criteria

- [x] **US-3.1** A signed-in user can create a group and becomes its Owner.
- [x] **US-3.2** An invite link lets a new user join that group only.
- [x] **US-3.3** A 6-character code does the same.
- [x] **US-3.4** Joining via invite adds the user to the group and nothing else.
- [x] **US-3.5** An Owner can revoke an invite link, after which it no longer works.
- [x] **US-3.6** Only an Owner can promote or demote a Logger.
- [x] **US-3.7** A member can grant a specific person permission to log their weight.
- [x] **US-3.8** A member can revoke that permission at any time, effective immediately.
- [x] **US-3.9** A member can set their visibility level for a group.
- [x] **US-3.10** A member can opt out of the group's ranking.
- [x] **US-3.11** A member can set a personal weigh-in cadence.
- [x] **US-3.12** An Owner can set the group's weigh-in day and time.
- [x] **US-3.13** Removing a member closes the membership and keeps their past entries in the group's history.
- [x] **US-3.14** A member can leave a group under the same rule.
- [x] **US-3.15** An Owner can delete a group, destroying it and all its data.
- [x] **US-3.16** When the recorder leaves, the Owner is prompted to appoint a new one.
- [x] **US-3.17** Writing permission never grants reading permission.
- [x] A group is reachable only by invitation — there is no list, no search and no public URL.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 2 | Roles and memberships attach to profiles |
| Blocks | 4 | Entries need a group, a subject and a permission check |
| Blocks | 6 | The board renders exactly what this permission model allows |
| Blocks | 7 | Reminders need cadence and weigh-in-day settings |

## Risks

| Risk | Mitigation |
|---|---|
| A Logger's role is mistaken for read access | Two separate checks in code: `canLogFor` for writes, `visibility` for reads, with no code path that treats one as the other |
| A leaked invite link silently grants group access | Links are rotatable and revocable; codes are short-lived by comparison |
| Removing a member is read as "delete my data" | The removal confirmation states plainly that past entries remain; deletion is a separate, explicit action in Epic 8 |
| A group ends up with zero Owners | Role transfer is required before an Owner can leave or be removed |

## Size

**2 working days** · 27 story points
