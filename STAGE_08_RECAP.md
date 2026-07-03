# STAGE 08 — RECAP
Status: Complete   Date: 2026-07-02

Built the Lunch Duty boss: a 3-minute cafeteria level with three chaos meters
(Mischief / Trash / Bathroom) that rise on their own — faster as the clock runs
down — and are pushed back with three different actions. Let a meter max and the
lunch lady storms out (restart); survive to 0:00 and you win. Reused the timed
harness, slip/`cite:done`, trash/`collect:done`, composure, score, and HUD;
`meters.js` is the only genuinely new system. Committed to `main` and pushed.

## Definition of Done — results
- [x] 1. meters.js (rise/fall/fail + escalation) + Node self-test + HUD three-bar display — Phaser-free core; `test-meters.mjs` proves rising raises, escalation is 1.0→ESCALATION_MAX_MULT, `lower()` clamps at 0, `onBreak` fires exactly once. HUD `initMeters`/`updateMeters` draw three labeled bars.
- [x] 2. lunch_1.json (timeLimit 180, 3 meters) via the timed harness — `type:'boss'` period; the existing `timeLimit` countdown (3:00) + bell hook drive the clock (win branch instead of tardy tally). Launchable from the Title `{ period }` seam.
- [x] 3. Trash / Mischief / Bathroom mechanics each lower their meter — Trash: reused `collect:done` (trash props spawn on a timer, `E` picks up) → `lower('trash')`. Mischief: reused the slip `cite:done{guilty}` → `lower('mischief')` + `score.addCite()`. Bathroom: new — a diner raises a hand, `E` on the nearest grants → `bathroom:done` → `lower('bathroom')`.
- [x] 4. Escalation curve (rates climb as time→0) — pure `escalationMult(timeFraction)` in `meters.js`, wired from `1 - timeRemainingMs/total` each frame; 1.0 at start, 2.5 at 0:00 (linear). Tested.
- [x] 5. Fail: meter max → lunch lady → restart — `onBreak` → `onMeterBroke(id)`: emits `meter:broke{id}`, freezes, pops the lunch-lady sprite + "The lunch lady storms out!" panel, `E` → `scene.restart({period})`.
- [x] 6. Win: survive the clock → win panel → onComplete — at 0:00 (boss) → `onLunchSurvived()`: "Lunch survived!" panel (from `onComplete.title`) + final score → Title. No tardy tally.
- [x] 7. HUD three bars + countdown + score, no overlap — bars top-left (x4, end ~144px) under the strip; hearts (left), gear (center), timer (~282), score (right) all clear. Verified by screenshot.
- [x] 8. Placeholder art via /scripts — generated `bathroom_tell.png` (cyan raised hand), `table.png` (cafeteria table + trays), `lunch_lady.png` (hairnet + apron, yelling). Mischief tell reuses the Student "!" marker.
- [x] 9. Clean build + tests + pushed; live Lunch playable — `npm run build` clean (Phaser chunk advisory only); all 8 `scripts/test-*.mjs` pass; pushed to `origin/main`.

## Live check
- Live URL: https://other-duties.vercel.app/  (pushed? **yes**; now shows: a fourth Title option "Lunch Duty" — the full 3-minute boss with the three meters, plus the unchanged First Period / Hall Duty / Test: All 5.)

## Morning play-check list (what the owner should click to verify)
- [ ] Launch **Lunch Duty** from the Title (↑/↓ + E, or press 3); the briefing lists the controls; press **E** — the **3:00** clock runs.
- [ ] The **Trash** bar climbs on its own; walk to a piece of litter and press **E** — the bar drops.
- [ ] The **Mischief** bar climbs; the kids with a red "!" are the troublemakers — face one and press **Space** to cite — the bar drops and score rises.
- [ ] A diner **raises a cyan hand**; stand next to them (the "E" prompt appears) and press **E** — the **Bathroom** bar drops.
- [ ] Late in the clock, all three bars rise noticeably faster (escalation).
- [ ] Let one bar fill to the top → **the lunch lady storms out** ("WHO is supervising in here?!") → press **E** → the level **restarts**.
- [ ] Keep all three below max until **0:00** → **"Lunch survived!"** → E → back to Title.
- [ ] Hearts / [Space] Slip / timer / Score are all readable, not covered by the three meter bars.

## Data formats / APIs actually used (Stage 9 depends on these)
- **Real lunch_1.json** (as shipped):
  ```json
  { "id":"lunch_1", "name":"Lunch Duty", "type":"boss", "spawn":{"x":48,"y":110}, "timeLimit":180,
    "meters":[
      {"id":"mischief","label":"Mischief","max":100,"baseEventRate":0.5,"fallPerAction":25},
      {"id":"trash","label":"Trash","max":100,"baseEventRate":0.5,"fallPerAction":25},
      {"id":"bathroom","label":"Bathroom","max":100,"baseEventRate":0.5,"fallPerAction":25}],
    "entities":[ {"type":"decor","id":"table_1","sprite":"table","x":110,"y":78}, ...4 tables ],
    "students":[ 4x {"upToNoGood":true,"behaviour":"loiter"} (mischief), 4x {"upToNoGood":false,"behaviour":"loiter"} (diners) ],
    "onFail":{"cutscene":"lunch_lady_yell","action":"restart"}, "onComplete":{"title":"Lunch survived!"} }
  ```
- **meters.js API** (Phaser-free): `new Meters({ meters:[{id,label,max?,baseEventRate?,fallPerAction?}], onBreak(id), rng? })`; `tick(dtSeconds, timeFraction)` (rises in whole `TICK_SECONDS` steps, escalates), `lower(id, amount?)` (clamps 0, defaults to the meter's `fallPerAction`), `getMeters() -> [{id,label,current,max}]`, `isBroken()`, exported `escalationMult(timeFraction, curve?)`. **Constants:** `METER_MAX=100`, `TICK_SECONDS=1.0`, `BASE_RISE_PER_TICK=4`, `EVENT_CHANCE_PER_TICK=0.35`, `EVENT_BUMP=10`, `FALL_PER_ACTION=25`, `ESCALATION_MAX_MULT=2.5`, `ESCALATION_CURVE='linear'`, `BATHROOM_REQUEST_EVERY_MS=6000`, `GRANT_RANGE_PX=20`. Escalation: `mult = 1 + (ESCALATION_MAX_MULT-1) * f` (linear) or `*f*f` (easeIn), `f=timeFraction` clamped 0..1. Per-meter drift = `BASE_RISE_PER_TICK * baseEventRate * mult`; discrete events (`EVENT_CHANCE_PER_TICK*mult`) bump one random meter by `EVENT_BUMP*mult`.
- **Scene choice: reused `PeriodScene`** (not a new LunchScene). Reasoning: the timed harness, students, slip, trash pickup, HUD, composure, and score already live there; Lunch is a `type:'boss'` + `meters` branch (`this.isBoss`) plus `onMeterBroke`/`onLunchSurvived`/`updateTrashSpawner` and a boss briefing. No period/objective tangling — boss periods just carry an empty `objectives` array (the tracker sits idle), so the existing objective loop is untouched.
- **New events:** `bathroom:done { id }` (a hall pass was granted), `meter:broke { id }` (a meter maxed → fail). Both on `scene.bus`, `verb:done` convention.
- **Bathroom-request mechanic:** on a `BATHROOM_REQUEST_EVERY_MS` timer, `bathroom.js` picks a random well-behaved diner (`!upToNoGood`, up to `MAX_WAITING=3`), sets `student.verb='grant'`, registers it with the existing interaction system, and floats a `bathroom_tell` sprite over its head. The interaction system therefore shows the "E" prompt over the nearest requester; a new `grant` case in `interaction.js` calls `scene.bathroom.grant(student)` → `bathroom:done` + clear tell + unregister + `lower('bathroom')`. This is why `GRANT_RANGE_PX` is effectively `INTERACT_RANGE` (22px) — the grant reuses interaction proximity rather than a second range.
- **How the `meter` seam got filled / hud method added:** I did NOT route meters through `objectives.js` (that seam is for objective-completing meters, e.g. a future threshold-objective). Lunch's meters are a fail/survive loop, not objectives, so a dedicated **`meters.js`** system + **`hud.initMeters`/`hud.updateMeters`** is the DRYer fit. The `objectives.js` `meter` seam remains open for a future "meter crosses threshold → objective completes" case; documented in-file.

## New/changed files
- New: `src/systems/meters.js`, `src/systems/bathroom.js`, `data/periods/lunch_1.json`, `scripts/test-meters.mjs`, `public/assets/sprites/{bathroom_tell,table,lunch_lady}.png`, `STAGE_08_RECAP.md`.
- Changed: `src/scenes/PeriodScene.js` (boss branch: meters + trash spawner + bathroom + fail/win + decor spawn + lunch-lady pop + boss briefing + boss-vs-bell timer end), `src/ui/hud.js` (three meter bars), `src/scenes/TitleScene.js` (Lunch Duty option), `src/systems/interaction.js` (`grant` verb), `src/systems/tasks.js` (pass `type`/`meters`/`onFail` through), `src/ui/panel.js` (optional `footer`), `scripts/gen-placeholder-assets.mjs` (three new sprites).

## Deviations from canon (and why)
- **`lunch`/`lunch.json` (TECH_SPEC §4.6) shipped as `lunch_1`/`lunch_1.json`** to match `hall_duty_1.json`'s `onComplete.next: "lunch_1"` and the `<name>_1` convention used by the other periods. (TECH_SPEC/DESIGN_BIBLE/BUILD_TRACKER files are not present in the repo — as in every prior stage — so this reconciles the naming per the brief's instruction.)
- **Reused `PeriodScene`** rather than a new `LunchScene` (see reasoning above).
- **Lunch is `discretion:false`** — citing a diner just scores (harmless) and never docks a heart; the meters are the pressure, not composure. Composure/hearts are wired but there's no damage source in Lunch, so hearts stay full (kept for HUD consistency + reuse).
- **Meter drift uses `BASE_RISE_PER_TICK * baseEventRate * mult`** (baseEventRate is the per-meter rate knob); discrete events are global. Documented in `meters.js`.
- **Trash meter both drifts up (generic) AND has physical trash to clear** — the drift represents mess accumulating; the spawned trash props (every `TRASH_SPAWN_EVERY_MS=4000`) are what you pick up to lower it.
- Added `MAX_WAITING=3` (bathroom) and `TRASH_SPAWN_EVERY_MS` (scene) constants not in the brief's list, for fairness/pacing — named + commented.

## Friction points
- Layering the lunch-lady pop: first draw landed behind the panel (depth 1450 < panel 1500); moved her above the panel (depth 1600, y=44) so she looms over the yell.
- Verifying meter rise in a headless screenshot is unreliable (virtual-time timing), so the pure `test-meters.mjs` is the authoritative proof; screenshots confirmed the wiring/visuals (bars, tells, tables, fail/win panels).

## Open questions for the hub
- Balance: `baseEventRate 0.5` / `fallPerAction 25` / `ESCALATION_MAX_MULT 2.5` / `TRASH_SPAWN_EVERY_MS 4000` / `BATHROOM_REQUEST_EVERY_MS 6000` are placeholders — a real playtest pass should tune difficulty (currently a distracted player will max a meter well before 0:00; an attentive one survives comfortably).
- Should Lunch use composure at all (e.g. a rowdy kid that can bump you), or is meter-max the only fail? Currently meter-max only.
- Should the win award a score bonus for surviving / for meters kept low? Currently just the running score.

## Ready-state for Stage 9 (Progression & shell)
- All five task types + **Hall Duty** + **Lunch Duty** are playable levels launched via the Title `{ period }` seam (`scene.start('PeriodScene', { period })`, read in `PeriodScene.init`). A real day-progression/shell just needs to sequence these period JSONs and pass the next one instead of the Title menu.
- Each level has a consistent per-level end flow: **complete** (`onAllComplete`), **win** (`onLunchSurvived`), **fail/restart** (`onMeterBroke` → `scene.restart`), **hard fail** (`onComposureLost`), and **timed end** (`ringBell`) — all freeze play and route via a `Panel.message`. `onComplete.next` fields already point at the intended next level (e.g. `hall_duty_1 → lunch_1`).
- Reusable systems for Stage 9: the timed harness, `meters.js` (any future boss), the zone/dwell + reading-UI patterns (Stage 7), the slip/composure/score, and the interaction `grant`/`read`/`trash`/`talk` verb set. The `objectives.js` `meter` seam is still open for threshold-completing objectives.
- A save/progression + shell needs: persistence of which periods are done + score, a day sequencer replacing the temporary Title menu, and (per brief) the office cutscene / coffee runner / walkie which were explicitly deferred to Stage 9.
```
