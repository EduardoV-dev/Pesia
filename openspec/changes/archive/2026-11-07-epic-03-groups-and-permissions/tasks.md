# Tasks

## 1. Schema and migration (US-3.1, US-3.13)

- [x] 1.1 Add `groups`, `group_memberships`, `can_log_for`, `group_settings` and
  `invites` to the Drizzle schema, with the unique pair `(group_id, profile_id)` on
  memberships, the composite primary key on `can_log_for` and the `source` column
  that separates a role preset from an explicit grant
- [x] 1.2 Apply the migration and verify `drizzle-kit migrate` builds the five tables
  on an up-to-date database
- [x] 1.3 Add test helpers that create a group with its Owner membership and its
  role permission rows, and verify the helpers leave the role matrix consistent

## 2. Domain vocabulary (US-3.6, US-3.9, US-3.10, US-3.11)

- [x] 2.1 Define the three roles, the four visibility levels, the four cadences and
  the two invitation kinds, with the Spanish wording the interface uses
- [x] 2.2 Verify the invitation code alphabet contains no `0`, `O`, `1`, `I` or `L`,
  and that a generated code is six characters long
- [x] 2.3 Verify a visibility level decides exactly what the group sees, and that a
  private level decides nothing at all

## 3. Group lifecycle (US-3.1, US-3.15)

- [x] 3.1 Implement group creation and verify an integration test shows the creator's
  profile holds the Owner role, that the group has its settings row, and that the
  group is not returned to anybody who is not a member
- [x] 3.2 Implement group deletion and verify an integration test shows the group,
  its memberships, its permissions, its invitations and its settings are gone
- [x] 3.3 Verify the deletion requires an explicit confirmation and that a member who
  is not an Owner cannot delete the group

## 4. Invitations (US-3.2, US-3.3, US-3.4, US-3.5)

- [x] 4.1 Implement invitation creation for both kinds and verify an integration test
  shows a link token is long and a code is six unambiguous characters
- [x] 4.2 Implement joining through an invitation and verify an integration test
  shows the member joins that group and no other, with the Member role and the
  default visibility
- [x] 4.3 Verify a revoked, expired or unknown invitation adds nobody and says so
  plainly
- [x] 4.4 Implement revocation and verify an integration test shows the invitation
  stops working immediately, that members who already joined keep their membership,
  and that a replacement invitation works

## 5. Roles (US-3.6, US-3.16)

- [x] 5.1 Implement the role change and verify an integration test shows a Logger
  may record for every member, a Member only for themselves, and that the role
  matrix in the permission table matches the roles afterwards
- [x] 5.2 Verify only an Owner can change a role, and that a Logger gains no
  management rights
- [x] 5.3 Verify the group reports that no recorder is assigned when no membership
  holds the Logger role, and that the Owner is prompted to appoint one
- [x] 5.4 Verify a dependent profile cannot be promoted above Member

## 6. Log permissions (US-3.7, US-3.8, US-3.17)

- [x] 6.1 Implement the grant and verify an integration test shows the granted
  member may record the subject's weight in that group and in no other group
- [x] 6.2 Implement the revoke and verify an integration test shows the next attempt
  is refused, and that the subject's own ability to record is unchanged
- [x] 6.3 Verify the write check reads only the log permission table and the read
  check reads only the visibility setting
- [x] 6.4 Write the integration test that runs every role against every visibility
  level and assert that a Logger can record a private member and still cannot read
  that member's history

## 7. Visibility and member settings (US-3.9, US-3.10, US-3.11)

- [x] 7.1 Implement the visibility change and verify an integration test shows the
  resolver returns no name, no weight and no trend to another viewer for a private
  member, and shows the latest weight without the trend for a latest-only member
- [x] 7.2 Implement the ranking opt-out and verify an integration test shows the
  member stays in the group and that a private member's opt-out reaches no viewer
- [x] 7.3 Implement the cadence and verify an integration test shows the cadence is
  stored per member and per group and never changes a permission
- [x] 7.4 Verify a member always sees their own data in full whatever visibility
  they set for the others

## 8. Membership lifecycle (US-3.13, US-3.14, US-3.16)

- [x] 8.1 Implement leaving a group and verify an integration test shows the
  membership closes at once, the person's permission rows are gone, and the past
  entries of the group's other members are untouched
- [x] 8.2 Implement removing a member and verify an integration test shows the
  membership closes at once and the removed member stops appearing on the sheet
- [x] 8.3 Verify an Owner cannot leave or be removed before transferring ownership,
  and that the group always keeps an Owner

## 9. Group settings (US-3.12)

- [x] 9.1 Implement the weigh-in weekday and time and verify an integration test
  shows the setting is stored, visible to every member, and refused to anybody who
  is not an Owner
- [x] 9.2 Verify a group with no weigh-in day set still shows a sensible default

## 10. Interface (US-3.1 – US-3.16)

- [x] 10.1 Build the group list with the creation form and the code entry, and
  verify a new group lands the creator in it as its Owner
- [x] 10.2 Build the group page with the member sheet, and verify a private member
  renders as private with no name and no numbers
- [x] 10.3 Build the invitation panel for the Owner, and verify it shows the link
  and the code, and that revoking takes effect at once
- [x] 10.4 Build the member's own permissions panel with the visibility level, the
  ranking opt-out, the cadence and the list of who may record their weight
- [x] 10.5 Build the group settings form for the weigh-in day and the time, and the
  owner's controls to change a role, remove a member, transfer ownership, leave and
  delete the group
- [x] 10.6 Build the invitation landing page, and verify it names the group and
  explains what joining means before the member confirms
- [x] 10.7 Verify every user-facing string added by this change is in Spanish,
  including validation and error messages, and that no copy states or implies a
  reason for a member's absence

## 11. Guardrail review and verification (US-3.1 – US-3.17)

- [x] 11.1 Verify guardrail G3 by an explicit copy review: the permission and group
  copy never moralises and never attaches a verdict to a number
- [x] 11.2 Verify guardrail G8 by an integration test: a private member renders as
  private and no reason for an absent member is ever inferred
- [x] 11.3 Verify guardrail G9 by an explicit review: a dependent profile has no
  target, no progress percentage, no ranking position and no BMI anywhere in the
  group
- [x] 11.4 Verify guardrail G10 by integration tests: every read of a group's
  members goes through the visibility resolver and the client never receives a
  member's data that the viewer may not see
- [x] 11.5 Run `pnpm run lint`, `pnpm run typecheck` and `pnpm run test` and verify
  all three pass with no errors
- [x] 11.6 Tick the Epic 3 acceptance list in
  `docs/backlog/epics/epic-03-groups-and-permissions/epic.md`

## Workflow follow-up

- Archive the change once the acceptance list is ticked and the checks pass.
- Verify the archived result leaves `openspec/specs/` describing the shipped
  behaviour.
- Commit the epic on `development` with a conventional commit message.
