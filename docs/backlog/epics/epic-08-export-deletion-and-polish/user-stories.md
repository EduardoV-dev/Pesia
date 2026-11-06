# User Stories — Epic 8 — Export, deletion & guardrail audit

## Personas in this epic

| Persona | Need |
|---|---|
| **Sofía** (private member) | To take my data with me, and to be able to disappear completely |
| **Nina** (guardian/owner) | To remove a profile when it is no longer needed |
| **Ana** (recorder) | To know the app is safe enough to keep using in front of my family |
| **Luis** (member) | To use every screen without a mouse or a struggle |

---

### US-8.1 — Export my data as JSON

**As a** member **I want** a complete export of my data **so that** I hold it, not just the app.

**Acceptance criteria**

- [ ] The export contains every profile I manage, every goal, every entry recorded about those profiles, my memberships, my permissions and my settings.
- [ ] The format is JSON and the file is complete and valid.
- [ ] The export reflects my data as it is right now, including entries recorded by somebody else.
- [ ] The export is generated on request and does not require contacting anyone.

**Story points:** 3

---

### US-8.2 — Export my entries as CSV

**As a** member **I want** my entries as a spreadsheet **so that** I can look at the numbers however I like.

**Acceptance criteria**

- [ ] The CSV has one row per entry, with the measured date, the recorded date, the weight, the profile, and who recorded it.
- [ ] Dates are unambiguous and weights are labelled with their unit.
- [ ] Deleted entries are absent.

**Story points:** 2

---

### US-8.3 — Delete my account

**As a** member **I want** to delete my account **so that** I can leave with nothing left behind.

**Acceptance criteria**

- [ ] I can delete my account from settings.
- [ ] The action requires an explicit confirmation.
- [ ] After deletion, my login is destroyed and I cannot sign back in.
- [ ] My profile and the entries recorded about me are deleted.

**Story points:** 3

---

### US-8.4 — Keep other people's data when I leave

**As a** member **I want** my deletion to remove my own data but not other people's **so that** I can leave without destroying my family's record.

**Acceptance criteria**

- [ ] Entries I recorded about other people remain after my deletion.
- [ ] Entries recorded about me are removed.
- [ ] The group is notified that a member's account was removed, without a reason.
- [ ] This behaviour is explained to me before I confirm, not after.

**Story points:** 3

---

### US-8.5 — Remove a dependent profile

**As a** guardian **I want** to remove a profile I manage **so that** it stops appearing when we weigh in.

**Acceptance criteria**

- [ ] I can remove a dependent profile I manage.
- [ ] After removal, the profile no longer appears on the weigh-in sheet and cannot be recorded against.
- [ ] The history already seen by others remains seen.
- [ ] The action requires an explicit confirmation.

**Story points:** 2

---

### US-8.6 — Know exactly what deletion does

**As a** member **I want** to be told what deletion will and will not remove **so that** I choose with full information.

**Acceptance criteria**

- [ ] Before confirming, I am shown a plain list of what is removed and what is kept.
- [ ] The list uses the same words as the rest of the app — no legal jargon.
- [ ] I can cancel and lose nothing.

**Story points:** 1

---

### US-8.7 — Trust the guardrails

**As a** member **I want** the app to hold the promises it made about privacy **so that** sharing in this group is safe.

**Acceptance criteria**

- [ ] No screen ranks people by body size.
- [ ] No screen shows a raw delta between two readings.
- [ ] Direction is worded relative to each member's own goal.
- [ ] BMI is off by default, private, and never appears on the board.
- [ ] No calorie or weight-loss nudges exist.
- [ ] Goal direction is always derived from the member's own target.
- [ ] Reminder payloads contain no weight values.
- [ ] Private members are absent from due lists and absence counts.
- [ ] Dependents have no target, progress, BMI or rank in any response.
- [ ] Every board read is filtered server-side, verified by the full test matrix.

**Story points:** 3

---

### US-8.8 — Use every screen with a keyboard

**As a** member using assistive technology **I want** every screen operable without a mouse **so that** I can use the app independently.

**Acceptance criteria**

- [ ] Every screen is completable with the keyboard alone.
- [ ] Charts, progress bars and the weigh-in sheet have accessible names and text alternatives.
- [ ] Focus moves predictably when I switch profiles, open a sheet or move between screens.
- [ ] Contrast meets WCAG AA in both light and dark themes.
- [ ] No screen requires horizontal scrolling at 360 px.

**Story points:** 3
