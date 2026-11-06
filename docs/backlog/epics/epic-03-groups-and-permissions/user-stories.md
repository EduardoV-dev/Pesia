# User Stories — Epic 3 — Groups, roles & permissions

## Personas in this epic

| Persona | Need |
|---|---|
| **Nina** (guardian/owner) | Control who is in the family group and what each person shares |
| **Ana** (recorder) | One role that lets me log everyone's weight, and nothing more |
| **Luis** (member) | Say exactly who may record my weight, and who may see it |
| **Sofía** (private member) | A way to be in the group without being measured |

---

### US-3.1 — Create a group

**As a** member **I want** to create a group **so that** I have a place to gather the people we weigh together.

**Acceptance criteria**

- [ ] I can name a group and create it.
- [ ] I become its Owner automatically.
- [ ] The group is not discoverable by anyone who has not been invited.

**Story points:** 2

---

### US-3.2 — Invite someone with a link

**As an** Owner **I want** to share an invite link **so that** I can add someone to the family group in one message.

**Acceptance criteria**

- [ ] I can generate a link that adds the recipient to this group.
- [ ] The link adds the recipient to this group and to no other.
- [ ] I can revoke the link at any time, after which it stops working.

**Story points:** 2

---

### US-3.3 — Invite someone with a code

**As an** Owner **I want** to read a 6-character code aloud **so that** I can add someone who is not near my screen.

**Acceptance criteria**

- [ ] I can generate a 6-character code for the group.
- [ ] Entering the code adds the recipient to the group.
- [ ] The code is unambiguous to read aloud (no easily confused characters such as `0`/`O` or `1`/`l`).

**Story points:** 1

---

### US-3.4 — Join a group by invitation

**As a** member **I want** to join a group I was invited to **so that** I can take part in the weigh-in.

**Acceptance criteria**

- [ ] Given a valid invite, when I open it, then I am shown the group name and what joining means before I confirm.
- [ ] Joining adds me to that group and grants no other access.
- [ ] Given an invalid or revoked invite, then I am told so plainly and am not added to anything.

**Story points:** 2

---

### US-3.5 — Revoke an invite link

**As an** Owner **I want** to revoke a link I shared too widely **so that** it stops being a way in.

**Acceptance criteria**

- [ ] Revoking a link makes it unusable immediately.
- [ ] Members who already joined through it keep their membership.
- [ ] I can issue a replacement link at any time.

**Story points:** 1

---

### US-3.6 — Promote someone to Logger

**As an** Owner **I want** to promote a member to Logger **so that** another person can weigh in when I cannot.

**Acceptance criteria**

- [ ] Only an Owner can change a role.
- [ ] A promoted Logger can record weights for any member of the group.
- [ ] A Logger gains no management rights over the group.

**Story points:** 2

---

### US-3.7 — Let someone log my weight

**As a** member **I want** to name the people allowed to record my weight **so that** my scale partner can do it and nobody else can.

**Acceptance criteria**

- [ ] I can grant a specific member permission to record my weight in this group.
- [ ] The permission is per group, not global.
- [ ] I can see who currently holds permission to record my weight.

**Story points:** 2

---

### US-3.8 — Revoke a log permission

**As a** member **I want** to revoke someone's permission to record my weight **so that** it takes effect at once.

**Acceptance criteria**

- [ ] Revoking takes effect immediately — the next attempt to record my weight is refused.
- [ ] The person whose permission was revoked is not notified with a reason.
- [ ] My own ability to record my weight is unaffected.

**Story points:** 1

---

### US-3.9 — Control what the group sees

**As a** member **I want** to choose how much the group sees of me **so that** sharing is my decision, not a default I forgot to change.

**Acceptance criteria**

- [ ] I can set my visibility to one of: weight and trend, latest weight only, name only, or private.
- [ ] The default is "weight and trend".
- [ ] My choice applies to every read the group makes of me.

**Story points:** 2

---

### US-3.10 — Opt out of the ranking

**As a** member **I want** to opt out of ranking while staying in the group **so that** I can take part without being scored.

**Acceptance criteria**

- [ ] I can turn ranking opt-out on and off at any time.
- [ ] Opting out does not remove me from the group or from the weigh-in sheet.
- [ ] Opting out is independent of my visibility setting.

**Story points:** 1

---

### US-3.11 — Set my weigh-in cadence

**As a** member **I want** to say how often I should be weighed **so that** the app asks me at my pace.

**Acceptance criteria**

- [ ] I can set a cadence of weekly, every two weeks, monthly, or none.
- [ ] My cadence affects only when I am asked, never whether I am allowed to record.

**Story points:** 1

---

### US-3.12 — Set the group weigh-in day

**As an** Owner **I want** to set the day we weigh in **so that** it happens at the same time each week.

**Acceptance criteria**

- [ ] I can set a weekday and an optional time for the group.
- [ ] The setting is visible to all group members.
- [ ] The group has a sensible default when no day is set.

**Story points:** 1

---

### US-3.13 — Remove a member

**As an** Owner **I want** to remove someone from the group **so that** the membership list reflects who is actually taking part.

**Acceptance criteria**

- [ ] Removing a member closes their membership immediately.
- [ ] Their past entries remain in the group's history — the confirmation says so explicitly.
- [ ] The removed member is no longer listed on the weigh-in sheet.

**Story points:** 2

---

### US-3.14 — Leave a group

**As a** member **I want** to leave a group **so that** I am no longer part of it.

**Acceptance criteria**

- [ ] Leaving closes my membership immediately.
- [ ] My past entries remain in the group's history, and I am told this before I confirm.
- [ ] Leaving an owned group requires transferring ownership first.

**Story points:** 1

---

### US-3.15 — Delete a group

**As an** Owner **I want** to delete a group **so that** it is gone completely.

**Acceptance criteria**

- [ ] Deleting requires an explicit confirmation that names the group.
- [ ] Deleting removes the group, its memberships, its entries and its settings.
- [ ] It cannot be undone, and the UI says so before the action is taken.

**Story points:** 1

---

### US-3.16 — Appoint a new recorder

**As an** Owner **I want** to be prompted to appoint a new Logger when the recorder leaves **so that** the weigh-in sheet still works.

**Acceptance criteria**

- [ ] When the last Logger leaves, the Owner is prompted to appoint a replacement.
- [ ] Until a replacement is appointed, the group shows that no recorder is assigned — it does not silently fail.
- [ ] The new Logger's permissions take effect immediately.

**Story points:** 2

---

### US-3.17 — Log without gaining access

**As a** member **I want** my weight to be recordable by someone I trust without that person gaining access to my history **so that** the recorder role stays narrow.

**Acceptance criteria**

- [ ] A Logger can record my weight without being able to open my full history.
- [ ] Reading my data follows my visibility setting, independently of any log permission I granted.
- [ ] No code path treats write permission as read permission — verified by an integration test covering every role against every visibility level.

**Story points:** 3
