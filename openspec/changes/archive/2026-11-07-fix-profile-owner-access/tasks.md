# Tasks

## 1. Data repair (US-2.1)

- [x] 1.1 Generate a custom migration and backfill `profile_managers` for every profile
      that has a login and no management link, and verify `drizzle-kit migrate` applies it
      and leaves no profile without a management link

## 2. Active profile resolution (US-2.1, US-2.8)

- [x] 2.1 Add the owner fallback to the active profile resolution and verify the
      resolved profile is the caller's own linked profile when the managed list is empty
- [x] 2.2 Point the app home and the app layout at the same resolution, and verify
      `/home` renders and `/onboarding` only redirects when a profile exists

## 3. Verification (US-2.1, US-2.8)

- [x] 3.1 Cover the fallback with a unit test and with an integration test over the
      shape Epic 1 left behind, and verify the suite passes
- [x] 3.2 Verify guardrail G10 by review: the management gate is unchanged and the
      fallback only ever returns the caller's own linked profile
- [x] 3.3 Run `pnpm run lint`, `pnpm run typecheck`, `pnpm run test` and `pnpm run build`
      and verify all four pass
- [x] 3.4 Document the Google Cloud project requirement for the OAuth client in the
      README, and verify the redirect URI and the client id are still the documented ones
