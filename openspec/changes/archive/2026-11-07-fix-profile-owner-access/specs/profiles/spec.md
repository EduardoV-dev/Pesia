# Spec Delta

## ADDED Requirements

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
