# Spec Delta

## Purpose

Covers the final product audit: the ten guardrails as a recorded checklist with
executable checks, the accessibility pass over every screen, and the legal and trust
surfaces in Spanish. A feature that leaks data is not finished no matter how good the
rest is.

## ADDED Requirements

### Requirement: The guardrail audit is recorded and executable where possible

Every guardrail G1–G10 SHALL have a recorded audit entry naming its owner and its
verification method, in a versioned document inside the repository. Each guardrail
SHALL be verified by test where possible and by reading the rendered screen where it
is a matter of copy. The board's server-side visibility filtering (G10) SHALL be
verified by the full integration test matrix running as a gate.

#### Scenario: The audit runs as part of the suite

- **WHEN** the test suite runs
- **THEN** every guardrail that admits an executable check is asserted by it — no
  ranking by body magnitude, no raw single-reading delta in any view model, no BMI
  in any board response for another member, no weight value in any reminder payload,
  no target/progress/rank/BMI in any dependent response, and the G10 visibility
  matrix green

#### Scenario: The checklist records the verdict

- **WHEN** the audit document is read
- **THEN** each of the ten guardrails states its owner, its verification method and
  its result, and the copy-bound guardrails cite the screens reviewed

### Requirement: Every screen is operable and readable

The app SHALL be fully operable with a keyboard alone; charts, progress bars and the
weigh-in sheet SHALL expose accessible names and text alternatives; focus SHALL move
predictably when switching profiles, closing sheets and navigating; no screen SHALL
require horizontal scrolling at 360 px; and contrast SHALL meet WCAG AA in every
shipped theme.

#### Scenario: Keyboard-only use

- **WHEN** a member uses only the keyboard across onboarding, the weigh-in sheet,
  the board, the trend and the account surfaces
- **THEN** every action is reachable and completable, with visible focus

#### Scenario: Assistive technology can read the visuals

- **WHEN** a screen reader reaches the trend chart, a progress indicator or the
  weigh-in sheet
- **THEN** each exposes its accessible name and a text alternative conveying the
  goal-relative direction, not a bare number with a verdict

#### Scenario: The smallest screen

- **WHEN** any screen is viewed at 360 px width
- **THEN** the layout holds without horizontal scrolling

### Requirement: The legal and trust surfaces exist in Spanish

The app SHALL provide a privacy policy and terms of use, in plain language and in
Spanish, that describe the app's actual behaviour: what is collected, what is shared,
what is never collected, and how to delete. The app SHALL state plainly that it is a
tracking tool and not a medical device, and that BMI is a screening measure.

#### Scenario: The privacy policy matches reality

- **WHEN** a member reads the privacy policy
- **THEN** it describes what the app actually collects and shares, states what it
  never collects, and explains how to export and how to delete

#### Scenario: The plain statement

- **WHEN** the legal surfaces are read
- **THEN** they state the app is a tracking tool and not a medical device, and that
  BMI is only a screening measure
