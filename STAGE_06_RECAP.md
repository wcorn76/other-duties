# STAGE 06 — RECAP
Status: Complete   Date: 2026-07-02

Built Hall Duty: a timed discretion level. Students fill the hall; guilty ones
are marked with a floating "!". Cite the guilty for points; wrong-cite an
innocent and you lose a heart. A runner bolts and tires out. When the bell rings,
uncited guilty kids are tallied as tardies. Clearing all guilty first = "Hall
cleared!". First Period is untouched. All committed to `main` and pushed.

## Definition of Done — results
- [x] 1. Data-driven students (STUDENT_SPAWNS retired; period_1 unchanged) — students now come from a `students` array in the period JSON; `buildPeriod` passes `students`/`timeLimit`/`discretion` through; First Period's 4 students moved into `period_1.json` and play identically (verified by screenshot).
- [x] 2. Discretion mechanic + fair "!" tell; wrong-cite costs a heart, gated by `discretion` — `Student` extended with `upToNoGood`/`behaviour` + a red floating "!" (and a subtle warm tint). Slip routes via `hallDuty.citeOutcome`. Guilty cite = remove+points+objective; innocent cite (discretion only) = a heart (i-frames respected, flash, NO knockback), no points, kid stays with a "?!" beat. In non-discretion periods every cite just scores (Stage 5 behaviour preserved).
- [x] 3. `cite` objective type (counts guilty only) wired to HUD + complete flow — `objectives.js` counts `cite:done { guilty:true }` toward `{ type:'cite', count }`, shows `(progress/count)` in the live ticker, completes → `objectives:allcomplete` → "Hall cleared!". `scripts/test-objectives.mjs` proves guilty-only counting.
- [x] 4. Runner (bolt + decelerate) + "We've got a runner!" — `behaviour:'runner'` loiters until the player is within `RUNNER_TRIGGER_RADIUS`, then flees away at a decaying speed (`hallDuty.runnerSpeed`), firing a HUD announce. Still guilty/citeable. Curve tested in `scripts/test-hallduty.mjs`.
- [x] 5. Tardy bell / countdown HUD + tardy tally + results panel — `hud.setTimer` shows `m:ss` in the gap between gear and score (no overlap), reddens + flashes under 10s. At 0 → freeze, tally `countUncitedGuilty`, apply `TARDY_PENALTY` per tardy, show "Bell rings! — X tardies • Final score N" → E → Title. Composure 0 at any time is still the hard fail. Tally tested in `test-hallduty.mjs`.
- [x] 6. buildPeriod supports direct objectives array (taskPool still works) — if `taskPool` exists it picks 3 as before (keeping all entities filtering); otherwise it uses `objectives` directly and keeps all entities. `test-tasks.mjs` still passes.
- [x] 7. Temporary Title period-select (First Period / Hall Duty) — arrow/W-S + E/Enter (or click, or 1/2) launches `PeriodScene` with the chosen period's JSON. Clearly commented as a temporary testing affordance.
- [x] 8. hall_duty_1.json launchable end-to-end — `discretion:true`, `timeLimit:60`, 8 students (4 guilty incl. a runner and one `canDamage`, 4 innocent), `{type:'cite',count:4}`, `onComplete.title:"Hall cleared!"`. Verified all paths by screenshot (play / wrong-cite / bell / win).
- [x] 9. Clean build + all node tests pass + pushed — `npm run build` clean (Phaser chunk advisory only); all 5 `scripts/test-*.mjs` pass; pushed to `origin/main`.

## Morning play-check for the owner (exact clicks on https://other-duties.vercel.app/)
1. On the Title screen you'll see a menu: **First Period** and **Hall Duty**. Use ↑/↓ (or click) and press **E** to pick **Hall Duty**.
2. A "Hall Duty" briefing card lists the objective ("Cite the kids up to no good (0/4)"). Press **E** to start — the **countdown starts at 1:00** (top strip, between "[Space] Slip" and "Score").
3. The hall has 8 kids. **The 4 with a red "!" over their heads (and a slightly warmer colour) are guilty**; the 4 plain ones are innocent.
4. Walk up to a **guilty ("!") kid**, face them, press **SPACE** → DETENTION! pop, they vanish, **Score +100**, objective ticks up. Cite a few.
5. Now cite a **plain (innocent) kid** on purpose → you get a blue **"?!"**, **lose a heart** (top-left), **no points**, and the kid **stays**. (That's the discretion penalty.)
6. One guilty kid is a **runner**: walk toward it and it **bolts away fast then tires** — a "We've got a runner!" banner flashes. Chase it down and **SPACE** to cite.
7. To see the **bell**: just let the clock run to **0:00** (it reddens/flashes under 10s) → "**Bell rings! — X tardies • Final score N**" (each still-loose guilty kid is a tardy, −40 each). Press **E** → Title.
8. To see the **hard fail**: the reddish guilty kid can bump you; take contact hits (and/or wrong-cite) until hearts hit 0 → "**Composure lost**" → **E** → Title.
9. To see the **win**: cite **all 4 guilty** before the bell → "**Hall cleared!** — Up next: lunch_1".
10. Back at Title, pick **First Period** and confirm it plays exactly as before (random 3 tasks, no timer, no wrong-cite penalty) and still reaches "**Period complete!**".

## Live check
- Live URL: https://other-duties.vercel.app/  (pushed? **yes**; now shows: the Title period-select plus the full Hall Duty level and the unchanged First Period.)

## Data formats / APIs actually used (Stage 7 depends on these)
- **Student data shape** — `{ id, x, y, upToNoGood?, behaviour?, tint?, speed?, canDamage?, sprite? }` in a period's `students[]`. `behaviour` ∈ `"wander" | "loiter" | "runner"`. Guilty (`upToNoGood:true`) get a red "!" marker (auto) + a default warm tint if none given. Spawned in `PeriodScene.create()` into `scene.students` (the slip scans that array).
- **`discretion` flag + slip routing** — `hallDuty.citeOutcome(upToNoGood, discretion)` → `'points' | 'guilty' | 'innocent'`. Slip emits **`cite:done { id, guilty }`** (additive `guilty` boolean). Scene: points if `!discretion || guilty`; heart lost if `discretion && guilty===false`.
- **`cite` objective** — `{ id, type:'cite', count:N, text }`; `objectives.js` increments on `cite:done{guilty:true}` only, completes at N (shows `(progress/count)`), fires `objectives:allcomplete`.
- **Runner** — constants in `src/systems/hallDuty.js`: `RUNNER_TRIGGER_RADIUS=72`, `RUNNER_START_SPEED=135`, `RUNNER_MIN_SPEED=24`, `RUNNER_DECEL=60`. `runnerSpeed(elapsedMs)` = linear decay start→floor. Trigger + flee live in `Student.updateRunner`; the announce is `scene.onRunnerTriggered()`.
- **Countdown/bell** — `timeLimit` is in SECONDS. `hud.setTimer(seconds, warning)` (m:ss, reddens on warning) + `hud.pulseTimer()`. Bell flow in `PeriodScene.ringBell()`: freeze → `countUncitedGuilty(students)` → `score.add(-TARDY_PENALTY*tardies)` → results panel → Title. `TARDY_PENALTY=40` (in hallDuty.js). New event **`bell:done { tardies }`** (per verb:done convention). `LOW_TIMER_SECONDS=10` (scene).
- **buildPeriod selection** — `if (period.taskPool)` → pick-N + entity-needs filtering (First Period); else use `period.objectives` directly + keep all entities (Hall Duty). Always returns `{ id, name, spawn, objectives, entities, students, timeLimit, discretion, onComplete }`.
- **Title launcher** — `this.scene.start('PeriodScene', { period: <periodJson> })`; `PeriodScene.init(data)` reads `data.period` (falls back to First Period). That `{ period }` handoff is the seam a real progression system replaces.

## New/changed files
- New: `src/systems/hallDuty.js`, `data/periods/hall_duty_1.json`, `scripts/test-objectives.mjs`, `scripts/test-hallduty.mjs`, `STAGE_06_RECAP.md`.
- Changed: `src/entities/Student.js` (upToNoGood/behaviour/"!"/loiter/runner + marker teardown), `src/systems/detentionSlip.js` (guilty/innocent routing + "?!" beat), `src/systems/objectives.js` (`cite` type), `src/systems/tasks.js` (direct-objectives path + passthrough), `src/ui/hud.js` (`setTimer`/`pulseTimer`), `src/scenes/PeriodScene.js` (data-driven students, discretion wiring, countdown/bell, runner announce, period-from-data), `src/scenes/TitleScene.js` (period-select), `data/periods/period_1.json` (students array).

## Deviations from canon (and why)
- **First Period students moved into `period_1.json`** (`upToNoGood:false`, `behaviour:'wander'`); identical positions/behaviour to the old in-scene scaffold, so it plays exactly as before. `student_rowdy` kept `canDamage` + its tint.
- **Guilty tint added on top of the "!"** — a subtle warm tint reinforces the marker (only applied when the student spec doesn't set its own tint). The "!" remains the primary, fair tell.
- **New `bell:done { tardies }` event** added (allowed by the brief, named per convention). Nothing listens to it yet; it's there for Stage 7.
- **Timer placed in the gear→score gap** (x≈282), not literally top-center, because the active-gear indicator already owns top-center; this guarantees zero overlap with hearts/gear/score. Logged as the reasonable choice.
- **Hall Duty win reuses the generic complete flow** with a per-period `onComplete.title` ("Hall cleared!") rather than a new panel type.
- Chose concrete values (timeLimit 60, TARDY_PENALTY 40, runner 135→24 over ~1.85s, trigger radius 72, low-timer 10s, guilty tint 0xffd27f) — all named constants at the tops of their files.

## Friction points
- Deciding where the countdown lives without touching the Stage 5 HUD slots — solved with the dedicated gap between gear and score.
- Keeping the runner citeable while it flees: it's a normal guilty Student, so the existing slip hitbox catches it; the only new logic is its velocity, which stays Node-testable as a pure curve.

## Open questions for the hub
- Score economy: cite +100, task +50, tardy −40 are placeholders — confirm the real numbers (a well-played Hall Duty currently lands ~+450; a lazy one can go negative).
- Should wrong-citing also give brief i-frames the way a contact hit does? Currently yes (shared composure i-frames), so you can't lose two hearts to two fast mis-swipes — confirm that's desired.
- Runner: should it re-trigger / keep fleeing if it reaches a wall and stalls? Currently it flees directly away and can pin to a wall; a smarter path is a Stage 7 idea.

## Ready-state for Stage 7
- Data-driven students with `upToNoGood`/`behaviour` and clean extension points; add new behaviours by extending `Student.chooseBehaviour`/`updateRunner` and the `hallDuty.js` rules.
- A generic timed-period harness: any period with `timeLimit` gets the countdown + bell; any with `discretion` gets the guilty/innocent routing; `cite` objectives + `bell:done` are available.
- `buildPeriod` handles both taskPool-pick and direct-objectives periods; the Title `{ period }` handoff is the seam for a real progression/menu.
- Out-of-scope items intentionally deferred (logged as Stage 7 ideas): the real First-Period→Hall-Duty handoff + save/progression, group herding, extra archetypes, the walkie tool, smarter runner pathing.
