# User Stories — Epic 5 — Stats engine & personal trend

## Personas in this epic

| Persona | Need |
|---|---|
| **Luis** (member) | To know whether the last month is going in the direction I want |
| **Mara** (dependent) | A trend that shows growth without scoring me |
| **Nina** (guardian/owner) | To see my kid's trend without it becoming a judgement |
| **Sofía** (private member) | Numbers that are mine, read by me first |

---

### US-5.1 — See my trend

**As a** member **I want** to see a smoothed line of my weight **so that** I read a trend instead of a pile of numbers.

**Acceptance criteria**

- [ ] The chart shows a rolling 7-day mean as the line.
- [ ] Individual readings are visible as points behind the line.
- [ ] The chart is readable on a phone screen.
- [ ] The chart has an accessible text summary for screen readers.

**Story points:** 3

---

### US-5.2 — See whether I am moving toward my goal

**As a** member **I want** to know if I am moving toward my own target **so that** the app tells me something relevant to me.

**Acceptance criteria**

- [ ] The direction is expressed relative to my own goal, so "up" and "down" are never ambiguous.
- [ ] The wording is "moving toward your goal" or "moving away from your goal" — never "good" or "bad", never a bare "gained" or "lost".
- [ ] The same physical change produces opposite wording for two members with opposite goals, and that is correct.

**Story points:** 3

---

### US-5.3 — See my percentage change

**As a** member **I want** to see my change as a percentage of my body mass **so that** the number means the same thing as it would for someone else.

**Acceptance criteria**

- [ ] My percentage change since my baseline is shown.
- [ ] The baseline used is the one from my current goal, and I can see which baseline it is.
- [ ] The percentage is labelled as change since the baseline, not as progress.

**Story points:** 2

---

### US-5.4 — See my progress toward my target

**As a** member **I want** to see how far along my target I am **so that** I know whether it is working for me.

**Acceptance criteria**

- [ ] Progress is a value between 0% and 100% and never exceeds either bound.
- [ ] Reaching or passing my target reads 100%, not more.
- [ ] Moving away from my target decreases progress rather than producing a negative number.
- [ ] The progress bar is labelled with the words that go with it — the number alone is not the story.

**Story points:** 3

---

### US-5.5 — Be told I am stable

**As a** member **I want** small fluctuations to be treated as normal **so that** a noisy week is not reported as a change.

**Acceptance criteria**

- [ ] A change below the deadband reads "stable", not "up" or "down".
- [ ] A sustained change beyond the deadband does produce a direction.
- [ ] The deadband threshold is a single named constant, not a literal scattered across the code.

**Story points:** 2

---

### US-5.6 — Hold steady against a band

**As a** member whose goal is to maintain **I want** my progress measured against a band **so that** staying put counts as success.

**Acceptance criteria**

- [ ] While my weight is inside the band, my progress reads 100%.
- [ ] Outside the band, the distance to the band is shown without a judgement attached.
- [ ] No maintenance streak is broken or reset for missing a check-in.

**Story points:** 2

---

### US-5.7 — Start over cleanly after changing my target

**As a** member **I want** my progress to restart when I change my target **so that** the percentage stays meaningful.

**Acceptance criteria**

- [ ] After a target change, my baseline is my weight at the moment of the change.
- [ ] My progress reads 0% immediately after the change.
- [ ] My percentage change uses the same new baseline.
- [ ] Progress never displays a value outside 0–100%.

**Story points:** 2

---

### US-5.8 — Turn on BMI privately

**As a** member **I want** an optional BMI reference **so that** I can look at it if I want one, on my own terms.

**Acceptance criteria**

- [ ] BMI is off until I turn it on.
- [ ] Turning it on asks for my height, which is stored as optional profile data.
- [ ] The value shows no category label, no colour coding and no pass/fail threshold.
- [ ] The screen states that BMI is a screening measure and suggests discussing it with a doctor.
- [ ] My BMI is never shown on the group board and never appears in any award or comparison.
- [ ] I can turn it off and the value stops being displayed.

**Story points:** 3

---

### US-5.9 — See a trend after missing weeks

**As a** member **I want** my trend to stay honest after I disappear for a while **so that** I am not shown a direction that never happened.

**Acceptance criteria**

- [ ] Missing weeks are rendered as gaps, not interpolated into a continuous line.
- [ ] A direction is only shown when there is enough data on both sides of the comparison window.
- [ ] With insufficient data the app says so plainly and shows what it does have.

**Story points:** 2

---

### US-5.10 — Use the app without setting a target

**As a** member **I want** a useful view without declaring a goal **so that** tracking my weight is not framed as a mission I must complete.

**Acceptance criteria**

- [ ] With no target set, I see my trend, my direction and my percentage change.
- [ ] No empty progress bar and no "0% toward goal" is shown.
- [ ] Nothing on the screen implies that not having a target is a deficiency.

**Story points:** 2
