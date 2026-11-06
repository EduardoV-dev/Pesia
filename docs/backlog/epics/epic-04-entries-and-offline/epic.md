# Epic 4 — Entries & offline capture

Anybody with permission can record a weigh-in, wherever they are — with or without a signal — and every entry says when it was measured, when it was recorded, and who recorded it. This is the epic that makes the family ritual survive a bad connection at grandma's house.

## Outcome

- A weigh-in can be recorded for oneself or for anyone who granted permission.
- Recording works **offline** and syncs exactly once when the connection returns.
- Every entry distinguishes *when the person was weighed* from *when it was typed*.
- Every entry is attributed to the person who recorded it, permanently.
- Typos can be corrected and entries can be deleted, with no ghost placeholders left behind.

## Scope

### Data model

```sql
entries (
  id                 uuid primary key,          -- generated on the client
  profile_id         uuid not null references profiles(id) on delete cascade,
  weight_kg          numeric(6,2) not null,      -- canonical storage
  measured_at        timestamptz not null,       -- when the person stood on the scale
  recorded_at        timestamptz not null default now(),
  recorded_by_user_id text not null,             -- permanent attribution, never cascades
  note               text null,                  -- private to the author, always
  deleted_at         timestamptz null,
  edited_at          timestamptz null,
  edited_by_user_id  text null
)
```

Three decisions worth stating out loud:

1. **`id` is generated on the client** (UUID v4). The same id is used when the entry is retried, so a flaky connection cannot create a duplicate. Sync is an idempotent upsert on `id`.
2. **`recorded_by_user_id` never cascades and is never nulled.** The person who recorded it is part of the record of what happened, even after their account is deleted (Epic 8). Deleting an account removes the *login*, not the fact that they were there.
3. **`measured_at` and `recorded_at` are different things.** Grandma's Sunday weight typed on Monday evening is `measured_at: Sunday`, `recorded_at: Monday`. Without this split, a family weighing in the evening and logging the next morning has every entry shifted by a day, and every weekly average is wrong.

`measured_at` is stored in UTC and rendered in the **group's** timezone, so a Sunday-night weigh-in never drifts to Monday for a family in another timezone.

### Offline capture

- The entry form is available with no network connection.
- Entries are queued in IndexedDB and flushed on reconnect, on app open, and via Background Sync where the browser supports it (Chrome/Android). Safari has no Background Sync, so the `online` event and app-open flush are the reliable path on iOS.
- Writes are append-only. Nothing is ever overwritten, so there is no conflict-resolution logic to get wrong — multiple entries per day are legitimate.
- Reads come from the last cached snapshot, so the group sheet is browsable offline.
- The UI states honestly whether an entry is queued or synced.

### Correction and deletion

- The recorder who created an entry may edit or delete it.
- A member may edit or delete their own entries.
- Edits record who edited and when.
- A deleted entry leaves **no placeholder** in the group view. The trend simply recomputes. A "hidden entry" marker would itself leak the information that something was withheld.

## Not in this epic

- Any statistics, trends or direction (Epic 5)
- The board and its rendering (Epic 6)
- Push notifications and cadence-driven reminders (Epic 7)
- Scale-device import, photos or notes beyond a private text field
- Bulk editing, backfilling a year of history in one action — entries are backdated individually

## Acceptance criteria

- [ ] **US-4.1** A member can record their own weight.
- [ ] **US-4.2** A member with permission can record someone else's weight.
- [ ] **US-4.3** A weigh-in recorded with no connection is queued and synced later.
- [ ] **US-4.4** An entry can be backdated to the day it was actually measured.
- [ ] **US-4.5** A typo can be corrected, and the edit is attributed.
- [ ] **US-4.6** An entry can be deleted and leaves no placeholder.
- [ ] **US-4.7** Anyone who can see the entry can see who recorded it.
- [ ] **US-4.8** A private note is visible only to its author, at every visibility level.
- [ ] **US-4.9** A member can see their own entry history.
- [ ] **US-4.10** A queued entry syncs exactly once, no matter how many times the queue is flushed.
- [ ] Recording an entry for someone without permission is refused server-side, not merely hidden in the UI.
- [ ] Entries carry both timestamps and they are displayed distinctly.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 3 | Needs a group, a subject profile and a log permission |
| Blocks | 5 | Statistics are computed from entries |
| Blocks | 6 | The board renders entry-derived progress |
| Blocks | 7 | Reminders are answered by new entries |

## Risks

| Risk | Mitigation |
|---|---|
| Duplicate entries from a retried sync | Client-generated UUID plus idempotent upsert on `id`; covered by a test that flushes the same queue repeatedly |
| Safari has no Background Sync | Flush on app open and on the `online` event; treat Background Sync as an enhancement |
| Clock skew on the device makes `measured_at` wrong | The recorder can backdate or correct; the measured date is explicitly editable for exactly this reason |
| Editing an entry breaks the offline snapshot | Edits are timestamped and re-synced with the same append-safe semantics |

## Size

**2.5 working days** · 23 story points
