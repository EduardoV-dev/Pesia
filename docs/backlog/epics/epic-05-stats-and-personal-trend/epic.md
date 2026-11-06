# Epic 5 — Stats engine & personal trend

Each member sees their own trend, measured against their own goal, with no false alarms and no moralising. Every formula in this epic exists to stop a number from meaning more than it should.

## Outcome

- The statistics are pure, tested functions with no UI dependency.
- A member sees a smoothed trend line, not a scatter of raw readings.
- Direction is reported only when it is real; otherwise the member is told they are stable.
- Progress is expressed relative to the member's own target, never to a global scale.
- BMI is available only if a member turns it on, and stays private to them.

## Scope

### The formulas

All of these are pure functions over entries, unit-tested independently of the UI.

| Function | Definition | Why it exists |
|---|---|---|
| `dailyValue(entries)` | Mean of a calendar day's entries | Several readings a day are one day, not several data points |
| `rollingMean(daily, window = 7)` | Moving average over the last 7 days | Kills the noise a single reading carries |
| `direction(now, fourWeeksAgo)` | `up` \| `down` \| `stable` | Compares like with like |
| `direction` deadband | Changes below **0.3 kg/week** report `stable` | Normal weekly swing is 0.5–1 kg; without a deadband the app manufactures false wins and false alarms |
| `progressPct(current, start, target)` | `clamp((current − start) / (target − start), 0, 100)` | Progress against your own target, never someone else's |
| `pctBodyMassChange(current, start)` | `(current − start) / start × 100` | Comparable across body sizes — the secondary stat |
| `maintainProgress(current, target, band)` | 100% while `\|current − target\| ≤ band` | Holding steady is a goal, not a failure to move |
| `goalChanged()` | New baseline at the weight at the time of the change | Recomputing from the original baseline produces nonsense like 140% |

The deadband is the anti-shaming core of this epic. A member whose weight moved 0.4 kg in a week has not "gained" anything — they have had a normal week. The app says "stable" and moves on.

### Direction is goal-relative

The same physical change means opposite things to two people. A member heading toward their target shows "moving toward your goal"; a member moving away shows "moving away from your goal". The **sign is relative to the member's own direction**, never a moral judgement, and never the bare words "gained" or "lost" attached to a red number (guardrails G2, G3).

### What a member without a target sees

A trend, a direction, and a percentage change. No progress bar, no "0% toward goal", no empty state that implies they have failed at a task. Having no target is a valid configuration, not a missing one.

### Dependents

A dependent profile is **trend-only**: weight history, direction, and stability. No target, no progress percentage, no BMI, no ranking (guardrail G9). Pediatric BMI would need age- and sex-specific percentile tables, and adult BMI categories applied to a child are wrong — so the option does not exist for dependents.

### BMI (optional, private)

- **Off by default.** A member must actively turn it on.
- **Private to the member.** Never on the board, never in a share, never in an award.
- Requires height, which is optional profile data and is collected only if the member opts in.
- Framed as a **screening measure, not a diagnosis**, with a pointer to discuss it with a doctor. No category labels ("overweight", "obese"), no colour coding, no thresholds shown as pass/fail.
- BMI is never compared between people and never used in any award or ranking.

> Rationale: the CDC and the National Academies both describe BMI as a population screening tool that cannot distinguish muscle from fat and whose risk association varies with age, sex and ethnicity. It is useful as a private reference and misleading as a verdict.

## Not in this epic

- The group board (Epic 6) — this epic computes; Epic 6 renders for others
- Awards of any kind (Epic 6)
- Body fat, body composition or any metric beyond weight and the optional BMI (deliberately out of scope)
- Calorie or nutrition statistics (deliberately out of scope — guardrail G5)
- Predictive modelling or "you will reach your goal by..." estimates — a forecast about someone's body is exactly the kind of claim this product must not make

## Acceptance criteria

- [ ] **US-5.1** A member sees a smoothed trend line of their own weight.
- [ ] **US-5.2** A member sees whether they are moving toward or away from their own goal.
- [ ] **US-5.3** A member sees their percentage change since the baseline.
- [ ] **US-5.4** A member sees progress toward their target, clamped to 0–100%.
- [ ] **US-5.5** A member whose weight moves less than the deadband is told they are stable.
- [ ] **US-5.6** A member with a maintain goal sees progress against the band.
- [ ] **US-5.7** A member who changed their target sees the baseline reset and progress restart at 0%.
- [ ] **US-5.8** A member can turn on BMI privately and can turn it off again.
- [ ] **US-5.9** A member who has missed weeks sees a trend that does not fabricate a direction.
- [ ] **US-5.10** A member with no target set sees a trend, a direction and a percentage change — not an empty progress bar.
- [ ] A member with no target sees a useful view, not an error or a zeroed progress bar.
- [ ] A dependent profile shows trend only — no target, no progress, no BMI.
- [ ] No screen anywhere shows a raw delta between two readings (guardrail G2).
- [ ] The deadband is covered by unit tests: a flat week reports `stable`, a sustained change reports a direction.

## Dependencies

| Direction | Epic | Why |
|---|---|---|
| Depends on | 4 | Statistics are computed from entries |
| Depends on | 2 | Goals and baselines come from the profile epic |
| Blocks | 6 | The board renders each member's progress |

## Risks

| Risk | Mitigation |
|---|---|
| A deadband that is too tight still produces false alarms | The 0.3 kg/week threshold is a floor, not a ceiling; the threshold is a named constant with a unit test that pins the behaviour |
| Missing weeks are interpolated into a fake trend | Gaps are rendered as gaps. A direction requires enough data on both sides of the comparison window |
| BMI turns into a verdict | Off by default, private, no category labels, never compared, never ranked — enforced by the absence of any comparison code path |
| "Progress toward goal" pressures a member who set no goal | The no-target view is a first-class screen, not an empty state |

## Size

**2 working days** · 24 story points
