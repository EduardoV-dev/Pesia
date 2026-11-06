# Epic 8 — Export, deletion & guardrail audit

Users can take their data and leave. Then the whole product is checked against the guardrails one final time, because a feature that leaks data is not finished no matter how good the rest is.

## Outcome

- Anyone can export everything the app holds about them, as JSON or CSV.
- Anyone can delete their account, with clear and correct consequences for other people's data.
- A dependent profile can be removed by its guardian.
- The whole product passes the guardrail audit and an accessibility pass.
- The privacy policy and terms exist, in plain language, before there are real users.

## Scope

### Export

| Export | Contents | Format |
|---|---|---|
| Own data | Every profile I manage, every goal, every entry recorded about any of those profiles, my group memberships, my permissions, my settings | JSON (complete) and CSV (entries, one row per entry) |
| Group data | — | **v1.5 — not in this epic** |

The export includes entries recorded *about* my managed profiles even if somebody else typed them, because those are my profiles' history. It does not include entries about other people that I merely recorded — those belong to them.

### Account deletion

Deleting an account means:

- The login and its sessions are destroyed.
- My own profile is deleted.
- Entries recorded **about me** are deleted.
- Entries I recorded **about other people stay**, because they are those people's data. The group is notified that a member's account was removed, without the reason.
- My past entries remain visible in the groups' history, as decided in Epic 3 — the group's record of what was weighed does not change because the person who typed it left.

> This asymmetry is deliberate and must be stated in the UI before the deletion is confirmed, not discovered afterwards.

### Dependent profile removal

A guardian can remove a dependent profile. Its history stays visible to the people who already saw it — removing a profile stops future recording, it does not rewrite the past for others.

### Guardrail audit

The ten guardrails from the [backlog index](../README.md#guardrails-apply-to-every-epic) become a checklist with a named owner and a verification method. Each guardrail is verified in code, by test where possible, and by reading the rendered screen where it is a matter of copy.

| Guardrail | Verification |
|---|---|
| G1 — no ranking by body size | Grep the codebase for magnitude-ranking code; review every award computation |
| G2 — no raw single-reading delta | Test that no UI component receives a raw delta; unit tests on the stats functions |
| G3 — goal-relative language | Copy review of every string that renders a direction |
| G4 — BMI optional, private, unranked | Test that no board response contains a BMI value for another member |
| G5 — no calorie or weight-loss nudges | Copy review; no calorie data is collected at all |
| G6 — goal direction derived | Test that direction is computed from the target and never defaulted to "lose" |
| G7 — reminders carry no weight | Test that reminder payloads contain no numeric weight values |
| G8 — no inferred reasons | Test that private members are absent from due lists and absence counts |
| G9 — dependents are trend-only | Test that a dependent has no target, progress, BMI or rank in any response |
| G10 — server-side filtering | The integration test matrix from Epic 6, run as a gate |

### Accessibility and responsive polish

- Full keyboard operability across every screen
- Screen-reader labels on charts, progress bars and the weigh-in sheet
- Focus management when switching profiles, closing sheets and navigating
- 360 px layout verified on every screen, no horizontal scroll anywhere
- Contrast ratios meet WCAG AA in both themes

### Legal and trust surfaces

- Privacy policy: what is collected, what is shared, what is never collected, how to delete
- Terms of use
- A plain-language statement that the app is a tracking tool and not a medical device, and that BMI is a screening measure

> These are drafts written from the product's actual behaviour, and they need a real review before launch. That is a task for a qualified person, not for this backlog.

## Not in this epic

- Group-wide data export (v1.5)
- Legal review or compliance advice
- A data-retention schedule beyond deletion on request
- Two-factor authentication
- Any export format other than JSON and CSV
- Backups or disaster recovery

## Acceptance criteria

- [ ] **US-8.1** I can export everything the app holds about me as JSON.
- [ ] **US-8.2** I can export my entries as CSV for a spreadsheet.
- [ ] **US-8.3** I can delete my account.
- [ ] **US-8.4** Other people's data survives my deletion.
- [ ] **US-8.5** I can remove a dependent profile I manage.
- [ ] **US-8.6** I am told, before confirming, exactly what deletion does and does not remove.
- [ ] **US-8.7** The guardrail audit is complete, with each guardrail verified and recorded.
- [ ] **US-8.8** The app passes the accessibility pass on every screen.
- [ ] The privacy policy and terms describe the real behaviour of the app.
- [ ] The product states plainly that it is not a medical device.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 6 | The board's filtering is the main thing being audited |
| Depends on | 7 | Reminder payload and copy are audited |
| Depends on | 1, 2, 3, 4, 5 | The export spans every table the app owns |

## Risks

| Risk | Mitigation |
|---|---|
| Deletion removes data that belonged to someone else | Entries carry `recorded_by_user_id` and `profile_id` separately, so the two deletion scopes are distinguishable |
| A guardrail regresses after this epic | The audit produces executable checks where possible, not a document — G10 in particular ships as a test gate |
| The privacy policy drifts from the behaviour | The policy is written from the schema and the audit, and is re-read whenever data collection changes |

## Size

**1.5 working days** · 20 story points
