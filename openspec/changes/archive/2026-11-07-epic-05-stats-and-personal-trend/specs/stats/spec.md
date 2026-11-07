# Spec Delta

## Purpose

Covers the personal trend: the pure math that turns entries into a smoothed line, a
goal-relative direction that refuses false alarms, a percentage change against the
active baseline, and the optional private BMI reference — plus the member-facing trend
screen that displays all of it without a single moral verdict.

## ADDED Requirements

### Requirement: A member sees a smoothed trend line

The system SHALL compose the member's own entries into a trend that draws a rolling
7-day mean as the line with the individual readings visible as points behind it, SHALL
keep the chart readable at a 360-pixel viewport, and SHALL pair it with an accessible
text summary of the trend for screen readers.

#### Scenario: Reading the line

- **WHEN** a member with several readings opens their trend screen
- **THEN** the 7-day rolling mean is drawn as the line and the individual readings
  appear as points behind it

#### Scenario: A screen reader

- **WHEN** the trend screen is read with a screen reader
- **THEN** the trend is summarised in accessible text, not only in graphics

### Requirement: Direction is measured against the member's own goal

The system SHALL state the trend direction relative to the member's own target, so the
same physical change produces opposite wording for two members with opposite goals, and
SHALL never attach "gained" or "lost", a verdict, or a colour to the words.

#### Scenario: Two members, one movement

- **WHEN** two members with opposite goal directions both rise by the same amount
- **THEN** one reads "moving toward your goal" and the other reads "moving away from
  your goal", and each statement is correct for that member

#### Scenario: The words on the screen

- **WHEN** a direction is shown
- **THEN** its wording is goal-relative, with no verdict and no colour carrying a
  good or bad meaning

### Requirement: Percentage change is measured against the active baseline

The system SHALL show the member's percentage change of body mass since the baseline
of their current goal, SHALL name which baseline it uses, and SHALL label the value as
a change since that baseline rather than as progress. After a target change the same
new baseline applies to the percentage.

#### Scenario: The baseline in view

- **WHEN** the percentage change is shown
- **THEN** the label names the baseline it is measured from

#### Scenario: After changing the target

- **WHEN** a member changes their goal target
- **THEN** the percentage change is computed from the new baseline

### Requirement: A change below the deadband reports stable

The system SHALL report the direction as "stable" whenever the movement is below the
deadband of 0.3 kg per week, SHALL report a direction only for a sustained movement
beyond it, and SHALL define the threshold once as a named constant covered by unit
tests that pin a flat week to "stable".

#### Scenario: A noisy week

- **WHEN** a member's trend moves less than the deadband across the comparison window
- **THEN** the screen says they are stable instead of showing a direction

#### Scenario: A real movement

- **WHEN** a member's trend moves beyond the deadband
- **THEN** a direction is reported

#### Scenario: The threshold is one number

- **WHEN** the deadband is referenced anywhere in the code
- **THEN** it resolves to a single named constant, not scattered literals

### Requirement: The trend refuses to interpolate gaps

The system SHALL render missing weeks as gaps and SHALL NOT interpolate readings into
a continuous line, SHALL report a direction only when there is enough data on both
sides of the comparison window, and SHALL say plainly that there is insufficient data
while showing what does exist.

#### Scenario: A member disappears for a while

- **WHEN** a member returns after weeks without readings
- **THEN** the trend shows the gap and never a line across it

#### Scenario: Not enough data

- **WHEN** the entries leave insufficient data on either side of the comparison window
- **THEN** the screen states there is insufficient data and shows the readings that
  exist, with no direction

### Requirement: A member without a target gets a full view

The system SHALL show trend, direction and percentage change to a member who has set
no target, and SHALL NOT show an empty progress bar, a "0% toward goal" or any framing
that a missing target is a deficiency.

#### Scenario: No target set

- **WHEN** a member with no goal opens their trend screen
- **THEN** the trend, the direction and the percentage change are visible and no
  progress bar is rendered

#### Scenario: Nothing implies failure

- **WHEN** the no-target view is rendered
- **THEN** no copy presents the absence of a target as something missing or failed

### Requirement: A dependent profile is trend-only

The system SHALL show a dependent profile only weight history, direction and
stability, and SHALL NOT expose a target, a progress percentage or a BMI for it.

#### Scenario: Opening a dependent's trend

- **WHEN** a guardian opens a dependent profile's trend
- **THEN** history, direction and stability are shown and no target, progress or BMI
  surface exists on it

### Requirement: No raw single-reading delta is displayed

The system SHALL NOT display the difference between two individual readings on any
surface of its screens; only the smoothed trend, the deadband direction, the percentage
change against the baseline and the goal progress are shown.

#### Scenario: Looking for a delta

- **WHEN** any trend screen is rendered
- **THEN** no comparison between two individual readings appears anywhere on it

### Requirement: BMI is an opt-in, private screening reference

The system SHALL keep BMI off until the member actively turns it on, SHALL show the
value only on the member's own trend screen once enabled, SHALL frame it as a
screening measure with a pointer to discuss it with a doctor, SHALL show no category
label, no colour coding and no pass/fail threshold, and SHALL hide the value again when
the member turns it off.

#### Scenario: The screen before opting in

- **WHEN** a member who never opted in opens their trend screen
- **THEN** no BMI value or surface appears

#### Scenario: Turning it on

- **WHEN** a member enables the BMI reference
- **THEN** the screen asks for their height and then shows the value with the
  screening framing and the doctor pointer

#### Scenario: Turning it off

- **WHEN** the member disables the BMI reference
- **THEN** the value stops being displayed

#### Scenario: What the number is dressed in

- **WHEN** the BMI value is shown
- **THEN** no category label is attached, no colour marks it and no threshold presents
  it as a pass or a fail

### Requirement: Trend reads are filtered server-side

The system SHALL assemble every trend it displays from the server-side visibility
filtering the product applies on every read, and SHALL NOT ship raw entry rows to a
client the filtering does not grant.

#### Scenario: A viewer with no standing

- **WHEN** a signed-in member opens a trend they have no standing to see
- **THEN** the request is answered without exposing weights or entries, from the state
  filtering produces

#### Scenario: A guardian of a managed profile

- **WHEN** a member opens the trend of a profile they manage
- **THEN** the trend is composed from server-side filtered reads
