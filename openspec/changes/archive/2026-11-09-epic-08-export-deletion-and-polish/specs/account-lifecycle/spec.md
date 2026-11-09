# Spec Delta

## Purpose

Covers how a membership ends: a member deleting their own account, with the
deliberate asymmetry between their data and other people's data, and a guardian
removing a dependent profile. Both paths require explicit confirmation and state
their consequences before the member commits.

## ADDED Requirements

### Requirement: A member can delete their account

The system SHALL allow a signed-in member to delete their account from the account
surface behind an explicit confirmation. Deletion SHALL destroy the login and its
sessions, delete the member's own profile, and delete the entries recorded about
that profile. After deletion, the member cannot sign back in.

#### Scenario: Deleting the account

- **WHEN** a member confirms account deletion
- **THEN** their login, sessions, own profile, goals and the entries recorded about
  them are deleted, and a later sign-in attempt cannot restore or reach the account

#### Scenario: Confirmation is required

- **WHEN** the member starts the deletion flow
- **THEN** nothing is deleted until they explicitly confirm

### Requirement: Deletion keeps other people's data

Entries the member recorded about other people SHALL survive the member's account
deletion, because those are those people's data. The attribution SHALL persist with
the legacy indicator the entries spec already requires, and the group SHALL see the
member's departure — their absence from the member list, their past entries still
attributed — without any reason being stated anywhere.

#### Scenario: The family record survives

- **WHEN** the recorder of the family's weigh-ins deletes their account
- **THEN** the entries they recorded about other people remain in the groups'
  history, still attributed to them as a legacy author, and the member list no
  longer shows them

#### Scenario: No reason is ever given

- **WHEN** any member of the group observes the departure
- **THEN** the app shows the departure as a plain fact and never states or infers a
  reason for it

### Requirement: Deletion is explained before confirmation

Before a member confirms account deletion, the app SHALL show a plain-language list
of what is removed and what is kept, using the same words as the rest of the app,
and the member SHALL be able to cancel and lose nothing.

#### Scenario: The informed choice

- **WHEN** the member opens the account deletion flow
- **THEN** the screen lists in plain Spanish what disappears and what stays before
  any confirm control can act, and cancelling changes nothing

### Requirement: A guardian can remove a dependent profile

The guardian of a managed profile SHALL be able to remove it behind an explicit
confirmation. After removal, the profile SHALL stop appearing on the weigh-in sheet,
SHALL not be recordable against, and SHALL be excluded from due computations. The
history already seen by others SHALL remain seen — removal stops future recording,
it does not rewrite the past.

#### Scenario: Removing the dependent

- **WHEN** a guardian confirms removing a dependent profile they manage
- **THEN** that profile leaves the weigh-in sheet, cannot receive new entries, and
  no reminder or due computation names it again

#### Scenario: The past stays seen

- **WHEN** the dependent's entries were already visible to other members in the
  groups' history
- **THEN** those entries remain visible there after the removal

#### Scenario: Only a guardian can remove

- **WHEN** a member who does not manage the profile attempts to remove it
- **THEN** the request is refused server-side
