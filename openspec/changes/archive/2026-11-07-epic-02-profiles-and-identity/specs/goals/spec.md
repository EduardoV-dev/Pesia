# Spec Delta

## Purpose

Covers the goal a profile carries: the direction derived from the person's own target,
the maintain band, the baseline a goal starts from, the reset that happens when the
target changes, and the progress calculation that stays inside 0–100% and never
moralises the person it measures.

## ADDED Requirements

### Requirement: A goal's direction is derived from the target

The system SHALL derive a goal's direction by comparing the target with the current
weight, and SHALL never assume a direction the person did not choose through that
comparison.

#### Scenario: A target below the current weight

- **WHEN** a member sets a target below their current weight
- **THEN** the goal's direction is "lose"

#### Scenario: A target above the current weight

- **WHEN** a member sets a target above their current weight
- **THEN** the goal's direction is "gain"

#### Scenario: No target at all

- **WHEN** a member chooses not to set a target
- **THEN** the profile carries no goal and its trend still works

### Requirement: The app never suggests a target

The system SHALL offer the target as an empty choice and SHALL never propose a
weight, never assume the goal is to lose weight, and never frame any goal as better
than another.

#### Scenario: Opening the goal form

- **WHEN** a member opens the goal form
- **THEN** the target field starts empty and no suggested weight is offered

#### Scenario: Gaining weight as a goal

- **WHEN** a member's direction is "gain"
- **THEN** the app treats it as a first-class goal and never discourages it

### Requirement: A maintain goal is expressed as a band

The system SHALL let a member choose "maintain" explicitly and SHALL store the goal as
a target weight plus a band width around it.

#### Scenario: Setting a maintain band

- **WHEN** a member chooses to maintain, a target and a band width
- **THEN** the goal stores the target and the band

#### Scenario: Inside the band

- **WHEN** the current weight is inside the band
- **THEN** the progress reads 100%

#### Scenario: Outside the band

- **WHEN** the current weight is outside the band
- **THEN** the app reports the distance to the band without moralising it

### Requirement: Changing a target resets the goal

The system SHALL supersede the previous goal when the target changes, SHALL keep the
previous goal as history, and SHALL reset the baseline to the weight at the moment of
the change so that progress restarts at 0%.

#### Scenario: Changing the target

- **WHEN** a member changes their target
- **THEN** a new goal becomes active and the previous one is kept as history

#### Scenario: The baseline after a change

- **WHEN** a member changes their target
- **THEN** the baseline is reset to their weight at that moment and progress restarts at 0%

### Requirement: Progress stays within 0 and 100

The system SHALL report progress as a percentage that never falls below 0% and never
rises above 100%, for every direction including maintain.

#### Scenario: Moving past the target

- **WHEN** the current weight has passed the target in the goal's direction
- **THEN** the progress reads 100% and never more than 100%

#### Scenario: Moving away from the target

- **WHEN** the current weight is further from the target than the baseline was
- **THEN** the progress never reads below 0%

### Requirement: Progress is worded relative to the goal

The system SHALL describe progress in words that are relative to the person's own
goal, and SHALL NOT accompany a weight or a percentage with a verdict.

#### Scenario: Moving toward the goal

- **WHEN** the app describes a member whose weight is moving toward the goal
- **THEN** the wording says they are moving toward their own goal

#### Scenario: A number on its own

- **WHEN** the app shows a weight or a percentage
- **THEN** no good or bad verdict accompanies it and no colour alone carries the meaning

### Requirement: Only a managed profile can hold a goal

The system SHALL allow a goal only on a profile that is not a dependent, and SHALL
refuse to create one for a dependent profile.

#### Scenario: A goal for a dependent

- **WHEN** a goal is created for a dependent profile
- **THEN** the request is refused and no goal is stored

#### Scenario: A goal for a managed adult

- **WHEN** a goal is created for a managed profile that is not a dependent
- **THEN** the goal is stored for that profile
