# Spec Delta

## Purpose

Covers installability and the notification client contract: the install affordance
and iOS guidance, the notification permission flow the user initiates, the web-push
subscription lifecycle between browser, client and server, and how the service
worker displays and routes notifications. Copy rules for the reminder content itself
live in the `reminders` capability; this capability guarantees that no notification
the app ever renders carries a weight or a verdict.

## ADDED Requirements

### Requirement: Installable app presentation

The system SHALL remain installable as a standalone app (`manifest` with
`display: standalone`, name and short name, icons in 192/512 sizes including a
maskable variant), and SHALL surface an install affordance from inside the app in
Spanish.

#### Scenario: Install affordance appears when offered

- **WHEN** the browser fires `beforeinstallprompt` on any screen
- **THEN** the app presents its own Spanish install affordance instead of the browser's default dialog, and launching it shows the native install prompt

#### Scenario: No prompt available

- **WHEN** the app is already installed, standalone, or the browser does not offer `beforeinstallprompt`
- **THEN** no install affordance appears in that environment

#### Scenario: iOS guidance

- **WHEN** the app runs in iOS Safari (no install prompt available)
- **THEN** the install experience shows Spanish guidance for "Añadir a la pantalla de inicio" instead of an install button

### Requirement: Notification opt-in is user-initiated per group

The system SHALL only request notification permission and create a subscription as a
direct consequence of the user opting in per group from the settings surface; it
SHALL never request permission on page load. The opt-in state SHALL be visible and
reversible from the same surface.

#### Scenario: Opting in

- **WHEN** an active group member turns reminders on in their group settings
- **THEN** the browser permission prompt runs at that moment; if permission is granted a web-push subscription is registered with the server bound to that group, and the toggle reflects the enabled state

#### Scenario: Permission denied

- **WHEN** the browser permission prompt is denied or already denied
- **THEN** no subscription is registered server-side and the surface explains in Spanish how to enable notifications from the browser settings

#### Scenario: Opting out

- **WHEN** a user with reminders on turns them off
- **THEN** the server removes their subscriptions for that group and the toggle reflects the disabled state; no further notification channel is sent for that group

### Requirement: Subscription lifecycle

The system SHALL store subscriptions keyed by push endpoint and owner,
SHALL accept multiple subscriptions per user (one device each), and SHALL treat a
push response of "gone" or "expired" as an instruction to delete that subscription.

#### Scenario: Two devices

- **WHEN** a user opted in registers from a phone and later from another device
- **THEN** both subscriptions exist for that user and each receives the reminder

#### Scenario: Expired endpoint

- **WHEN** a push delivery reports that an endpoint is no longer valid
- **THEN** that subscription is deleted and no retry is attempted against it

### Requirement: Authorization on subscribe endpoints

The subscribe and unsubscribe endpoints SHALL require an authenticated session and
SHALL only store or remove subscriptions for groups the user is an active member of.

#### Scenario: Not a member of the claimed group

- **WHEN** a signed-in user who is not an active member of a group attempts to register a subscription for it
- **THEN** the registration is refused with a Spanish validation message and nothing is stored

### Requirement: Service worker notification behavior

The service worker SHALL display received pushes as notifications with Spanish
copy, SHALL never render a weight value or any verdict language from a push payload,
and SHALL route a notification click into the app.

#### Scenario: Notification content

- **WHEN** a reminder push is received
- **THEN** the notification shows its Spanish title and body only, and the rendered text contains no weight, number with a red/green verdict or health advice

#### Scenario: Notification click

- **WHEN** the user taps a reminder notification
- **THEN** the focused app window opens if one exists, otherwise a new window opens into the app

#### Scenario: Malformed push payload

- **WHEN** a push arrives with no usable payload
- **THEN** the service worker ignores it without breaking or showing an error notification
