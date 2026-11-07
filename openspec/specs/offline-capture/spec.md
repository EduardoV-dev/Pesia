# offline-capture Specification

## Purpose

Entry capture survives a dead connection: the sheet records with no network, work is
queued locally, and the queue flushes into the server exactly once. This capability owns
the offline write queue, offline snapshot reads, the flush semantics, and the honest
queued/synced UI states.

## Requirements

### Requirement: Offline entry form

The weigh-in sheet **SHALL** be usable with no network connection: saves produce a local
queued entry, the UI tells the member the entry is queued, and record-for-another-profile
is available the same way as online, subject to the same permission rules once it
reaches the server.

#### Scenario: Grandma's house, no wifi

- **WHEN** a recorder records weigh-ins for several people with the device offline
- **THEN** every save is stored locally, announced as queued, and no save blocks or
  fails on the missing connection

### Requirement: Offline snapshot reads

The sheet and a member's own history **SHALL** remain browsable offline from the last
cached snapshot of entry data, and the UI **SHALL** make clear the snapshot may be
stale.

#### Scenario: Opening the app offline

- **WHEN** a member opens the app with no connection
- **THEN** they can view the cached sheet and their cached history and record more
  weigh-ins

### Requirement: Exactly-once flush

A queued entry **SHALL** sync to the server as an idempotent upsert keyed by the
client-generated entry id, so it syncs exactly once no matter how many times the queue
is flushed or retried. The queue **SHALL** keep works-in-flight and cannot duplicate an
entry.

#### Scenario: Flaky connection, retried flush

- **WHEN** the flush of the queue fails after the server has already accepted an entry,
  and is retried on reconnect, app open, or Background Sync
- **THEN** the server stores one entry for that id, not one per flush attempt
- **AND** the queue stops counting the entry as pending

### Requirement: Flush triggers

The queue **SHALL** flush when the connection returns, when the app opens, and where
the browser supports it (Chrome/Android) also via Background Sync. Browsers without
Background Sync (iOS Safari) **SHALL** still flush on reconnect and app open.

#### Scenario: The app flushes itself while the user keeps weighing

- **WHEN** the device regains connectivity while the user is still recording weigh-ins
- **THEN** pending entries sync without user action and the queue is emptied of them

### Requirement: Server re-checks permissions at flush time

The sync endpoint **SHALL** re-check log permission server-side for every queued entry
at flush time and refuse an entry whose logger lacks permission for its subject in its
group. The refusal **SHALL** surface to the member in Spanish with the entry marked as
failed, and the failed entry **SHALL** stay available for correction — the queue
**SHALL** not silently drop it.

#### Scenario: A queued entry the server must refuse

- **WHEN** a queued entry reaches the server after the logger's permission for that
  subject was revoked
- **THEN** the server refuses the entry, keeps it visible to the member as failed with a
  fetchable Spanish reason, and does not store it

### Requirement: Honest queued and synced states

The UI **SHALL** state honestly whether an entry is queued, synced, or failed. A queued
entry that later syncs **SHALL** confirm its state change; a failed entry **SHALL** show
the reason and an available correction path.

#### Scenario: The queue confirms the save

- **WHEN** a queued entry successfully syncs
- **THEN** its visible state changes from queued to saved in the UI

### Requirement: Offline edits and deletions replay

An offline edit or deletion of an entry the user is permitted to change **SHALL** be
queued and replayed with the same idempotent, append-safe semantics as creations: the
replayed action **SHALL** target the same entry id and re-verify permission on the
server.

#### Scenario: Correcting a typo with no signal

- **WHEN** the owner corrects an entry's weight while offline
- **THEN** the change is queued, announced as queued, and applied server-side when the
  connection returns, attributed to the editor at the time it was replayed
