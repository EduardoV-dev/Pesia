# Spec Delta — entries

## Purpose

A weigh-in is a permanent, attributed record of a person's weight for one day of
measurement. This capability owns how entries are created, who may create them,
how they are corrected and removed, and which entry fields any viewer may see.

## ADDED Requirements

### Requirement: Record own weight

A member **SHALL** be able to record their own weight from the weigh-in sheet, with the
current time stamped as both the measured time and the recorded time. The weight
**SHALL** be stored canonically in kilograms regardless of any display unit. A value
outside the accepted range **SHALL** be rejected with a readable Spanish message and
must never be silently clamped or reinterpreted.

#### Scenario: A member logs their own weight

- **WHEN** a member on their own profile enters a weight within the accepted range and
  saves
- **THEN** one entry is created with the subject equal to the member's profile
- **AND** `measured_at` and `recorded_at` are both stamped with the current instant
- **AND** the stored value is the kg equivalent of what was displayed

#### Scenario: Out-of-range value rejected

- **WHEN** the entered weight falls outside the accepted range
- **THEN** the save is refused with a readable Spanish message stating the accepted
  range
- **AND** no entry is created and no value is clamped

### Requirement: Record for another person requires log permission

A user **SHALL** be able to record a weight for a subject profile in a group only when
a log permission (`can_log_for`) exists for that logger and subject in that group. The
refusal **SHALL** be decided server-side with a stated reason, not merely hidden in the
UI. Recording for someone **SHALL** never grant the recorder any additional read access
to that subject's entry history.

#### Scenario: A recorder logs the person in front of them

- **WHEN** a user with log permission selects a subject profile and saves a weight
- **THEN** the entry is created against that profile and attributed to the recorder

#### Scenario: Write without permission refused server-side

- **WHEN** a request to create an entry arrives with no log permission for that subject
  in that group
- **THEN** the server refuses the write with a stated reason in Spanish
- **AND** no entry is created

#### Scenario: Recording grants no read access

- **WHEN** a user has just recorded an entry for a subject whose visibility would not
  otherwise show them entries
- **THEN** the user obtains no read access to the subject's entry history beyond what
  visibility already granted

### Requirement: The person being weighed is unambiguous

The weigh-in sheet **SHALL** name the profile being recorded prominently before and
after the save, **SHALL** require an explicit action to move to the next person, and
**SHALL** preview the next person after each save.

#### Scenario: Quick succession of weigh-ins

- **WHEN** a recorder saves a weigh-in for a subject and continues the session
- **THEN** the sheet confirms the entry for that subject, names the next person to be
  weighed prominently, and does not advance to that person until the recorder acts

### Requirement: Dual timestamps, measured and recorded

Every entry **SHALL** carry a `measured_at` instant (when the person stood on the scale)
and a separate `recorded_at` instant (when the entry was typed), and both **SHALL** be
displayed distinctly whenever an entry is shown. `measured_at` **SHALL** be stored in
UTC and rendered in the group's timezone.

#### Scenario: The Sunday weight typed on Monday

- **WHEN** an entry measured on Sunday is recorded on Monday evening
- **THEN** the entry shows the measured time as Sunday and the recorded time as Monday,
  each sourced from a distinct field

### Requirement: Backdating to the real measurement date

A user who may edit an entry **SHALL** be able to change its measured date with no
arbitrary window restriction, and the recorded time **SHALL** be preserved separately.

#### Scenario: Fixing the day

- **WHEN** the entry's owner corrects the measured date to the day the person actually
  stood on the scale
- **THEN** the entry's measured date is saved unchanged in identity (UTC day rendering
  in the group timezone)

### Requirement: Correction is attributed and restricted

An entry **SHALL** be editable only by its recorder (the user who created it) or by the
subject of the entry. Every edit **SHALL** record who edited it and when, and the
editor **SHALL** be visible to anyone permitted to see the entry.

#### Scenario: Fixing a typo the member made

- **WHEN** a member edits the weight of an entry they recorded themselves
- **THEN** the change is saved and the entry shows the new editor and edit time

#### Scenario: Unrelated member cannot edit

- **WHEN** a user who is neither the entry's recorder nor its subject attempts to edit
  or delete it
- **THEN** the server refuses the write

### Requirement: Deletion leaves no placeholder

An entry **SHALL** be deletable only by its recorder or its subject, using an
append-only mechanism (never a hard data-mutation dump). A deleted entry **SHALL** be
absent from every view, **SHALL** leave no placeholder, no marker, and no count of
removed entries anywhere the group can see.

#### Scenario: Removing a mistake

- **WHEN** the recorder deletes an entry
- **THEN** the entry disappears from the subject's history and no deleted-entry marker
  or count appears in any group-visible view

### Requirement: Private note

An entry may carry a note that **SHALL** never be visible to anyone other than its
author, at every visibility level, including when that entry's weight would be visible,
and including inside administration or export surfaces owned by other users.

#### Scenario: A note nobody else can read

- **WHEN** a member writes a note on an entry and another member who can see the entry's
  weight attempts to read or access the entry
- **THEN** the note text is withheld from them, regardless of their visibility level

### Requirement: Own history

A member **SHALL** see their own entry history newest-first, with the measured date and
the recorded date shown distinctly, including entries that another recorder logged on
their behalf. Deleted entries **SHALL** be absent.

#### Scenario: The member checks what was logged

- **WHEN** a member opens their own history after a group weigh-in recorded by the
  recorder
- **THEN** every entry about them appears newest-first, each showing who recorded it
  and the two distinct dates

### Requirement: Attribution is permanent and visible

Any entry visible to a viewer **SHALL** show who recorded it and when, and the
attribution **SHALL** persist even after the authoring user's account is deleted,
including displaying a legacy indicator if no longer linked to an active login.

#### Scenario: Recorder deletes their account

- **WHEN** the user who recorded an entry later deletes their account
- **THEN** every entry they recorded still names them as responsible, without exposing
  or re-coupling any other data from that account

### Requirement: Entry reads are filtered by visibility

Every read of entries that the server serves to a viewer **SHALL** apply the viewer's
per-subject visibility from the group membership state; the client **SHALL** never
receive raw membership-entries pairs without that filtering applied. A private note
**SHALL** be withheld from every viewer other than its author before any response is
rendered.

#### Scenario: Two viewers, different visibility

- **WHEN** member A with weight-level visibility and member B with hidden visibility
  for a subject both request that subject's entries
- **THEN** member A receives entry data at the weight level while member B receives none
- **AND** the filtering is decided server-side in one place, such that no unfiltered
  route exists
