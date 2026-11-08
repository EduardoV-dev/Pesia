# Epic 6 — Group board & awards

The shared view of the family. It shows each person moving toward their own goal and rewards consistency — never body size. It also contains the single highest-risk code in the product: the server-side filter that decides what each viewer is allowed to see.

## Outcome

- The group sees each member's **own** progress side by side, with no ordinal ranking of body size.
- Consistency awards are earned and displayed; magnitude awards are computed privately and disclosed only by the member.
- **Every read is filtered server-side.** The client never receives data the viewer may not see.
- Members who are private, hidden, opted out or dependent are represented correctly and without explanation.
- The app never infers a reason for someone's absence or non-sharing.

## Scope

### The board

| Element | Shows | Never shows |
|---|---|---|
| Member card | Name, avatar, own progress bar, own trend sparkline, own awards | Anyone else's numbers, an ordinal position on body size, a comparison to another member's progress |
| Consistency strip | Behaviour awards only | Magnitude awards, unshared private reveals |
| Dependent card | Name, latest weight, trend direction, stability | Target, progress %, BMI, rank, any award |
| Private member | A "private" placeholder | Name, weight, trend, absence, or a reason |
| Hidden / opted-out member | Name only, or omitted from the ranking strip | Any weight, trend, progress, award |

**No member's progress is ever rendered as "better than" another's.** Two members at 60% and 20% are shown as two progress bars side by side, not as a 1st and 2nd place. The only `#1` in the product belongs to consistency.

### Server-side visibility filtering (guardrail G10)

The board is assembled **on the server**, per viewer, per group. The query that produces it applies:

1. `visibility` — what the member's own setting permits (`weight_trend`, `latest_only`, `name_only`, `private`)
2. `ranking_opt_out` — excludes the member from the consistency ranking strip
3. `is_dependent` — reduces the member to trend-only, no target, no progress, no BMI
4. `notes` — stripped entirely; notes are private to their author at every visibility level

The client receives only what passes all four checks. There is no client-side filtering step that could be bypassed, and no API route that returns raw group membership plus raw entries.

**This is the riskiest surface in the product. If it leaks, the app becomes the thing it was designed not to be.** It ships with integration tests covering every combination of viewer role × subject visibility × dependent flag × ranking opt-out, before any feature behind it is considered done.

### Awards

All awards are earned by **behaviour**, never by body size.

| Award | Definition | Requires |
|---|---|---|
| `most_consistent` | Highest share of expected check-ins completed in the period | At least 3 expected check-ins in the period |
| `perfect_month` | Every expected check-in completed in a calendar month | At least 2 expected check-ins |
| `best_streak` | Longest run of consecutive completed check-ins | At least 2 check-ins in the run |
| `comeback_kid` | Returned after a gap of at least twice their cadence, then completed 2+ check-ins | — |

"Expected check-in" is derived from that member's own cadence. A member who chose monthly is judged monthly; comparing their record to a weekly member would be comparing body sizes by proxy.

Awards are computed per period (calendar month by default) and stored so the board does not recompute them on every read.

```sql
award_claims (
  id            uuid primary key,
  group_id      uuid not null references groups(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  award_type    text not null,
  period_start  date not null,
  period_end    date not null,
  computed_at   timestamptz not null default now(),
  shared_public boolean not null default false,
  unique(group_id, profile_id, award_type, period_start)
)
```

### "Biggest change" — private by default

The family enjoys the drama of "I moved the most this month". So the app keeps it — privately.

- The app computes each member's own change against the group's largest change, **server-side, per member**.
- The member alone is told whether they moved the most. No other member sees that comparison, and no group-facing magnitude leaderboard exists.
- The member may choose to publish their badge. Only then does it appear on their card, and only as a badge — still never as a ranked list.

The `shared_public` flag on `award_claims` is the whole disclosure mechanism. Default `false`.

### Absence, handled honestly

A member whose check-in is due appears on the sheet as due. A member who has set `private` is **never** shown as due, never shown as missing, and never counted in any absence statistic (guardrail G8). The app states nothing about why anyone is or is not present.

## Not in this epic

- Push delivery and reminder scheduling (Epic 7) — this epic decides *what* would be said; Epic 7 decides when to say it
- The entry capture flow (Epic 4)
- Statistics computation (Epic 5) — this epic renders results it does not compute
- Comments, reactions, likes or any social feed — deliberately excluded
- A "biggest loser"/"biggest gainer" leaderboard — excluded by design, permanently

## Acceptance criteria

- [x] **US-6.1** I can open the group board and see every member's own progress.
- [x] **US-6.2** I see only what each member chose to share.
- [x] **US-6.3** A private member appears as "private" and nothing more.
- [x] **US-6.4** A member who opted out is absent from the ranking strip but still on the sheet.
- [x] **US-6.5** Consistency awards are shown on the card they belong to.
- [x] **US-6.6** I learn privately that I changed the most in the period.
- [x] **US-6.7** I can choose whether to publish that badge.
- [x] **US-6.8** A dependent's card shows a trend and no score.
- [x] **US-6.9** A hidden member is never shown as missing or due.
- [x] **US-6.10** The board shows progress bars side by side, never a ranked list.
- [x] **US-6.11** Every board read is filtered on the server before the response is sent.
- [x] Every read path applies the filter server-side, with integration tests covering every viewer role × visibility × dependent flag × opt-out combination.
- [x] Notes never leave the server for any viewer other than their author.
- [x] No screen in the product renders a body-size ranking.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 5 | The board renders computed progress |
| Depends on | 3 | It enforces exactly the permission model built there |
| Depends on | 4 | Cards render entry-derived data |
| Blocks | 7 | Reminders must respect who is visible and who is opted out |
| Blocks | 8 | The guardrail audit in Epic 8 verifies this epic's output |

## Risks

| Risk | Mitigation |
|---|---|
| A read path bypasses the filter | One server-side assembly function, used by every board read; integration tests enumerate every role and visibility combination |
| "Biggest change" drifts into a public ranking | The value is never computed for the group, only for the individual; publication is an explicit per-member flag |
| Consistency awards feel like a competition over bodies | Awards are computed on check-in completion against each member's own cadence, so the comparison is between behaviours on different scales |
| A private member is inferable from an absence | Private members are excluded from due lists and absence counts entirely |

## Size

**2 working days** · 28 story points
