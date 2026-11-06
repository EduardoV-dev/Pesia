# Epic 2 — Profiles & identity

A profile exists independently of a login. This is the decision that makes the real family work: kids have no phone, grandparents may not use Google, and the family shares a laptop. One login can manage several profiles and switch between them, which is also exactly how the recorder enters everyone's weight.

## Outcome

- A profile can be created by a signed-in user for themselves, with or without its own login.
- A profile can be created **for** someone else — a managed profile (no login) or a dependent profile (no login, trend-only).
- Every profile carries its own unit and its own goal, including a maintain band.
- Changing a target resets the baseline, so progress restarts from a meaningful zero.

## Scope

### Managed and dependent profiles

Extend the `profiles` table created in Epic 1 with the distinction that matters downstream:

| Case | `user_id` | `is_dependent` | Goals | BMI | Ranking |
|---|---|---|---|---|---|
| Self (has login) | set | false | own | optional, private | own choice |
| Managed adult (grandma, shared laptop) | `NULL` | false | own | optional, private | own choice |
| Dependent (kid) | `NULL` | true | **none** | **never** | **never** |

> The two flags are orthogonal on purpose. A grandparent may be managed (no login) while still owning a goal. A kid is both managed and dependent.

A dependent profile is **trend-only** (guardrail G9): no target, no progress percentage, no ranking position, no BMI. Pediatric BMI would require age- and sex-specific percentile tables, and adult BMI categories applied to a child are simply wrong — so we do not collect age or sex for dependents, and the option does not exist.

### Goals

```sql
goals (
  id                 uuid primary key,
  profile_id         uuid not null references profiles(id) on delete cascade,
  direction          text not null,              -- 'lose' | 'gain' | 'maintain'
  target_weight_kg   numeric(6,2) null,          -- null when direction = 'maintain'
  band_kg            numeric(4,2) null,          -- tolerance when direction = 'maintain'
  baseline_weight_kg numeric(6,2) not null,      -- weight at the moment the goal was set
  baseline_at        timestamptz not null,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
)
```

- One active goal per profile. Superseded goals are kept as history.
- **Direction is derived from the target, never assumed.** A target below the baseline means "lose"; above means "gain". "Maintain" is a first-class direction a person chooses explicitly, expressed as a band around a target (guardrails G5, G6).
- **Changing a target resets the baseline** to the weight at the time of the change, so progress restarts at 0%. Recomputing against the original baseline produces nonsense like 140%.

### Profile switching

- A signed-in user can switch between the profiles they manage.
- Switching changes which profile subsequent entries are attributed to — it is the mechanism behind "one recorder logs everyone".
- A profile with no login is never independently signable-into, but it is fully managed from the device of someone who can.

## Not in this epic

- Height, BMI or any body metric (Epic 5)
- Groups, roles or permissions (Epic 3) — a profile exists here but gains meaning there
- Entries (Epic 4); `baseline_weight_kg` is populated from the first entry once Epic 4 exists
- Group-scoped visibility and ranking opt-out (Epic 3) — both are group-scoped, not profile-scoped

## Acceptance criteria

- [ ] **US-2.1** A signed-in user can create their own profile.
- [ ] **US-2.2** A profile's display unit can be kg or lb, and changes what the app shows and accepts.
- [ ] **US-2.3** A profile can set a target weight and the direction is derived from it.
- [ ] **US-2.4** A maintain goal stores a band and reports 100% while inside it.
- [ ] **US-2.5** Changing a target resets the baseline to the current weight.
- [ ] **US-2.6** A signed-in user can create a managed profile for someone without a login.
- [ ] **US-2.7** A dependent profile cannot have a target, a BMI or a ranking position.
- [ ] **US-2.8** A user can switch between the profiles they manage, and subsequent entries follow the active profile.
- [ ] **US-2.9** Profile display name and avatar can be edited.
- [ ] **US-2.10** A newly created profile is invisible to every group until its owner joins one.
- [ ] A profile with no login is never exposed to anyone other than the people who manage it.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 1 | Needs a signed-in user and the `profiles` table |
| Blocks | 3 | Roles and memberships attach to profiles |
| Blocks | 4 | Entries are attributed to a profile and recorded by a user |

## Risks

| Risk | Mitigation |
|---|---|
| Treating "managed" and "dependent" as the same flag | They are separate columns on purpose; a grandparent is managed but keeps her own goal |
| Baseline is captured before any entry exists | `baseline_weight_kg` falls back to the first recorded entry, and goals can be set before that |
| Shared-laptop users see each other's profile switcher | The switcher lists only profiles the signed-in user manages; Epic 8 adds the deletion path |

## Size

**1.5 working days** · 19 story points
