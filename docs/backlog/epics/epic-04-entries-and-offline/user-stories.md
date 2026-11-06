# User Stories — Epic 4 — Entries & offline capture

## Personas in this epic

| Persona | Need |
|---|---|
| **Ana** (recorder) | To log five people in thirty seconds, with no signal in the room |
| **Luis** (member) | To correct a typo without it turning into a whole story |
| **Nina** (guardian/owner) | To record her kid's weight on Sunday and have it stay on Sunday |

---

### US-4.1 — Record my own weight

**As a** member **I want** to record my weight **so that** my history builds up.

**Acceptance criteria**

- [ ] I can record a weight with one screen and a numeric keypad.
- [ ] The entry is stamped with the current time as both measured and recorded time.
- [ ] The weight is stored canonically in kg regardless of my display unit.
- [ ] A value outside the accepted range is rejected with a readable message, not a silent clamp.

**Story points:** 3

---

### US-4.2 — Record someone else's weight

**As a** recorder **I want** to record the weight of the person in front of me **so that** one person can run the whole weigh-in.

**Acceptance criteria**

- [ ] Given I have log permission for a profile, when I select it and enter a weight, then the entry is recorded against that profile and attributed to me.
- [ ] Given I have no log permission, then the action is refused and the reason is stated.
- [ ] The screen always shows whose weight is being recorded, prominently, so I cannot log against the wrong person.
- [ ] Recording for someone else grants me no additional access to their history.

**Story points:** 3

---

### US-4.3 — Record with no connection

**As a** recorder **I want** to record a weigh-in at grandma's house with no wifi **so that** the ritual is not blocked by connectivity.

**Acceptance criteria**

- [ ] Given I am offline, when I record a weigh-in, then it is saved locally and the UI says it is queued.
- [ ] Given I am offline, when I open the app again, then I can still see the sheet and record more weigh-ins.
- [ ] Given I am back online, then queued entries sync automatically and the UI confirms they were saved.
- [ ] A queued entry syncs exactly once no matter how many times the queue flushes.

**Story points:** 5

---

### US-4.4 — Backdate an entry

**As a** recorder **I want** to date an entry to the day it was actually measured **so that** the trend reflects reality.

**Acceptance criteria**

- [ ] I can change the measured date of an entry I recorded.
- [ ] The recorded time is preserved separately and still shows when it was typed.
- [ ] Backdating is not restricted by an arbitrary window.
- [ ] A backdated entry is included in the correct day's averages.

**Story points:** 2

---

### US-4.5 — Correct a typo

**As a** member **I want** to fix a mistyped weight **so that** one keystroke does not distort my history.

**Acceptance criteria**

- [ ] Given I recorded the entry, when I edit the weight, then the change is saved and the trend recomputes.
- [ ] The edit is attributed to me and timestamped.
- [ ] Given the entry was recorded by someone else, then I cannot edit it unless I am that person or a Logger who created it.

**Story points:** 2

---

### US-4.6 — Delete an entry

**As a** member **I want** to delete an entry **so that** a mistake can be removed rather than explained.

**Acceptance criteria**

- [ ] Given I recorded the entry, when I delete it, then it is removed from the history.
- [ ] The group view shows no placeholder and no count of deleted entries.
- [ ] The trend recomputes without it.

**Story points:** 2

---

### US-4.7 — See who recorded it

**As a** member **I want** to know who recorded an entry **so that** the shared record is trustworthy.

**Acceptance criteria**

- [ ] Each entry displays who recorded it and when.
- [ ] The attribution persists even if that person later deletes their account.

**Story points:** 1

---

### US-4.8 — Add a private note

**As a** member **I want** to annotate my own entry **so that** I can note context without explaining it to the group.

**Acceptance criteria**

- [ ] I can attach a note to an entry I recorded.
- [ ] Notes are never visible to other group members, at any visibility level, including when the entry's weight is visible.
- [ ] Notes are included in my own data export.

**Story points:** 1

---

### US-4.9 — See my own history

**As a** member **I want** to see every entry I have **so that** I can check what was recorded and when.

**Acceptance criteria**

- [ ] My history lists entries newest first with the measured date and the recorded date.
- [ ] Deleted entries are absent.
- [ ] I can see entries that were recorded by someone else on my behalf.

**Story points:** 2

---

### US-4.10 — Record the right person

**As a** recorder **I want** the sheet to make it unambiguous who I am about to weigh **so that** I never record against the wrong profile.

**Acceptance criteria**

- [ ] The profile being recorded is named prominently on the entry screen.
- [ ] Advancing to the next person requires an explicit action, not an accidental tap.
- [ ] The next person on the sheet is previewed after each save.

**Story points:** 2
