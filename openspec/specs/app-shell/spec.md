# app-shell Specification

## Purpose
Covers the application's frame: the layout and navigation between public and
authenticated areas, the visual system it is built on, its behaviour on a phone and
with a keyboard, the PWA manifest stub, and the validation of the environment it needs
to start.

## Requirements

### Requirement: The app has a single shell

The system SHALL render every route inside one shell consisting of a header, a content
area and a theme, and SHALL move between the public area, onboarding and the app home
without a full page reload.

#### Scenario: Moving between areas

- **WHEN** a member navigates from the app home to a settings screen and back
- **THEN** the shell, header and theme remain in place across the navigation

#### Scenario: A signed-out visitor

- **WHEN** a signed-out member opens the application
- **THEN** the shell renders with the public navigation and no member-only actions

### Requirement: The shell works at 360 pixels

The system SHALL render without horizontal scrolling at a viewport width of 360 pixels,
and SHALL keep the primary actions reachable with one thumb.

#### Scenario: Narrow viewport

- **WHEN** the shell is rendered at 360 pixels wide
- **THEN** no element overflows the viewport and no horizontal scrollbar appears

#### Scenario: Primary action on a phone

- **WHEN** the shell is rendered on a phone-sized viewport
- **THEN** the primary action sits within thumb reach of the bottom of the screen

### Requirement: Every interactive element is operable by keyboard

The system SHALL make every interactive element reachable in a logical order, SHALL
give each one an accessible name, and SHALL keep focus visible and never trapped.

#### Scenario: Keyboard-only sign-in

- **WHEN** a member completes the sign-in flow using only the keyboard
- **THEN** every step is reachable and operable, and focus is visible at each stop

#### Scenario: Focus order

- **WHEN** a member presses Tab repeatedly through a screen
- **THEN** focus moves through the interactive elements in a logical reading order

### Requirement: The shell has light and dark themes

The system SHALL offer a light and a dark theme, and SHALL keep text legible in both.

#### Scenario: Switching theme

- **WHEN** a member switches the theme
- **THEN** the shell, its surfaces and its text update together and remain legible

### Requirement: The application is installable-shaped

The system SHALL expose a web application manifest declaring a standalone display mode,
a name, a short name and a theme colour.

#### Scenario: Manifest request

- **WHEN** a browser or installer requests the application manifest
- **THEN** the manifest is served with `display: "standalone"` and the application's name

### Requirement: Missing configuration stops the application clearly

The system SHALL validate its required environment at startup and SHALL fail with a
Spanish message naming the missing variable rather than starting in a broken state.

#### Scenario: Missing database URL

- **WHEN** the application starts without `DATABASE_URL`
- **THEN** startup fails with a message naming `DATABASE_URL`

#### Scenario: Missing OAuth credentials

- **WHEN** the application starts without `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`
- **THEN** startup fails with a message naming the missing variable

### Requirement: The visual system is the pinned peach direction

The system SHALL render its surfaces with the pinned visual direction: a warm peach
canvas, pure-white large-radius cards, one saturated orange accent, near-black ink,
and dotted-grid plot fields. The accent marks data and selection only and SHALL NOT be
used to signal a good or bad outcome.

#### Scenario: Rendering a data surface

- **WHEN** a surface renders a value and its trend
- **THEN** the value is set in the heavy grotesk numerals, the trend is drawn as an
  orange sparkline with hollow dot markers over a dotted-grid field, and no second
  accent colour appears

#### Scenario: Direction wording

- **WHEN** a surface states which way a member is moving
- **THEN** the wording is goal-relative — "Moviendo hacia tu objetivo", "Estable" or
  "Alejándote de tu objetivo" — and no red or green verdict accompanies the number

### Requirement: The database schema is reproducible from one command

The system SHALL define its schema in code and SHALL provide a migration command that
builds the full schema on an empty database and is a no-op on an up-to-date one.

#### Scenario: Empty database

- **WHEN** the migration command runs against an empty database
- **THEN** every table, column, index and foreign key the application expects exists

#### Scenario: Up-to-date database

- **WHEN** the migration command runs a second time against an up-to-date database
- **THEN** no further changes are applied
