# data-export Specification

## Purpose
Covers the on-request export of a member's own data as complete JSON and
spreadsheet-friendly CSV. The export is scoped to the profiles the member manages,
honors note privacy at every level, and never includes data that belongs to other
people.

## Requirements

### Requirement: A member can export their data as JSON

The system SHALL generate, on request and without contacting anyone, a complete and
valid JSON export of everything the app holds about the requesting member: every
profile they manage (their own and the ones they manage for others), every goal of
those profiles, every non-deleted entry recorded about those profiles regardless of
who recorded it, the member's group memberships, the member's permissions, and the
member's settings.

#### Scenario: The complete export

- **WHEN** a member requests their JSON export
- **THEN** the file contains their managed profiles with their settings, the goals of
  those profiles, all non-deleted entries about those profiles (including entries
  another recorder typed), their memberships, their permissions, and their settings,
  as valid JSON

#### Scenario: Data that belongs to others stays out

- **WHEN** the member recorded entries about other people that they do not manage
- **THEN** those entries are absent from the export, because those belong to the
  subjects, not to the recorder

### Requirement: The export respects note privacy

A note on an entry SHALL be included in an export only when the requesting member is
the note's author, at every level, matching the note privacy the app enforces on
every other read.

#### Scenario: Another recorder's note stays private

- **WHEN** the export contains an entry about the member's profile that another
  recorder wrote with a note
- **THEN** the entry appears without the note text

### Requirement: A member can export their entries as CSV

The system SHALL generate, on request, a CSV file with one row per non-deleted entry
recorded about the profiles the member manages, with the measured date, the recorded
date, the weight labelled with its unit, the profile, and who recorded it. Dates
SHALL be unambiguous.

#### Scenario: The spreadsheet export

- **WHEN** a member requests their CSV export
- **THEN** the file has one row per entry with unambiguous dates, the weight with its
  unit, the profile name and the recorder's name, and it opens as a spreadsheet

#### Scenario: Deleted entries are absent

- **WHEN** an entry was deleted
- **THEN** no row exists for it in the CSV

### Requirement: Export is server-side and self-service

The export SHALL be assembled server-side from the same visibility primitives the
app already enforces, SHALL be delivered as a file download on the member's request,
and SHALL reflect the data as it is at the moment of the request.

#### Scenario: Export reflects current state

- **WHEN** a member requests an export after a group weigh-in recorded by someone else
- **THEN** the export includes those newest entries exactly as the member's own
  history would show them
