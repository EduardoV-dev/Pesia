# User Stories — Epic 2 — Profiles & identity

## Personas in this epic

| Persona | Need |
|---|---|
| **Luis** (member) | A profile of my own, with my own goal in my own units |
| **Mara** (dependent) | A record that follows my growth without turning me into a score |
| **Nina** (guardian/owner) | To create and maintain a profile for my kid, who has no phone |
| **Ana** (recorder) | To switch between profiles quickly so logging everyone is one flow |

---

### US-2.1 — Create my own profile

**As a** signed-in user **I want** a profile of my own **so that** my weight history is separate from everyone else's.

**Acceptance criteria**

- [ ] Given I am signed in, when I complete onboarding, then a profile is created and linked to my account.
- [ ] Given I already have a profile, when I sign in again, then no second profile is created.
- [ ] My profile is linked to my login and is only visible to me and to people I explicitly grant access to.

**Story points:** 2

---

### US-2.2 — Choose my unit

**As a** member **I want** to choose kg or lb **so that** the numbers I see match the scale I actually use.

**Acceptance criteria**

- [ ] I can set my display unit to kg or lb at any time.
- [ ] Entered values are stored canonically in kg and converted for display, so switching units never changes my history.
- [ ] Switching units preserves my existing entries exactly.

**Story points:** 2

---

### US-2.3 — Set a target

**As a** member **I want** to set a target weight **so that** the app can tell me whether I am moving toward it.

**Acceptance criteria**

- [ ] Given I enter a target below my current weight, then my goal direction is "lose".
- [ ] Given I enter a target above my current weight, then my goal direction is "gain".
- [ ] The app never suggests a target, and never presumes my goal is to lose weight.
- [ ] I can choose not to set a target at all; my trend still works without one.

**Story points:** 2

---

### US-2.4 — Set a maintain band

**As a** member who wants to hold steady **I want** to define a band around my target **so that** the app measures me against staying put rather than against moving.

**Acceptance criteria**

- [ ] Given my direction is "maintain", then I set a target and a band width.
- [ ] Given my current weight is inside the band, then my progress reads 100%.
- [ ] Given my current weight is outside the band, then the app reports the distance to the band without moralising it.

**Story points:** 2

---

### US-2.5 — Change my target

**As a** member **I want** to adjust my target **so that** the app reflects reality when my goal changes.

**Acceptance criteria**

- [ ] Given I change my target, then a new goal becomes active and the previous one is kept as history.
- [ ] Given I change my target, then my baseline is reset to my weight at the moment of the change, and progress restarts at 0%.
- [ ] Progress never displays a value outside 0–100%.

**Story points:** 3

---

### US-2.6 — Create a profile for someone without a login

**As a** guardian **I want** to create a profile for my mother, who does not use Google **so that** her weight is tracked too.

**Acceptance criteria**

- [ ] I can create a profile that has no login attached.
- [ ] The profile has a display name, a unit, and an optional target, exactly like any other.
- [ ] The profile appears in my profile switcher and nowhere else.
- [ ] The profile cannot be signed into — there is no credential for it.

**Story points:** 2

---

### US-2.7 — Create a profile for my child

**As a** guardian **I want** to create a profile for my kid **so that** we weigh her with everyone else.

**Acceptance criteria**

- [ ] I can create a dependent profile that has no login.
- [ ] A dependent profile offers no target, no progress percentage, no BMI and no ranking position.
- [ ] A dependent profile shows a weight history and a trend direction only.
- [ ] A dependent profile cannot be converted into a non-dependent profile without creating a new profile.

**Story points:** 2

---

### US-2.8 — Switch profiles on one device

**As a** recorder **I want** to switch between profiles on the device in front of me **so that** logging the whole family is one continuous flow.

**Acceptance criteria**

- [ ] The switcher lists every profile I manage, with an unambiguous label for each.
- [ ] Switching is one tap and takes effect immediately.
- [ ] The entry form targets the active profile, and the screen shows whose weight I am about to record.
- [ ] Switching to a dependent profile shows that profile's constraints (no target, no progress).

**Story points:** 2

---

### US-2.9 — Edit my profile

**As a** member **I want** to change my display name and avatar **so that** the group sheet identifies me clearly.

**Acceptance criteria**

- [ ] I can change my display name and avatar at any time.
- [ ] A blank display name is rejected with a readable message.
- [ ] My display name is what other members see in the group.

**Story points:** 1

---

### US-2.10 — Keep profiles private until I share

**As a** member **I want** my profile to exist without being visible to anyone **so that** I decide when to share, not the app.

**Acceptance criteria**

- [ ] A newly created profile is not visible in any group until I am added to one.
- [ ] Creating a profile notifies nobody.
- [ ] Only the people who manage a profile can see that it exists before it joins a group.

**Story points:** 1
