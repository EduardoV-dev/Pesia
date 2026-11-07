# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
