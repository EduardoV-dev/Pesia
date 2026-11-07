# Tasks

## 1. Schema and migration (US-2.1, US-2.6, US-2.7)

- [x] 1.1 Add `profile_managers` and `goals` to the Drizzle schema, replace `profiles_user_id_unique` with a partial unique index on a non-null `user_id`, and verify `drizzle-kit generate` emits the create/drop statements
- [x] 1.2 Apply the migration and verify `drizzle-kit migrate` builds the new tables and indexes on an up-to-date database
- [x] 1.3 Add test helpers that create a managed profile and a dependent profile for a test user, and verify the helpers insert the manager row and leave `user_id` null

## 2. Unit and goal domain logic (US-2.2, US-2.3, US-2.4, US-2.5)

- [x] 2.1 Write the kilogram-to-display and display-to-kilogram conversion functions and verify unit tests cover kg, lb, and the round trip
- [x] 2.2 Write the direction derivation function and verify unit tests cover lose, gain, and the rule that maintain is never derived
- [x] 2.3 Write the goal progress function and verify unit tests cover progress at 0%, at 100%, above the target, a maintain goal inside the band, and a maintain goal outside the band
- [x] 2.4 Verify the progress function never returns a value below 0 or above 100 for any input

## 3. Profile server layer (US-2.1, US-2.6, US-2.7, US-2.9, US-2.10)

- [x] 3.1 Implement `getManagedProfiles` as the only function that returns more than one profile, and verify an integration test shows it returns the caller's own profile plus the managed profiles and no profile of anybody else
- [x] 3.2 Implement `getProfileForManager` and verify an integration test shows it returns null for a profile the caller does not manage
- [x] 3.3 Implement profile creation for self, managed and dependent profiles and verify an integration test shows a dependent profile is created without a login, without a goal and with a manager row
- [x] 3.4 Implement the profile edit action and verify an integration test shows the display name and avatar change, the unit change leaves stored weights untouched, and a blank display name is rejected with a Spanish message
- [x] 3.5 Replace `getProfileByUserId` with the self-profile lookup and verify the onboarding and home routes still find the signed-in user's own profile

## 4. Goal server layer (US-2.3, US-2.4, US-2.5, US-2.7)

- [x] 4.1 Implement goal creation and verify an integration test shows the direction is derived from the target, the baseline is the submitted current weight, and the goal is stored in kilograms
- [x] 4.2 Implement goal change and verify an integration test shows the previous goal is kept as history, the new goal is active, and the baseline is reset to the current weight
- [x] 4.3 Verify the server refuses a goal for a dependent profile and that no goal row is written
- [x] 4.4 Verify the server refuses to manage a goal on a profile the caller does not manage

## 5. Active profile and switching (US-2.8)

- [x] 5.1 Implement the active-profile cookie writer and reader, and verify the reader falls back to a managed profile when the cookie names a profile the caller does not manage
- [x] 5.2 Implement the switch action and verify an integration test shows the switch applies immediately and that a request naming an unmanaged profile is rejected
- [x] 5.3 Verify every read of the active profile goes through the management check, so the client never receives a profile it may not see

## 6. Interface (US-2.1, US-2.2, US-2.6, US-2.7, US-2.8, US-2.9)

- [x] 6.1 Build the profile switcher in the app header and verify it lists only the profiles the signed-in user manages, each with an unambiguous label
- [x] 6.2 Build the new-profile form for a managed or dependent profile and verify a dependent profile offers no target and no progress
- [x] 6.3 Build the goal form and verify the target field starts empty, that maintain offers a band width, and that the derived direction is shown after saving
- [x] 6.4 Build the profile editor and verify it shows the current display name, avatar and unit, and rejects a blank display name with a readable message
- [x] 6.5 Verify every user-facing string added by this change is in Spanish, including validation and error messages

## 7. Guardrail review and verification (US-2.1 – US-2.10)

- [x] 7.1 Verify guardrail G5 by an explicit copy review: no copy pushes weight loss, and "maintain" and "gain" are presented as first-class goals
- [x] 7.2 Verify guardrail G6 by an explicit copy and logic review: the direction is derived from the person's own target and the goal form suggests no target
- [x] 7.3 Verify guardrail G9 by an explicit review: a dependent profile shows no target, no progress percentage, no BMI and no ranking position
- [x] 7.4 Verify guardrail G10 by integration tests: reading a profile the caller does not manage returns nothing, and no route returns a profile without a management check
- [x] 7.5 Run `pnpm run lint`, `pnpm run typecheck` and `pnpm run test` and verify all three pass with no errors
- [x] 7.6 Tick the Epic 2 acceptance list in `docs/backlog/epics/epic-02-profiles-and-identity/epic.md`

## Workflow follow-up

- Archive the change once the acceptance list is ticked and the checks pass.
- Verify the archived result leaves `openspec/specs/` describing the shipped behaviour.
- Commit the epic on `development` with a conventional commit message.
