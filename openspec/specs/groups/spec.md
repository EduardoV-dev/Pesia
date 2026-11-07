# groups Specification

## Purpose
Covers the closed group: how one is created, how an invitation opens it, who belongs
to it, what a role means inside it, how a membership ends, and the settings the
group reads to know when the family weighs in.

## Requirements

### Requirement: A group is created by a member who becomes its Owner

The system SHALL let a signed-in member create a group, SHALL make that member's
active profile its Owner, and SHALL make the group reachable only through an
invitation.

#### Scenario: Creating a group

- **WHEN** a member creates a group with a name
- **THEN** the group exists and the member's profile holds the Owner role in it

#### Scenario: A group that nobody else can find

- **WHEN** a group exists
- **THEN** no route lists it, no route searches it and no public URL resolves it

### Requirement: An invitation opens the group and nothing else

The system SHALL let a member join a group through an invitation only, SHALL add the
member to that group and to no other, and SHALL refuse an invitation that is invalid,
revoked or expired.

#### Scenario: Joining with a link

- **WHEN** a member opens a valid invitation link and confirms
- **THEN** the member's profile joins that group and no other group

#### Scenario: Joining with a code

- **WHEN** a member enters a valid six-character code
- **THEN** the member's profile joins that group and no other group

#### Scenario: An invitation that no longer works

- **WHEN** a member opens a revoked, expired or unknown invitation
- **THEN** the member is told plainly that it does not work and is added to nothing

#### Scenario: What joining means, before joining

- **WHEN** a member opens a valid invitation
- **THEN** the member is shown the group name and what joining means before confirming

### Requirement: An invitation can be revoked

The system SHALL let an Owner revoke an invitation, SHALL make it unusable
immediately, SHALL keep the memberships that were created through it, and SHALL let
the Owner issue a replacement.

#### Scenario: Revoking a link

- **WHEN** an Owner revokes an invitation link
- **THEN** opening that link no longer adds anybody

#### Scenario: Members who already joined

- **WHEN** an Owner revokes an invitation that people already used
- **THEN** those people keep their membership

#### Scenario: A replacement

- **WHEN** an Owner issues a new invitation after revoking the old one
- **THEN** the new invitation works

### Requirement: Only an Owner manages the group

The system SHALL let only an Owner publish or revoke invitations, change a role,
remove a member, set the group's settings and delete the group.

#### Scenario: A member tries to change a role

- **WHEN** a member who is not an Owner tries to promote somebody
- **THEN** the request is refused and no role changes

#### Scenario: A Logger tries to publish an invitation

- **WHEN** a Logger tries to create an invitation
- **THEN** the request is refused and no invitation is created

### Requirement: Roles are Owner, Logger and Member

The system SHALL offer exactly three roles, SHALL let an Owner move a member
between them, and SHALL derive what each role may do from a single permission
table rather than from a second rule set.

#### Scenario: Promoting a member to Logger

- **WHEN** an Owner promotes a member to Logger
- **THEN** that member may record a weight for every member of the group

#### Scenario: A Logger manages nothing

- **WHEN** a Logger is in the group
- **THEN** the Logger cannot publish an invitation, change a role or delete the group

#### Scenario: A Member records only their own weight

- **WHEN** a member holds the Member role
- **THEN** the member may record their own weight and nobody else's, unless the
  subject grants it explicitly

### Requirement: A group always keeps an Owner

The system SHALL refuse to remove or let leave the last Owner of a group, and SHALL
require an ownership transfer first.

#### Scenario: An Owner tries to leave

- **WHEN** an Owner tries to leave a group they own
- **THEN** the request is refused and the group still has its Owner

#### Scenario: An Owner tries to remove another Owner

- **WHEN** an Owner tries to remove the only other Owner
- **THEN** the request is refused and the group still has an Owner

### Requirement: A membership ends by leaving or by being removed

The system SHALL close a membership immediately when a member leaves or is removed,
SHALL keep the person's past entries in the group's history, and SHALL say so before
the action is confirmed.

#### Scenario: Leaving a group

- **WHEN** a member leaves a group
- **THEN** their membership is closed at once and their past entries stay in the
  group's history

#### Scenario: Being removed

- **WHEN** an Owner removes a member
- **THEN** the membership is closed at once, the member stops appearing on the
  weigh-in sheet and their past entries stay in the group's history

#### Scenario: What the confirmation says

- **WHEN** a member is about to leave or be removed
- **THEN** the confirmation states plainly that their past entries remain

### Requirement: A closed membership grants nothing

The system SHALL stop a member's permissions over the group the moment the
membership closes, including the permission to record other people's weight.

#### Scenario: The recorder leaves

- **WHEN** the last Logger leaves a group
- **THEN** the group shows that no recorder is assigned and prompts the Owner to
  appoint one, and the departed Logger can no longer record anything

### Requirement: The group owns a weigh-in day

The system SHALL let an Owner set the weekday and the optional time the group weighs
in, SHALL show the setting to every member, and SHALL offer a sensible default when
no day has been set.

#### Scenario: Setting the weigh-in day

- **WHEN** an Owner sets a weekday and a time
- **THEN** every member of the group sees that day and time

#### Scenario: The default

- **WHEN** no weigh-in day has been set
- **THEN** the group shows the default weekday rather than an empty state

#### Scenario: Only an Owner sets it

- **WHEN** a member who is not an Owner tries to set the weigh-in day
- **THEN** the request is refused and the setting is unchanged

### Requirement: A group can be deleted for good

The system SHALL let an Owner delete a group, SHALL require an explicit confirmation
that names the group, SHALL remove the group with its memberships, its entries and
its settings, and SHALL say that the action cannot be undone.

#### Scenario: Deleting a group

- **WHEN** an Owner confirms the deletion of a group by name
- **THEN** the group and everything that belongs to it are gone and the action cannot
  be undone

#### Scenario: Deleting without confirming

- **WHEN** a deletion request does not carry the explicit confirmation
- **THEN** the group is untouched

#### Scenario: A member tries to delete the group

- **WHEN** a member who is not an Owner tries to delete the group
- **THEN** the request is refused and the group survives
