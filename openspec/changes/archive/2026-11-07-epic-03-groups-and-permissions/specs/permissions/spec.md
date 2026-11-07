# Spec Delta

## Purpose
Covers the two permissions the product turns on: who may record whose weight, and
who may see what that weight tells. They are separate tables, separate checks, and
neither one ever stands in for the other.

## ADDED Requirements

### Requirement: One table decides who may record whose weight

The system SHALL keep every log permission in a single table and SHALL derive a
role's reach by seeding rows in that table, so that no second rule set decides who
may record.

#### Scenario: The role preset

- **WHEN** a member holds the Logger role
- **THEN** the table holds a row for that member against every member of the group

#### Scenario: The member preset

- **WHEN** a member holds the Member role
- **THEN** the table holds a row for that member against themselves and against
  nobody else

### Requirement: Recording permission never grants reading permission

The system SHALL check the permission to record only against the log permission
table, SHALL check the permission to read only against the visibility setting, and
SHALL NOT have any path where one check answers the other.

#### Scenario: A Logger records a private member

- **WHEN** a Logger records a weight for a member whose visibility is private
- **THEN** the record is accepted and the Logger still cannot open that member's
  history

#### Scenario: A Logger records a name-only member

- **WHEN** a Logger records a weight for a member whose visibility is name only
- **THEN** the record is accepted and the Logger still sees no number for that
  member

#### Scenario: Every role against every visibility level

- **WHEN** each role is checked against each visibility level
- **THEN** the write check and the read check reach different answers wherever the
  member's settings say they must

### Requirement: A member says who may record their weight

The system SHALL let a member grant a specific member of the group permission to
record their weight, SHALL scope the permission to that group, SHALL let the member
revoke it at any time, and SHALL take the revocation into effect at once.

#### Scenario: Granting permission

- **WHEN** a member grants another member permission to record their weight
- **THEN** that member may record the subject's weight in that group

#### Scenario: The permission is per group

- **WHEN** a member grants permission in one group
- **THEN** the permission does not extend to any other group

#### Scenario: Revoking permission

- **WHEN** a member revokes a permission they granted
- **THEN** the next attempt to record their weight is refused

#### Scenario: The revoked person's own ability

- **WHEN** a member revokes somebody's permission to record their weight
- **THEN** the member's own ability to record their own weight is unchanged

#### Scenario: No reason is sent

- **WHEN** a permission is revoked
- **THEN** nobody is told why

### Requirement: A member decides what the group sees of them

The system SHALL offer a member exactly four visibility levels for the group, SHALL
default to weight and trend, SHALL apply the member's choice to every read the group
makes of them, and SHALL let the member see their own data in full whatever they
choose for others.

#### Scenario: The four levels

- **WHEN** a member opens their visibility setting
- **THEN** the app offers weight and trend, latest weight only, name only and
  private, and offers nothing else

#### Scenario: The default

- **WHEN** a member joins a group and says nothing
- **THEN** the group sees their weight and their trend

#### Scenario: Every read

- **WHEN** the group reads that member
- **THEN** the read is limited to the level the member chose

#### Scenario: A member reads themselves

- **WHEN** a member reads their own data
- **THEN** they see it in full whatever level they set for the others

### Requirement: Visibility is filtered on the server

The system SHALL resolve what a viewer may see of every member of a group on the
server, and SHALL NOT hand the client a member's data that the viewer may not see.

#### Scenario: A private member in somebody else's view

- **WHEN** a member views a group where another member is private
- **THEN** that member appears as private, with no name, no weight and no trend

#### Scenario: A name-only member

- **WHEN** a member views a group where another member shares only their name
- **THEN** that member appears by name with no number anywhere

#### Scenario: A latest-only member

- **WHEN** a member views a group where another member shares only their latest
  weight
- **THEN** the latest weight is visible and the trend is not

#### Scenario: The group sheet never leaks

- **WHEN** any route reads the members of a group
- **THEN** the data it returns is already filtered for the viewer

### Requirement: A member may opt out of the ranking

The system SHALL let a member opt in and out of the ranking at any time, SHALL keep
the member in the group and on the weigh-in sheet, and SHALL treat the opt-out as
independent of the visibility setting.

#### Scenario: Opting out

- **WHEN** a member turns the ranking opt-out on
- **THEN** the member stays in the group and on the weigh-in sheet and is excluded
  from the ranking

#### Scenario: A visible member who opts out

- **WHEN** a member shares everything and still opts out of the ranking
- **THEN** the group still sees their data and the ranking still leaves them out

#### Scenario: A private member's opt-out stays hidden

- **WHEN** a member is private and has opted out of the ranking
- **THEN** no viewer sees that they opted out

### Requirement: A member sets their own weigh-in cadence

The system SHALL let a member choose weekly, every two weeks, monthly or no cadence,
and SHALL let the cadence affect only when the member is asked, never whether the
member may record.

#### Scenario: Setting a cadence

- **WHEN** a member chooses a cadence
- **THEN** the group stores that cadence for that member

#### Scenario: A cadence never changes a permission

- **WHEN** a member has no cadence
- **THEN** the member may still record their own weight and anybody else's they were
  granted

### Requirement: A dependent profile stays trend-only inside a group

The system SHALL allow a dependent profile to be a member of a group, SHALL refuse to
give it a role above Member, and SHALL never show it a target, a progress
percentage, a ranking position or a BMI.

#### Scenario: A dependent joins a group

- **WHEN** a dependent profile joins a group
- **THEN** it joins with the Member role and may be recorded like anybody else

#### Scenario: Promoting a dependent

- **WHEN** an Owner tries to promote a dependent profile to Logger or Owner
- **THEN** the request is refused

#### Scenario: A dependent on the sheet

- **WHEN** the group sheet lists a dependent profile
- **THEN** it shows no target, no progress percentage, no ranking position and no BMI
