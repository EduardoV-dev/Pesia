# Epic 7 — PWA & reminders

The app installs to a home screen, opens instantly, and nudges the recorder about **whose turn it is** — never about anybody's weight. The reminder is the only thing in this product that reaches out on its own, so it has to be the gentlest part of it.

## Outcome

- The app is installable to a home screen on iOS and Android and launches standalone.
- The shell opens and the group sheet is browsable with no connection.
- A recorder receives a reminder naming who is due, without ever mentioning a number.
- Reminders are opt-in, per-user, per-group, and can be switched off completely.
- Anyone without push support still gets an email.

## Scope

### Installable PWA

- `app/manifest.ts` with `display: "standalone"`, name, short name, theme colours and 192/512 icons
- Service worker via **Serwist** using the Next.js 16 + Turbopack registration pattern (`new URL('../lib/pwa', import.meta.url)`)
- Offline shell: the app frame, the weigh-in sheet and the last cached snapshot
- Offline writes were delivered in Epic 4; this epic makes the *shell* work offline too
- An "Add to Home Screen" prompt on iOS, where web push and installability are tied together

### Web push

- VAPID keys generated and stored as environment secrets
- `web-push` used server-side to deliver to stored subscriptions
- Subscription endpoint stored per user; expired subscriptions (HTTP 404/410) are pruned on send
- Permission is requested **from a user gesture** — a tap on an explicit "Enable notifications" button. A request on page load or on a timer does not work on iOS and is rejected by Safari

> **iOS constraint, verified against current WebKit documentation:** Web Push on iOS and iPadOS 16.4+ works only for web apps added to the Home Screen, over HTTPS, with a manifest, and with permission requested from a tap inside the installed app. It does **not** require membership of the Apple Developer Program. A Safari tab cannot subscribe — the app must detect this and show the install instructions instead of a button that cannot work.

### Email fallback

- Anyone who cannot or will install the app receives reminders by email instead
- Sender is a real, verified domain with SPF and DKIM so the message does not land in spam — a reminder in a spam folder is a reminder nobody sees
- Delivered by Resend

### Reminder scheduling

A daily Vercel Cron job runs the delivery logic:

1. Find groups whose weigh-in day is today (in the group's timezone)
2. Determine which members are due, using each member's own cadence
3. **Exclude members who are not visible to the group** (guardrail G8)
4. For each group, find the recorder(s) — the people whose role grants log permission over the due member
5. Send one reminder per recorder, naming **whose turn it is**

### What a reminder says

| It says | It never says |
|---|---|
| "It's Ana's turn to be weighed today" | Ana's weight, or any weight |
| "The family weigh-in is today" | Who gained or lost anything |
| "You're due for a check-in" | A comparison with anyone else |
| Nothing at all, when the member is private | Why anyone was skipped |

No streaks, no missed-check-in shaming, no count of how long someone has been away (guardrail G7, G8). The tone is a nudge, not a notification of failure.

### Reminder preferences

Owned by the user, not the group:

- Channels: push, email, or both
- Per group: on or off
- Quiet hours, if the user wants them
- Stored on the user record via Better Auth's `additionalFields` on the user model — **not** by hand-editing the auth table

## Not in this epic

- Native iOS or Android apps
- SMS or WhatsApp delivery
- Group-level reminder configuration beyond the weigh-in day
- Digest emails, weekly summaries, or any "you have gained X" message
- Streaks, badges for missing, or any punishment for absence
- Background sync scheduling beyond what Epic 4 already provides

## Acceptance criteria

- [ ] **US-7.1** The app can be added to a home screen and launches standalone.
- [ ] **US-7.2** The app shell and the group sheet open with no connection.
- [ ] **US-7.3** I can enable push notifications with one tap.
- [ ] **US-7.4** I receive a reminder naming whose turn it is.
- [ ] **US-7.5** I can receive an email instead of a push.
- [ ] **US-7.6** I can turn reminders off entirely.
- [ ] **US-7.7** I can set a weekly, biweekly, monthly or no cadence.
- [ ] **US-7.8** I can see the group's weigh-in day.
- [ ] **US-7.9** No reminder ever mentions a weight.
- [ ] **US-7.10** No reminder is sent about a member who is not visible to the group.
- [ ] On iOS, where the app is not installed, the app shows install instructions rather than a notification button that cannot work.
- [ ] Reminder emails pass SPF and DKIM.
- [ ] The cron job is idempotent — running it twice does not send two reminders.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 4 | A reminder exists to prompt a check-in |
| Depends on | 3 | Needs cadence, weigh-in day and roles to know who to notify |
| Depends on | 6 | Visibility rules decide who may be mentioned at all |
| Blocks | 8 | The final audit checks reminder copy and behaviour |

## Risks

| Risk | Mitigation |
|---|---|
| iOS silently fails to subscribe | Detect the unsupported case and show the Home Screen instructions; never show a button that cannot work |
| The cron job double-sends after a retry | Per-day delivery record keyed by group, recorder and date; the job checks before sending |
| A reminder leaks a private member's schedule | The cron job applies the visibility filter before selecting recipients or names |
| Reminder emails land in spam | Verified domain with SPF and DKIM; the email is plain text and minimal |
| Timezone drift makes the cron fire on the wrong day | The group timezone is the source of truth, not the server's clock |

## Size

**2 working days** · 22 story points
