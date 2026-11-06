# User Stories — Epic 6 — Group board & awards

## Personas in this epic

| Persona | Need |
|---|---|
| **Ana** (recorder) | To see at a glance how the family is doing without it turning into a scoreboard |
| **Sofía** (private member) | To be in the group without being measured or ranked |
| **Mara** (dependent) | To be part of the family weigh-in without being scored |
| **Nina** (guardian/owner) | To know what each member has agreed to share |

---

### US-6.1 — Open the group board

**As a** member **I want** to open a shared view of the family **so that** I can see how everyone is doing.

**Acceptance criteria**

- [ ] The board lists every member of the group.
- [ ] Each member's card shows their own progress and trend.
- [ ] The board is readable on a phone screen.
- [ ] The board loads from the server, filtered for me.

**Story points:** 3

---

### US-6.2 — See only what is shared

**As a** member **I want** to see exactly what each person chose to share **so that** the group view respects their decisions.

**Acceptance criteria**

- [ ] A member at "weight and trend" shows their weight and trend.
- [ ] A member at "latest weight only" shows their weight but no trend.
- [ ] A member at "name only" shows their name and no numbers.
- [ ] The filtering happens on the server — the data I am not allowed to see is never sent to my device.

**Story points:** 3

---

### US-6.3 — See "private" instead of data

**As a** member **I want** a private member to appear as private **so that** nobody can infer anything from their card.

**Acceptance criteria**

- [ ] A private member's card shows the word "private" and nothing else about their data.
- [ ] Their weight, trend, progress and awards are all absent.
- [ ] The card gives no hint of why — no lock icon, no explanation, no tooltip.

**Story points:** 2

---

### US-6.4 — Opt out of the ranking and stay in the group

**As a** member **I want** to opt out of ranking without leaving the group **so that** I can take part without being scored.

**Acceptance criteria**

- [ ] With ranking opt-out on, I am absent from the consistency ranking strip.
- [ ] I still appear on the weigh-in sheet and in the group list.
- [ ] Nobody is notified that I opted out.

**Story points:** 2

---

### US-6.5 — Earn a consistency award

**As a** member **I want** to be recognised for keeping my weigh-in habit **so that** the group rewards something I control.

**Acceptance criteria**

- [ ] Awards are earned by completing check-ins against my own cadence.
- [ ] A monthly member is judged monthly and is not compared against a weekly member.
- [ ] No award is ever based on how much my body changed.
- [ ] Awards appear on my own card.

**Story points:** 3

---

### US-6.6 — Learn privately that I changed the most

**As a** member **I want** to know privately that I moved the most this period **so that** I can have the fun of it without the group ranking bodies.

**Acceptance criteria**

- [ ] I am told privately whether my change was the largest in the group for the period.
- [ ] No other member can see that comparison or discover it from the board.
- [ ] No group-facing list of changes by magnitude exists anywhere in the product.
- [ ] The comparison is only made when there are enough entries for it to mean anything.

**Story points:** 3

---

### US-6.7 — Choose whether to publish my badge

**As a** member **I want** to decide whether my badge is visible **so that** I control the disclosure.

**Acceptance criteria**

- [ ] Publishing my badge makes it visible on my card.
- [ ] Unpublishing removes it again.
- [ ] My badge appears as a badge on my card, never in a ranked list of changes.

**Story points:** 2

---

### US-6.8 — See a dependent without a score

**As a** guardian **I want** my kid's card to show a trend and nothing else **so that** she is part of the ritual without being ranked.

**Acceptance criteria**

- [ ] My kid's card shows her latest weight and a trend direction.
- [ ] No target, no progress percentage, no BMI and no award appear on her card.
- [ ] She is absent from the consistency ranking strip.
- [ ] No percentage of my kid's weight appears anywhere.

**Story points:** 3

---

### US-6.9 — Not be shown as missing

**As a** member **I want** hidden members to be invisible in absence lists **so that** the app does not expose them by omission.

**Acceptance criteria**

- [ ] A member who is private or not sharing is never listed as due, missing or overdue.
- [ ] Absence counts exclude members who have opted out of visibility.
- [ ] The group sheet says nothing about why anyone is or is not on it.

**Story points:** 2

---

### US-6.10 — Compare without ranking bodies

**As a** member **I want** to see everyone's progress side by side **so that** I can see the family without creating a winner.

**Acceptance criteria**

- [ ] Progress is shown as parallel bars, never as 1st/2nd/3rd.
- [ ] No screen shows who gained the most or lost the most.
- [ ] The only ranked element in the product is consistency, and it ranks check-in habits.

**Story points:** 2

---

### US-6.11 — Trust the filter

**As a** member **I want** to trust that the group view shows me nothing I am not allowed to see **so that** sharing in this group is safe.

**Acceptance criteria**

- [ ] Every board read is filtered on the server, before the response is sent.
- [ ] Integration tests cover every viewer role against every visibility level, dependent flag and ranking opt-out combination.
- [ ] Notes are never included in a board response except for their author.
- [ ] No client-side code can reveal a value that the server did not send.

**Story points:** 3
