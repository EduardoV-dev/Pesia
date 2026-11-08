# awards Specification

## Purpose
Covers behaviour-consistency awards: what is earned, how "expected check-in" is derived
from each member's own cadence, how claims are persisted per period, how the private
"largest change" reveal works per member and its publish flag, and the rule that no
award ranks body size.

## Requirements

### Requirement: Consistency awards are earned by behaviour

The system SHALL issue exactly four consistency award types — highest share of expected
check-ins completed (`most_consistent`), every expected check-in completed in a month
(`perfect_month`), longest run of consecutive completions (`best_streak`), and return
after a gap of at least twice the member's own cadence (`comeback_kid`) — and SHALL
apply no award whose criterion involves body size or weight magnitude.

#### Scenario: Cadence makes the comparison fair

- **WHEN** one member weighs weekly and another monthly
- **THEN** each is expected and judged against their own cadence, so identical
  behaviour earns the same awards on different absolute counts

#### Scenario: Minimum bars apply

- **WHEN** a period would grant `most_consistent`, `perfect_month` or `best_streak`
- **THEN** it requires at least 3, 2 or 2 expected check-ins respectively for the
  member to earn the award

#### Scenario: A member with an undetectable cadence

- **WHEN** a member's expected cadence cannot be derived (no cadence set and no
  weigh-in weekday applies)
- **THEN** that member accrues no award for the period, silently

### Requirement: Award claims are computed per period and stored

The system SHALL compute awards per calendar month (the group's timezone) and persist
each earned claim in `award_claims` keyed by `(group, profile, award_type,
period_start)` with `computed_at` and `shared_public = false` by default, so board
reads never recompute awards on every view.

#### Scenario: Recomputation is idempotent

- **WHEN** the awards for a period are computed again after new entries arrive
- **THEN** existing claims for that period are updated or left intact and no duplicate
  claim row is created for the same silence key

### Requirement: The "largest change" reveal is private and opt-in to publish

The system SHALL compute, server-side and per member, whether that member's absolute
change against their own baseline was the group's largest in the period, SHALL deliver
that answer only to the member it is about, SHALL travel to no other viewer in any
payload, and SHALL publish the badge to the member's card only when that member sets
`shared_public` on the claim — rendered as a badge, never as a ranked list.

#### Scenario: The reveal is private

- **WHEN** the member who moved the most this month exists
- **THEN** only that member's own board view contains the reveal; every other viewer's
  payload for them contains no magnitude award and no hint of it

#### Scenario: Publishing

- **WHEN** the member grants publication for the claim
- **THEN** the badge appears on their card for every viewer who can see their name, and
  unpublishing removes it again

### Requirement: Awards only decorate cards

The system SHALL display awards on the card of the member who earned them and in the
consistency strip ordered by behaviour, and SHALL NOT display any award, reveal or
number in a position that implies cross-member body-size ranking.

#### Scenario: The only ranking

- **WHEN** the consistency strip renders
- **THEN** the members it contains are ordered by completed check-in share against
  their own cadence and carry no body-size comparison
