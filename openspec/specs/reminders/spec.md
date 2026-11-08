# reminders Specification

## Purpose

Covers the opt-in reminder pipeline: the daily scan that decides whose turn is due
and who is told about it, the per-recipient eligibility rule that combines write
right, name visibility and opt-in, the strict "names and turns, never weights" copy
bound (G7), push delivery and the Resend email fallback. This is the second-highest
privacy surface in the product after the board: every reminder payload is assembled
per recipient on the server.

## Requirements

### Requirement: Reminders are opt-in and per group

The system SHALL send reminders only to users who have opted in (per group), through
no channel for anyone else, and SHALL never treat having a subscription as consent
after the user has opted out.

#### Scenario: Reminders reach only opted-in users

- **WHEN** the daily scan finds due subjects in a group
- **THEN** only users who currently have reminders enabled for that group are considered as recipients, whether or not a delivery channel is available for them

#### Scenario: Opt-out is immediate

- **WHEN** a user opts out and the next scan runs
- **THEN** that user receives no reminder or email from it

### Requirement: The daily scan is secret-gated and timezone-aware

The system SHALL expose exactly one automated scan entry point, SHALL refuse it
without the authorized trigger secret, and SHALL evaluate each group in the group's
own timezone on a daily schedule.

#### Scenario: Unauthorized scan attempt

- **WHEN** the scan endpoint is called without the trigger secret
- **THEN** the call is refused and no notification is triggered

#### Scenario: One Morning per group timezone

- **WHEN** the daily scan runs for a group whose timezone is UTC-3 at its configured morning hour
- **THEN** due-ness is computed against that group's local day and local weekday anchor, so the same scan run answers differently for groups in different timezones

### Requirement: Whose turn is due by cadence, shared with the board's rule

The system SHALL deem a member's turn due exactly when the board's due rule says so:
a whole group-timezone day count since the member's last measured day (or their join
day when they have never weighed in) reaches the member's own cadence days, with the
group's weigh-in weekday anchoring a weekly fallback.

#### Scenario: Same rule as the board shows

- **WHEN** the board shows a member's turn as due on a day
- **THEN** the reminder pipeline considers that same member due the same day

#### Scenario: Anchor day for never-weighed members

- **WHEN** a member has no entry ever
- **THEN** their join day anchors the cadence countdown, matching the board

### Requirement: Reminders name turns, never weights (G7)

Every reminder — push notification body and email alike — SHALL name whose turn it
is and nothing else about the body: no weight value, no single-reading delta (G2),
no direction word, no progress percentage and no moralized language. A reminder to
the member's own turn SHALL use second person ("Tu turno"); one about another
profile SHALL name that profile ("Es el turno de X").

#### Scenario: Push copy bound

- **WHEN** a reminder notification is composed for a due member with weight-sharing visibility
- **THEN** it contains the turn plus the member's name, and contains no weight value

#### Scenario: The name is never extended by data

- **WHEN** a reminder is composed about a subject whose trend data the recipient could see
- **THEN** the reminder still carries no data, only the name and the turn

#### Scenario: Own turn

- **WHEN** the due subject is the recipient's own profile
- **THEN** the reminder addresses the recipient in second person and never names someone else's turn inside the same notification

### Requirement: Recipients combine logging right, name visibility and opt-in (G10, G8)

The system SHALL send a reminder naming subject S to a user only if, decided
per-recipient server-side: the user opted in for the group; a profile controlled by
that user is permitted to log for S by role or explicit grant; and that profile's read
of S at least shows S's name under the visibility rule. The user holding S's own
profile counts as a recipient for their own turn when S is not a dependent.

#### Scenario: Visibility gates the name in notifications

- **WHEN** a subject's visibility in the group is name-only, weight-only or private
- **THEN** only recipients whose viewer profile is granted that visibility receive a reminder naming that subject; a private subject is named to no one, and those users are omitted without any "you will not hear about X" signal (G8)

#### Scenario: Logging right without read right

- **WHEN** a logger may record a weight for S but cannot see S's name (private)
- **THEN** the pipeline never sends that logger a reminder naming S

#### Scenario: Read right without logging right

- **WHEN** a user can see S's name but no profile they control may log for S
- **THEN** the pipeline never sends that user a reminder naming S as their turn

#### Scenario: Dependent subjects

- **WHEN** a due subject is a dependent profile
- **THEN** the reminder goes to users whose profiles log for that dependent, naming the dependent; the dependent's own linked login, if any, is never treated as knowing their own turn

#### Scenario: One reminder per subject per user per day

- **WHEN** several loggers can log for the same due subject
- **THEN** a given user receives at most one reminder per subject per day, deduplicated by the pipeline

### Requirement: Delivery channels and tolerance

The system SHALL deliver the reminder as a web push when the recipient has an active
subscription, SHALL fall back to email via the configured mail provider for opted-in
recipients with no active subscription, and SHALL isolate delivery failures so that
one recipient's failure neither aborts the scan nor retries forever.

#### Scenario: Push preferred, email as fallback

- **WHEN** an opted-in recipient has an active subscription
- **THEN** they get the push notification and no email for the same reminder

#### Scenario: Email fallback

- **WHEN** an opted-in recipient has no active subscription or none is deliverable
- **THEN** the reminder is sent as an email with the same name-and-turn copy and the same visibility bound, when the recipient has an address to send to

#### Scenario: A failed delivery does not kill the scan

- **WHEN** one recipient's delivery fails (send error, unreachable channel)
- **THEN** the scan continues with the remaining recipients and the failure is recorded in the scan result without a retry loop

### Requirement: No new raw-data read path

The reminder pipeline SHALL read membership, role grants, log grants, visibility
settings and last-measured dates server-side through the existing data access
patterns, and SHALL NOT add any API route that returns raw membership plus raw
entries (G10).

#### Scenario: The only new client-facing endpoints

- **WHEN** the epic ships
- **THEN** the only new endpoints reachable by the app itself are the subscribe/unsubscribe pair and the secret-gated cron scan; no endpoint returns reminders.
