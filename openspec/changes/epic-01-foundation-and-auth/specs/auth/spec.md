# Spec Delta

## Purpose

Covers how a member signs in with Google, keeps that session across visits, signs out
completely, and is routed to onboarding the first time and to the app thereafter.

## ADDED Requirements

### Requirement: Members sign in with Google

The system SHALL authenticate a member through Google's OAuth consent flow and SHALL
present the sign-in action in Spanish as "Continuar con Google".

#### Scenario: Consent completed

- **WHEN** a signed-out member activates the sign-in action and completes Google's consent
- **THEN** the member is authenticated and lands on the authenticated app shell

#### Scenario: Consent cancelled or refused

- **WHEN** a signed-out member cancels Google's consent screen or Google returns an error
- **THEN** the member remains signed out and sees a readable Spanish message with no stack trace and no blank screen

#### Scenario: Already authenticated

- **WHEN** an authenticated member opens the sign-in page
- **THEN** the sign-in action is not shown and the member is redirected into the app

### Requirement: Sessions persist across visits

The system SHALL keep a member authenticated across browser sessions, and SHALL scope
each session to the device that created it.

#### Scenario: Returning the next day

- **WHEN** a member who signed in yesterday reopens the app
- **THEN** the member is still authenticated without signing in again

#### Scenario: A different browser on the same origin

- **WHEN** a member opens the application in a different browser on the same device
- **THEN** that browser is not signed in, because the session was not shared between browsers

#### Scenario: Expired session

- **WHEN** a member makes a request with an expired or invalid session
- **THEN** the member is redirected to the sign-in screen instead of seeing an error

### Requirement: Signing out ends the session on the server

The system SHALL destroy the session on the server when a member signs out, so that no
authenticated content can be recovered afterwards.

#### Scenario: Sign-out

- **WHEN** an authenticated member signs out
- **THEN** the server session is destroyed and the member is returned to the signed-out screen

#### Scenario: Back button after sign-out

- **WHEN** a member presses the browser back button after signing out
- **THEN** no authenticated content is shown

### Requirement: First-time signers land on onboarding

The system SHALL route a member who has never signed in before to onboarding, SHALL
route a member who has completed onboarding to the app home, and SHALL resume an
interrupted onboarding instead of restarting it.

#### Scenario: First sign-in

- **WHEN** a member completes authentication for the first time
- **THEN** the member lands on onboarding

#### Scenario: Returning after onboarding

- **WHEN** a member who completed onboarding signs in again
- **THEN** the member lands on the app home, not on onboarding

#### Scenario: Interrupted onboarding

- **WHEN** a member leaves onboarding halfway and returns
- **THEN** onboarding resumes from where it was left instead of starting over

### Requirement: Unauthenticated requests are refused server-side

The system SHALL verify the session on the server for every request that needs one and
SHALL NOT rely on the client to decide whether a member is signed in.

#### Scenario: Direct request to a protected route

- **WHEN** a signed-out member requests a protected route directly
- **THEN** the server redirects the member to the sign-in screen and no protected content is sent in the response body
