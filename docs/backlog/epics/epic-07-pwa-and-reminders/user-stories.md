# User Stories — Epic 7 — PWA & reminders

## Personas in this epic

| Persona | Need |
|---|---|
| **Ana** (recorder) | To be told whose turn it is, without having to remember |
| **Nina** (guardian/owner) | To know the family weighs in on the same day each week |
| **Sofía** (private member) | Never to be named in a reminder or a due list |

---

### US-7.1 — Install the app to my home screen

**As a** member **I want** the app on my home screen **so that** it opens like a normal app, not a browser tab.

**Acceptance criteria**

- [ ] The app can be added to the home screen on iOS and Android and launches without browser chrome.
- [ ] The app has a proper icon, name and theme colour.
- [ ] On iOS I am shown how to add it, since installability is what unlocks notifications there.

**Story points:** 3

---

### US-7.2 — Open the app with no connection

**As a** recorder **I want** the app to open at grandma's house with no signal **so that** I can still run the weigh-in.

**Acceptance criteria**

- [ ] With no connection the app opens to the last cached group sheet.
- [ ] The interface tells me it is offline rather than showing an empty or broken screen.
- [ ] Anything I record while offline is queued and confirmed as queued.

**Story points:** 3

---

### US-7.3 — Enable push notifications

**As a** member **I want** to turn on notifications **so that** I hear about a weigh-in without opening the app.

**Acceptance criteria**

- [ ] Tapping "Enable notifications" triggers the browser permission prompt.
- [ ] Given I decline, the app keeps working and offers email instead.
- [ ] On a device where push cannot work, the app explains what to do rather than offering a dead button.

**Story points:** 3

---

### US-7.4 — Be reminded whose turn it is

**As a** recorder **I want** a reminder that tells me who to weigh **so that** the ritual does not depend on my memory.

**Acceptance criteria**

- [ ] On the group's weigh-in day I receive one reminder naming who is due.
- [ ] If several people are due, all of them are named.
- [ ] The reminder is sent once per day, even if the job runs more than once.
- [ ] The reminder links straight to the weigh-in sheet.

**Story points:** 3

---

### US-7.5 — Get an email instead

**As a** member **I want** reminders by email when push is not available **so that** I still get nudged.

**Acceptance criteria**

- [ ] I can choose email instead of, or as well as, push.
- [ ] The email arrives from a verified domain and does not land in spam.
- [ ] The email says the same thing as the push and nothing more.

**Story points:** 2

---

### US-7.6 — Turn reminders off

**As a** member **I want** to switch reminders off **so that** the app never interrupts me.

**Acceptance criteria**

- [ ] I can disable reminders for the whole app and for a single group.
- [ ] Once disabled, no push and no email is sent to me.
- [ ] The app keeps working and keeps my data.

**Story points:** 2

---

### US-7.7 — Set my own cadence

**As a** member **I want** to set how often I am weighed **so that** the app asks me at my pace.

**Acceptance criteria**

- [ ] I can choose weekly, every two weeks, monthly, or no cadence.
- [ ] My choice determines when I appear on the weigh-in sheet as due.
- [ ] Changing it takes effect from the next period.

**Story points:** 1

---

### US-7.8 — Know the family weigh-in day

**As a** member **I want** to see when the family weighs in **so that** I can be ready.

**Acceptance criteria**

- [ ] The group's weigh-in day and time are visible to all members.
- [ ] The date is shown in my own timezone as well as the group's.
- [ ] When no day is set, the app does not display a made-up one.

**Story points:** 1

---

### US-7.9 — Never be told about a weight

**As a** member **I want** reminders that say nothing about anybody's weight **so that** a nudge is never a judgement.

**Acceptance criteria**

- [ ] No reminder, push or email, contains a weight, a trend, a change or a comparison.
- [ ] No reminder mentions how long anyone has been missing a check-in.
- [ ] No reminder uses streak or failure language.
- [ ] Reminder copy is reviewed against this story before it ships.

**Story points:** 2

---

### US-7.10 — Not be named when I am not visible

**As a** private member **I want** to never be named in a reminder **so that** my privacy holds outside the app too.

**Acceptance criteria**

- [ ] A member whose visibility excludes them is never named in any reminder.
- [ ] The recorder is not told that anyone was skipped, and no count of skipped members is included.
- [ ] A reminder for one member never implies the existence of another member's schedule.

**Story points:** 2
