# STAGE 05 — RECAP
Status: Complete   Date: 2026-07-02

Built the stakes layer: citeable students, the detention slip (Space), a
composure/hearts system you can lose, and a live score — with the HUD's reserved
slots (hearts, score, center gear) now wired live. All committed to `main` and
pushed; the normal period loop still completes.

## Definition of Done — results
- [x] 1. Student entity (reusable) + placeholder sprite — `src/entities/Student.js`; wanders/idles on a timer, collides with walls, freezes with play. Clean extension points (`chooseBehaviour(now)`, `canDamage`, `cite()`) documented for Stage 6. `student.png` added via the generator. 4 test students spawn each run.
- [x] 2. Detention slip (Space): swipe + hitbox + cite + cite:done + active-gear HUD — `src/systems/detentionSlip.js`; directional hitbox in front of the player by facing, swipe flash + "DETENTION!" pop + poof, `SLIP_COOLDOWN_MS` cooldown, emits `cite:done { id }`. HUD center shows "[Space] Slip" and pulses on use.
- [x] 3. score.js + live HUD score — `src/systems/score.js` (Phaser-free); cite = +100, task complete = +50 each; `onChange` feeds `hud.setScore()`. `scripts/test-score.mjs` passes.
- [x] 4. composure.js + live HUD hearts — `src/systems/composure.js` (Phaser-free); `damage()` reduces + clamps at 0, i-frames block repeat hits, zero → `onFail`. Scene adds knockback + a flash on a landed hit; zero → "Composure lost" panel → Title. Hearts fill/empty live. `scripts/test-composure.mjs` passes.
- [x] 5. Integration — verified by headless screenshots: cite raises score (200 after 2 cites), a landed hit drops hearts 3→2 with knockback/flash, draining to 0 shows "Composure lost", AND a full run still shows "Period complete!" (Score 150 from 3 task bonuses).
- [x] 6. buildPeriod name passthrough — `buildPeriod` now returns `{ id, name, spawn, objectives, entities, onComplete }`; the to-do card reads `this.period.name` from the built object (no more raw-JSON fallback). `test-tasks.mjs` still passes.
- [x] 7. Builds clean + pushed — `npm run build` clean (only the expected Phaser chunk-size advisory). Pushed to `origin/main`.

## Morning play-check for the owner (what to click on the live URL)
Open https://other-duties.vercel.app/ and:
1. Press any key → the "First Period" to-do card appears (3 randomly-picked tasks). Press **E** to start.
2. Look at the top strip: **3 red hearts** (left), **[Space] Slip** (center), **Score 0** (right).
3. Walk (WASD/arrows) up to any wandering **student** (the kids with caps/backpacks), face them, and press **SPACE** to swipe → a **"DETENTION!"** pop + poof, the student vanishes, and **Score jumps by 100**. Cite a couple.
4. Find the **reddish "rowdy" student** and walk into it → you take a hit: **a heart empties**, you get **knocked back** and **flash** briefly (you're invulnerable for ~1s during the flash).
5. Keep bumping the rowdy student (wait for the flash to end between hits) until all 3 hearts are gone → **"Composure lost"** panel → press **E** → back to Title.
6. Start a **fresh run** and instead just do the tasks (talk to teachers = walk up + E + pick answers; pick up trash = E on each; copier = talk to Mrs. Prince for the paper, carry it to the copier, E) → when all 3 are done you get **"Period complete!"** with the score from your task bonuses.
(Note: which 3 tasks appear is random per run, so a couple of refreshes shows the variety.)

## Live check
- Live URL: https://other-duties.vercel.app/  (pushed? **yes**; now shows: the Stage 5 build — citeable students, detention slip on Space, live hearts + score, lose-at-zero, plus the existing period loop. This is also the first push carrying Stages 4–5, since those were unpushed locally.)

## Data formats / APIs actually used (Stage 6 depends on these)
- **Student entity** — `new Student(scene, { id, x, y, sprite?, tint?, canDamage?, speed? })`. Spawned from an in-scene `STUDENT_SPAWNS` array in `PeriodScene` (test harness), collided with walls, updated each frame, and tracked in `scene.students` (the slip reads that array). **Hall Duty can extend it by**: overriding `chooseBehaviour(now)` for herding / "up to no good", setting `speed`, toggling `canDamage`, and overriding `cite()`. Replace `STUDENT_SPAWNS` with data-driven spawns (e.g. a `students` array on the period) when ready.
- **Slip** — `SLIP_COOLDOWN_MS = 350`; hitbox is `HITBOX_LEN (22)` in the facing direction × `HITBOX_WIDTH (20)` across, offset `HITBOX_GAP (4)` in front (see `hitboxFor(facing)` using the DIR unit-vector table). Cite payload: **`cite:done { id }`** on `scene.bus`. It cites every active student whose bounds intersect the hitbox.
- **composure API** — `new Composure({ max, iframeMs, onChange(cur,max), onFail() })`; `damage(amount = DAMAGE_PER_HIT, now)` → `{ blocked, hp, dead }` (blocked during i-frames or after fail). Constants: `STARTING_HEARTS = 3`, `IFRAME_MS = 1000`, `DAMAGE_PER_HIT = 1`. Knockback/flash live in the scene: `KNOCKBACK_STRENGTH = 170`, `KNOCKBACK_MS = 200`; `Player.knockback(vx, vy, ms)` makes the player slide (ignores input) for that window. Fail hook → `onComposureLost()` → message panel → `scene.start('TitleScene')`.
- **score API** — `new Score({ onChange(value, reason) })`; `addCite()` (+`POINTS_PER_CITE = 100`), `addTaskComplete(n)` (+`POINTS_PER_TASK = 50` each), `add(points, reason)`, `getValue()`. HUD reads it via the `onChange` callback → `hud.setScore(value)`. The scene awards task points by diffing the done-count on `objective:updated`.
- **Active-gear HUD** — `hud.setActiveGear(label)` shows `[Space] <label>` in the reserved center slot; `hud.pulseGear()` flashes it. Hearts: `hud.setHearts(current, max)`. Score: `hud.setScore(value)`.

## New/changed files
- New: `src/entities/Student.js`, `src/systems/detentionSlip.js`, `src/systems/score.js`, `src/systems/composure.js`, `scripts/test-score.mjs`, `scripts/test-composure.mjs`, `public/assets/sprites/student.png`, `STAGE_05_RECAP.md`.
- Changed: `scripts/gen-placeholder-assets.mjs` (student sprite), `src/entities/Player.js` (knockback + mid-knockback slide), `src/ui/hud.js` (live hearts/score/gear + pulse), `src/systems/tasks.js` (name/id passthrough), `src/scenes/PeriodScene.js` (spawn students, slip, score, composure, damage overlaps, hit/fail handlers, wire HUD, read period name from built object).

## Deviations from canon (and why)
- **Students are spawned from an in-scene `STUDENT_SPAWNS` constant, not from period data.** The brief said "spawn a few students for testing" and Stage 6 owns Hall Duty's real student system, so I kept them in-scene (always present regardless of the random 3 tasks) rather than inventing a period-data shape now. Easy to move to data later.
- **Task-complete scoring is awarded by diffing the done-count on `objective:updated`** (there is no per-objective-complete event). Awards `POINTS_PER_TASK` per newly-done objective. Backward-compatible; no event shapes changed.
- **`buildPeriod` now also returns `id`/`name`** (item 6). Existing `test-tasks.mjs` assertions (spawn/onComplete by reference) still pass; nothing removed.
- Chose concrete tunable values (cooldown 350ms, i-frames 1000ms, knockback 170/200ms, 100/50 points, 3 hearts) — all named constants at the top of their files, easy to retune.

## Friction points
- Knockback had to survive `Player.update()` overwriting velocity from input each frame — solved with a `knockbackUntil` window during which update() skips input and lets the shove ride (clean, and a reusable pattern).
- i-frames needed to be testable in Node, so composure takes an explicit `now` timestamp rather than reading a Phaser clock — keeps the core pure while the scene passes `scene.time.now`.

## Open questions for the hub
- Should citing the **rowdy/damaging** student be the intended counter to it (cite it → it's gone → no more damage)? That's how it currently plays and it feels good, but confirm the design intent.
- Point values (100 cite / 50 task) and starting hearts (3) are placeholders — confirm the real economy.
- Should there be any penalty for citing the *wrong* student (there's no "innocent vs guilty" distinction yet — every student is citeable)? Likely a Stage 6 "up to no good" flag decides who's fair game.

## Ready-state for Stage 6 (Hall Duty)
- A reusable `Student` with documented extension points (`chooseBehaviour`, `canDamage`, `cite`) and a `scene.students` array the slip already scans.
- The detention slip works generically (`cite:done { id }`), so Hall Duty just needs to spawn students and optionally flag which are "up to no good".
- Live composure + score + HUD are in place; new systems can push points via `score.add()` and damage via `composure.damage()`.
- `buildPeriod` carries `id`/`name`/`onComplete` through, and `onComplete.next` already points at `hall_duty_1` — the seam for chaining into Hall Duty exists (currently display-only).
- Knockback/i-frame/flash pattern is established on `Player` for any future hazard.
