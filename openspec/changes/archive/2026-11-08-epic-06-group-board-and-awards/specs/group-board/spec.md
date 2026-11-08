# Spec Delta

## Purpose

Covers the group board: the server-side, per-viewer assembly of what each member of a
group may see of the others, and the board surface that renders it. It owns the
product's highest-risk contract — visibility filtering enforced on every read (G10) —
plus dependent reduction, ranking opt-out, absence honesty, and the no-ranking rule.

## ADDED Requirements

### Requirement: The board is assembled on the server and sends only filtered data

The system SHALL assemble the group board exclusively on the server through a single
named function that applies, per member shown and for the requesting viewer: the
member's own `visibility` grant, their `rankingOptOut` flag, their dependent status,
and note stripping for any note not authored by the viewer. The client SHALL receive
only fields the viewer is permitted to see, and no API route SHALL return raw group
membership together with raw entries.

#### Scenario: A `latest_only` member

- **WHEN** a member whose own visibility is `latest_only` is rendered for another viewer
- **THEN** the payload for that member contains the latest weight value only — it
  contains no entry history, no trend data and no progress fields

#### Scenario: A `name_only` member

- **WHEN** a member whose own visibility is `name_only` is rendered for another viewer
- **THEN** the payload contains the name and avatar only — it contains no weight value

#### Scenario: A `private` member

- **WHEN** a member whose own visibility is `private` is rendered for any other viewer
- **THEN** the payload contains no name, no weights, no trends and no membership
  explanation — the client renders a fixed "private" placeholder

#### Scenario: Notes never cross the boundary

- **WHEN** the board payload contains an entry note
- **THEN** the note is included only if its author is the viewing principal, at every
  visibility level

#### Scenario: The recorder rule is not a read rule

- **WHEN** a viewer holds `can_log_for` for a subject whose visibility is stricter than
  `weight_trend`
- **THEN** the board still applies the subject's own visibility — the write permission
  widens nothing the viewer sees

### Requirement: A dependent's card is trend-only

The system SHALL reduce a dependent member's card to name, avatar, latest weight
at their visibility level, and trend direction whose wording is goal-relative
("estable", "moviéndose hacia", "alejándose"), and SHALL NOT render for a dependent a
target, a goal, a progress percentage, a BMI or any award or rank position.

#### Scenario: A dependent's card

- **WHEN** a dependent appears on the board
- **THEN** the card shows weight-permitted data and a trend direction only, and shows
  no progress bar, no percentage and no award

### Requirement: Ranking opt-out keeps the card off the strip

The system SHALL exclude a member with `rankingOptOut` set from the consistency strip
and any award placement, while keeping their normal card on the board.

#### Scenario: An opted-out member

- **WHEN** a member has opted out of rankings
- **THEN** their card still renders with its own data, and their awards do not appear
  in the consistency strip or any ordered list

### Requirement: The board never ranks body size

The system SHALL order the board by behaviour statistics only — consistency awards
largest-first (G1) — SHALL render progress bars side by side with no ordinal position
attached to progress (G2), and SHALL NOT disclose the "largest change" comparison to
any member other than the subject of that comparison.

#### Scenario: Two members at different progress

- **WHEN** two members stand at 60% and 20% of their (possibly opposite) goals
- **THEN** both progress bars render side by side with no 1st/2nd position and the
  board orders their cards by the consistency strip, not by progress

#### Scenario: No size leaderboard

- **WHEN** any viewer reads the board payload
- **THEN** no field in the payload expresses a magnitude ranking across members

### Requirement: Absence is stated only for who may be absent

The system SHALL derive a member's "due" state from their own cadence and group's
weigh-in settings only for members whose visibility shows their name, and SHALL
exclude `private` members, hidden members and dependents from every due list and
absence statistic without any placeholder that would leak that data exists.

#### Scenario: A private member is never "due"

- **WHEN** a `private` member's check-in comes due
- **THEN** the member appears as "private" only and never in any due, late or missing list

#### Scenario: A hidden member

- **WHEN** a member's profile is hidden from the group
- **THEN** the member is omitted rather than shown as missing; the board does not infer
  or display any reason for absence

### Requirement: Opening the board requires group standing only

The system SHALL let any active member of a group open that group's board, using the
same active-membership proof the rest of the group reads use, and at most one board
surface per group in the navigation.

#### Scenario: A member opens the board

- **WHEN** an active member navigates to the board of a group they belong to
- **THEN** the board renders; when they do not belong, it renders not-found
