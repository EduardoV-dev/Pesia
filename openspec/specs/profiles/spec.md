# profiles Specification

## Purpose
Covers the profile as an identity that exists independently of a login: owning a
profile, managing a profile for somebody else, dependent profiles that carry no goal,
the display unit, the display name and avatar, switching between the profiles one
person manages, and the rule that a profile is only ever exposed to the people who
manage it.

## Requirements

### Requirement: A signed-in user can own a profile

The system SHALL let a signed-in user create one profile of their own, SHALL link it
to that login, and SHALL not create a second one when the same person signs in again.

#### Scenario: First sign-in creates the profile

- **WHEN** a signed-in user completes onboarding without having a profile
- **THEN** a profile is created, linked to that login, and the user lands on the app home

#### Scenario: A returning signer

- **WHEN** a user who already owns a profile signs in again
- **THEN** no second profile is created and the user lands on the app home

#### Scenario: A profile linked to a login

- **WHEN** a profile is linked to a login
- **THEN** it is visible only to that person and to the people explicitly granted access to it

### Requirement: A profile can exist without a login

The system SHALL let a signed-in user create a profile for somebody else that has no
login attached, and SHALL treat that profile as reachable only from the device of the
people who manage it.

#### Scenario: Creating a profile for someone else

- **WHEN** a signed-in user creates a profile for another person
- **THEN** the profile is created with a display name, a unit and an optional target, and it has no login attached

#### Scenario: Signing into a managed profile

- **WHEN** anyone attempts to sign in as a profile that has no login
- **THEN** no credential exists for it and the attempt cannot succeed

#### Scenario: Where the profile appears

- **WHEN** a signed-in user opens the profile switcher
- **THEN** the managed profile is listed among the profiles that user manages and nowhere else

### Requirement: A dependent profile carries no goal

The system SHALL mark a dependent profile as trend-only and SHALL refuse to give it a
target, a progress percentage, a BMI or a ranking position.

#### Scenario: Creating a dependent profile

- **WHEN** a signed-in user creates a profile for a child
- **THEN** the profile is created as a dependent, with no login attached

#### Scenario: Refusing a target for a dependent

- **WHEN** a goal is requested for a dependent profile
- **THEN** the request is refused and no goal is stored

#### Scenario: What a dependent shows

- **WHEN** a dependent profile is opened
- **THEN** it offers a weight history and a trend direction only, with no target and no progress percentage

#### Scenario: Converting a dependent

- **WHEN** a dependent profile would be turned into a non-dependent one
- **THEN** the conversion is not offered and a new profile is created instead

#### Scenario: Turning on the BMI reference

- **WHEN** the BMI reference is requested for a dependent profile
- **THEN** the request is refused and no BMI data is stored or displayed for it

### Requirement: A profile carries its own unit

The system SHALL store every weight in kilograms, SHALL let a profile choose
kilograms or pounds for display and entry, and SHALL never rewrite stored history when
the unit changes.

#### Scenario: Choosing a unit

- **WHEN** a member sets their display unit to kilograms or to pounds
- **THEN** the choice is stored on the profile and the app shows and accepts values in that unit

#### Scenario: Switching units keeps the history

- **WHEN** a member changes their display unit
- **THEN** every stored weight is unchanged and only its presentation differs

### Requirement: A profile's name and avatar can be edited

The system SHALL let the people who manage a profile change its display name and
avatar, and SHALL reject a blank display name with a readable message.

#### Scenario: Editing the display name

- **WHEN** a member changes their display name to a non-blank value
- **THEN** the new name is stored and is the name other members see

#### Scenario: A blank display name

- **WHEN** a member submits a blank display name
- **THEN** the change is rejected with a readable message and the previous name is kept

### Requirement: A member can switch between the profiles they manage

The system SHALL let a signed-in user switch to any profile they manage, SHALL apply
the switch immediately, and SHALL remember which profile is active.

#### Scenario: Switching profile

- **WHEN** a signed-in user picks a different profile from the switcher
- **THEN** that profile becomes active immediately and the app names it as the profile being acted on

#### Scenario: Switching to a dependent profile

- **WHEN** a signed-in user switches to a dependent profile
- **THEN** the app shows that profile's constraints, with no target and no progress

#### Scenario: The switcher lists only managed profiles

- **WHEN** a signed-in user opens the switcher on a shared device
- **THEN** it lists exactly the profiles that user manages

### Requirement: A profile is only exposed to the people who manage it

The system SHALL filter every profile read on the server, and SHALL never send a
profile to a client that may not see it.

#### Scenario: Reading a profile you do not manage

- **WHEN** a signed-in user requests a profile that they do not manage
- **THEN** the request is refused and no profile data is returned

#### Scenario: An active profile that is no longer managed

- **WHEN** the remembered active profile is not among the profiles the user manages
- **THEN** the system falls back to a managed profile instead of using it

### Requirement: A new profile is private until it is shared

The system SHALL keep a newly created profile out of every group until its owner
joins one, and SHALL notify nobody when a profile is created.

#### Scenario: A newly created profile

- **WHEN** a member creates a profile
- **THEN** the profile is not visible in any group and no notification is sent

#### Scenario: Before the owner joins a group

- **WHEN** a group exists and the owner of a new profile has not joined it
- **THEN** the group does not show the profile

### Requirement: The login a profile belongs to always reaches it

The system SHALL let the login a profile is linked to read that profile in the app even
when the profile carries no explicit management link, and SHALL route every signed-in
member to exactly one of the onboarding and the app home.

#### Scenario: A profile without a management link

- **WHEN** a signed-in member's profile is linked to their login and has no management link
- **THEN** the app home resolves that profile as the active one and renders it

#### Scenario: A member with no profile at all

- **WHEN** a signed-in member has no profile
- **THEN** the app home sends them to the onboarding and the onboarding does not send
  them back

#### Scenario: No route cycle

- **WHEN** a signed-in member opens the app home or the onboarding
- **THEN** the member ends on exactly one of the two routes and the browser is never
  redirected between them

### Requirement: A profile can carry an optional private BMI reference

The system SHALL let a profile's managers store an optional height in centimetres and
a BMI opt-in flag that is off by default, SHALL collect the height only when the
member with a login opts in, SHALL keep both as private profile data, and SHALL let the
member turn the reference off again.

#### Scenario: The default state

- **WHEN** a profile is created
- **THEN** it carries no height and the BMI opt-in flag is off

#### Scenario: Opting in

- **WHEN** a member with a login enables the BMI reference
- **THEN** their height is collected as optional profile data and the opt-in flag is
  stored on

#### Scenario: Opting out

- **WHEN** the member turns the BMI reference off again
- **THEN** the value stops being displayed and the stored data keeps staying private
  to the profile

#### Scenario: Who edits it

- **WHEN** the height or the opt-in flag is changed
- **THEN** only the profile's managers can change it, and for a profile with a login
  the member's own consent governs the opt-in
