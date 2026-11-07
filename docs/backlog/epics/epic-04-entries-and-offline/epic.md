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
  id                 uuid primary key,          -- generated on the client (no server default)
  profile_id         uuid not null references profiles(id) on delete cascade,
  group_id           uuid not null references groups(id) on delete cascade,
  weight_kg          numeric(6,2) not null,      -- canonical storage
  measured_at        timestamptz not null,       -- when the person stood on the scale
  recorded_at        timestamptz not null,       -- when it was typed (client clock)
  recorded_by_user_id text not null,             -- permanent attribution, never cascades
  recorded_by_name   text not null,              -- display name captured at insert, survives login deletion
  note               text null,                  -- private to the author, always
  deleted_at         timestamptz null,
  edited_at          timestamptz null,
  edited_by_user_id  text null,                  -- same permanence rules as the recorder
  edited_by_name     text null
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

## Manual session checklist (US-4.2 / US-4.10, Playwright-style)

Executed once per epic against a dev build (Chromium at 390px, plus the automated
`scripts/check-ui.mjs` route pass at 360px):

1. **Recorder logs the person next to them.** With a Logger session on `home`, select
   the other member's chip, type the weight (comma or dot accepted), press *Guardar
   peso* → confirmation names that person, the day sheet marks them done with the
   visible weight, and a `POST /api/entries` lands with a stored row whose
   `measured_at` = today and `recorded_by_name` = the recorder's profile name.
2. **Permission gap is impossible from the UI and refused by direct request.** The
   selector only offers profiles under `can_log_for`; a direct `POST /api/entries`
   for an unpermitted subject returns `failed` with
   "No tenés permiso para registrar el peso de esta persona." and stores nothing
   (also locked by `entry-writes.test.ts`).
3. **Record for several people in one session.** After each save the sheet stays on
   the same person until the explicit *Pasar a …* action, and previews the next
   unweighed roster member.
4. **No connection.** With the device offline the save queues ("Pendiente de envío"),
   a reload serves the cached offline shell with the pending badge still showing,
   and reconnecting flushes: the queued row appears server-side exactly once
   (verified in `/tmp/opencode`-style smoke runs; covered by the queue tests for
   ordering, batching and idempotence).
5. **Correction and deletion with attribution.** From the member's history page,
   the recorder edits the weight or backdates the day ("Medido el …" changes and
   "Registrado el …" keeps its original instant), or deletes with the confirmation
   dialog; a server-side check shows the row flipped `deleted_at` and the history
   renders no placeholder.

## Copy review (G2 / G3 / G5) — every Spanish string added in this epic

Reviewed string by string against the guardrails: no single-reading deltas, no
pass/fail verdicts, no nudges, no moralised verbs, and no red/green semantics
anywhere. Notables:

- "El peso debe estar entre 1 y 300 kg." · "Escribí un número." · "La nota es muy
  larga." · "El día de la pesada no puede ser futuro." — neutral range messages,
  the range is stated, nothing is clamped.
- "No tenés permiso para registrar el peso de esta persona.", "No sos parte de este
  grupo.", "Esa persona no está en este grupo." — the refusal states its reason,
  no verdict on the person.
- "Pendiente de envío" / "Guardado" / "No se pudo sincronizar" (+ reason) /
  "N pesadas sin sincronizar — se envían cuando vuelva internet." — honest queue
  states, no praise or blame.
- "Medido el … · Registrado el …", "Registrado por … · sin cuenta activa",
  "Corregido por … el …" — pure facts, the two readings are distinct.
- Sheet and history verbs: "Guardar peso", "Corregir", "Eliminar", "Guardar cambio",
  "Pasar a …", "Pesada de … lista." — task verbs only; "lista" reports completion
  of the action, not a verdict on the person.
- Direction language, deltas and goals are absent by design (Epic 5 owns them).
  Result: **PASS**, no copy changes required.

## Acceptance criteria

- [x] **US-4.1** A member can record their own weight. (`WeighInSheet` + `createEntry`
      self-write; verified in smoke + `entry-writes.test.ts`)
- [x] **US-4.2** A member with permission can record someone else's weight.
      (`canLogFor` write check; smoke + tests)
- [x] **US-4.3** A weigh-in recorded with no connection is queued and synced later.
      (IndexedDB queue + flush triggers; smoke verified offline→online)
- [x] **US-4.4** An entry can be backdated to the day it was actually measured.
      (edit keeps `recorded_at`; `entry-writes.test.ts`)
- [x] **US-4.5** A typo can be corrected, and the edit is attributed.
      (`editEntry` + `assertEntryEditor`; smoke + tests)
- [x] **US-4.6** An entry can be deleted and leaves no placeholder.
      (soft delete filtered by the assembler; `entry-writes.test.ts`)
- [x] **US-4.7** Anyone who can see the entry can see who recorded it.
      (assembler shows `recordedByName`; visibility tests)
- [x] **US-4.8** A private note is visible only to its author, at every visibility level.
      (note withheld inside `listEntriesForViewer`; matrix tests)
- [x] **US-4.9** A member can see their own entry history.
      (self history section; assembler self branch)
- [x] **US-4.10** A queued entry syncs exactly once, no matter how many times the
      queue is flushed. (client UUID + upsert; tested flushing 3× → 1 row)
- [x] Recording an entry for someone without permission is refused server-side, not
      merely hidden in the UI. (write check per op; roster filters the selector too)
- [x] Entries carry both timestamps and they are displayed distinctly.
      (History rows render "Medido el … · Registrado el …")

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
