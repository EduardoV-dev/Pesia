# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16.4.5 (App Router, Turbopack), React 19.3.1, TypeScript, Tailwind v4 with
CSS-variable tokens and no `tailwind.config.js`, shadcn/ui, Better Auth 1.7.18, Drizzle
ORM 0.45.4, Serwist 9.5.13, web-push, Resend, Vitest 5.1. Local development runs against a
Docker Postgres; the production swap to Neon is isolated in a single module.

## Users

Five recurring people, all in one family today and reproducible in any family tomorrow.

- **Ana — the recorder.** Owns the scale and logs everyone's weight on one shared phone.
  Needs speed, one-handed entry, and a flow that works with no signal.
- **Luis — the member with a phone.** Logs his own weight. Needs to know whether he is
  moving toward _his_ target, not toward a shared scale.
- **Mara — the dependent.** A kid with no phone and no login. Her guardian records her
  weight. She is never scored.
- **Nina — the guardian and group owner.** Manages her kid and her own profile. Controls
  who logs and who sees what.
- **Sofía — the private member.** Has set her visibility to private and opted out of
  ranking. Needs certainty that neither her data nor her absence surfaces.

## Product Purpose

A family weighs everyone together on a set day, and the shared history used to live on a
laptop that stayed behind at somebody's house. Weight Tracker keeps that history in one
place: one person records everyone's weigh-in, each person sees their own goal-relative
trend, and the group sees consistency — never body size.

Success is a family ritual that survives a bad connection and can never turn into shame.
The app is useful when the recorder can log five people in thirty seconds offline, and
safe when the least-visible member in the group is still a full participant.

## Positioning

The mechanism is a shared weigh-in sheet with per-member consent: recording permission
and viewing permission are separate, so the person holding the scale does not gain a
dossier on every relative. Competitors built on leaderboards of weight change cannot
truthfully copy this — the ranking is over check-in habits, and the biggest-change badge
is disclosed only to the member who earned it.

## Operating Context

- One scale, one shared phone, one recorder, the whole family in a room. Often Sunday
  evening, sometimes with no wifi — grandma's house has no signal.
- The recorder types the weight shortly after it was measured; sometimes the next
  morning. "When it was measured" and "when it was typed" are different facts and the app
  keeps both.
- A group weighs in on a shared day and time set by the owner. Each member has their own
  cadence — weekly, every two weeks, monthly, or none.
- One login can manage several profiles and switch between them: the recorder, the
  grandmother without a Google account, the child. Switching is how one person logs
  everyone.
- The family is not a single-goal group: at least one person wants to lose, one wants to
  hold steady, and one wants to gain. The app must never assume otherwise.

## Capabilities and Constraints

- **Spanish only.** Every user-facing string: UI, errors, emails, push copy, reminders,
  privacy policy, terms. No English reaches the user. No i18n layer exists.
- **Invite-only.** Groups are reachable only by invite link or 6-character code. No
  public groups, no discovery, no search, no group URL that leaks membership.
- **Write permission is not read permission.** `can_log_for` governs writes; `visibility`
  governs reads. No code path treats one as the other.
- **Server-side filtering (G10).** Every filtered read is assembled per viewer on the
  server. No client-side filtering step, and no route that returns raw membership plus
  raw entries.
- **Goal-relative language.** Direction is reported against the member's own target:
  "moviendo hacia tu objetivo", "alejándose de tu objetivo", "estable". Never "ganado",
  "perdido", "bien", "mal", and never a bare number with a red/green verdict.
- **No raw single-reading delta.** Only rolling trends with a 0.3 kg/week deadband.
- **BMI is optional, off by default, private to the member**, never on the board, never
  ranked, never compared, framed as a screening measure with no category labels.
- **No calories, no weight-loss nudges.** "Mantener" and "Ganar" are first-class goals.
- **Dependents are trend-only.** No target, no progress percentage, no ranking, no BMI.
  Pediatric BMI is not collected because the option would be wrong.
- **Entries are append-only and attributed.** Client-generated UUID v4 (a retried sync
  upserts instead of duplicating), permanent `recorded_by_user_id`, separate `measured_at`
  and `recorded_at`, notes private to their author at every visibility level, and a
  deleted entry leaves no placeholder.
- **Reminders are opt-in, per user, per group**, name whose turn it is, and never
  mention a weight, a trend, a comparison, or how long anyone has been absent.
- **Offline is a requirement, not a nicety.** Recording works with no connection and
  syncs exactly once. The group sheet is browsable from the last cached snapshot.
- **First run:** a new signer creates their own profile first (name and unit), then
  either creates a group — becoming its Owner — or accepts an invitation to one. A
  profile must exist before it can join a group.
- **Any family may use the product.** Sign in with Google, create a closed group, invite
  people. Copy speaks of "tu grupo" and "tu familia".

## Brand Commitments

- Working name **"Weight Tracker"**. Cosmetic and replaceable.
- Voice: calm, plain, matter-of-fact. It is a tool that records, never a coach that
  judges. It never congratulates, never scolds, and never implies a deficit.
- The product is a tracking tool, not a medical device. That is stated plainly in the
  product and in the legal copy.

## Evidence on Hand

None. There are no real users, no testimonials, no usage data, no screenshots of a
working product, and no brand assets. Every demonstration value in a mockup is
**synthetic** and must be labelled as such wherever a visitor could mistake it for real:
the family roster (Ana, Luis, Mara, Nina, Sofía), all weights, all trends, all awards.
No commercial or factual claim may be invented — no pricing, no customer counts, no
benchmarks, no capabilities the app does not have.

## Product Principles

1. **Consistency is the thing the group sees.** The group celebrates keeping a habit,
   never the size of a body.
2. **Consent is per member and revocable.** Sharing is a decision a person makes and can
   undo, and the app never exposes the fact that they chose to hide.
3. **Silence is the default for absence.** The app never states or implies why someone is
   missing or not sharing.
4. **One recorder, one flow.** The fastest path to logging five people in thirty seconds
   is the product's core interaction, and it must work with one thumb and no signal.
5. **The tool never moralises.** A number is a number until the member's own goal gives
   it a direction.

## Accessibility & Inclusion

WCAG AA contrast in light and dark themes, full keyboard operability on every screen,
accessible names on every interactive element including charts and progress bars, visible
focus that is never trapped, no horizontal scrolling at 360 px, and a screen-reader text
summary for every chart. Assistive-technology use is a first-class requirement, not a
polish pass.
