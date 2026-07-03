# STAGE 07 — RECAP
Status: Complete   Date: 2026-07-02

Added the final two task types — `cover` (stand in a room and dwell) and
`investigation` (read a case folder, accuse a suspect) — so a period can draw a
real 5-of-5 pool. Both reuse existing machinery (buildPeriod spawn-by-`needs`,
the HUD ticker, the interaction E-verb, and the dialogue text box). First Period
and Hall Duty are unchanged. Committed to `main` and pushed.

## Definition of Done — results
- [x] 1. `cover` (zone + dwell + pause + progress + complete) — A data-driven `zone` entity (`{type:'zone',id,x,y,w,h}`) is spawned by the task's `needs`; the scene records its rect and each frame calls `tracker.tickZoneObjectives(delta, isInside)`. `pointInRect` (pure, exported) + `tickZoneObjectives` live in objectives.js: the dwell accrues ONLY while inside, PAUSES (not resets) outside, and completes at `seconds`. HUD shows "— Ns / Ns"; on completion the scene flashes the task's `doneMsg`. Proven by `scripts/test-cover.mjs`.
- [x] 2. `investigation` (folder → brief/clues + ≤3 suspects → correct/wrong/retry) — A `read`-verb folder Prop opens `InvestigationReader`, which REUSES `textbox.js` (it is not a new dialogue engine) to page through brief → clues → ≤3 suspects. Arrows/W-S move, E/Enter/1-2-3 confirm, never Space. Correct accusation → `investigate:done{correct:true}` → objective completes with the success line; wrong → fail line, reader closes, reopen to retry, NO heart penalty. `investigationOutcome`/`buildReadingPages`/`buildResultPage` are pure; proven by `scripts/test-investigation.mjs`.
- [x] 3. All five task types selectable; pick-3 draws cover + investigation; First Period unchanged — `data/periods/period_test_all5.json` has a 5-task pool (one each: trash, talk, find_use, cover, investigation) with `pickCount:3`. Added as a third Title option "Test: All 5". First Period (`period_1.json`) untouched; verified it and Hall Duty still play by screenshot.
- [x] 4. HUD shows cover progress + investigation completion — hud.render() now formats `cover` as "— {progress}s / {seconds}s" and other count objectives as "(p/c)"; investigation is a normal pending→done tick. Verified live ("5s / 15s" advancing).
- [x] 5. Placeholder art (folder, zone marker) via /scripts — Generated `zone_marker.png` (translucent tiled floor marker). REUSED the existing `folder.png` for the case folder (the brief's own example uses `"sprite":"folder"`), so no duplicate art.
- [x] 6. Clean build + all node tests pass + pushed; live URL shows both — `npm run build` clean (Phaser chunk advisory only). All 7 `scripts/test-*.mjs` pass. Pushed to `origin/main`.

## Morning play-check (exact clicks on https://other-duties.vercel.app/)
1. On the Title screen there are now THREE options: First Period, Hall Duty, and **Test: All 5**. Pick **Test: All 5** (↑/↓ + E, click, or press 3).
2. The briefing lists the **3 randomly drawn tasks** (out of the 5-type pool). Because it's random, refresh a couple of times if you want to see cover and investigation — over a few tries you'll get both. Press **E** to start.
3. **Cover** (if drawn — "Cover Mr. Lewis's class — 0s / 30s"): a teal **"COVER HERE"** marker sits in the top-left. Walk onto it — the objective's timer starts counting up ("1s / 30s", "2s / 30s"…). **Step off the marker** and the number PAUSES (it does not reset). Step back on and it resumes; at 30s it completes with "Oh good, you're back — thanks! — Mr. Lewis." (In the built level it's 30s; the temporary test pool uses 15s to make it quicker to see.)
4. **Investigation** (if drawn — "Get to the bottom of the window incident"): a **folder** sits mid-room. Walk up and press **E** to open it. Press **E** to page through the brief and the clues (they point at grass-stained knees; Mia was inside, Diego wore shorts). On "Who did it?", pick with **↑/↓ + E** (or 1/2/3). Pick **Mia** or **Diego** first → you'll get the fail line ("That kid's got an alibi…") and the folder closes — press **E** on the folder again to retry (no penalty). Pick **Avery** → success line and the task ticks off.
5. Complete all 3 drawn tasks → the usual "Test period cleared!" panel → **E** → Title.
6. Back at Title, play **First Period** and **Hall Duty** to confirm they're exactly as before (First Period: random 3 chore tasks, no timer, "Period complete!"; Hall Duty: 1:00 countdown, "!"-marked guilty kids, "Hall cleared!"/bell/tardies).

## Data formats / APIs actually used (Stage 8 depends on these)
- **cover**: `{ id, type:'cover', zone:<zoneEntityId>, seconds?, doneMsg?, text, needs:[zoneEntityId] }`. The zone is a data-driven entity `{ type:'zone', id, x, y, w, h }` spawned by `needs`. The scene resolves it into `this.zoneRects[id] = {x,y,w,h}` and each frame calls `tracker.tickZoneObjectives(deltaMs, (o) => pointInRect(playerX, playerY, this.zoneRects[o.zone]))`. Dwell PAUSES (never resets) when outside; completes at `seconds` (default `COVER_SECONDS=30`). Completion is the normal objective path (objective:updated / objectives:allcomplete); the "thanks" line is a scene announce, not a new event.
- **reach**: the same primitive supports `{ type:'reach', zone }` (completes the instant the player is inside) — implemented alongside cover but not used by a shipped level yet.
- **pointInRect(px, py, {x,y,w,h})** and **ObjectiveTracker.tickZoneObjectives(deltaMs, isInside)** are the new zone APIs in objectives.js (pure + scene-driven respectively).
- **investigation**: `{ id, type:'investigation', incident:<incidentId>, text, needs:[folderPropId] }`. The folder is `{ type:'prop', sprite:'folder', verb:'read', incident:<incidentId> }`. `data/incidents.json` shape: `{ <incidentId>: { title, brief[], clues[], suspects:[{id,name,line}], culprit, success, fail } }`, loaded via ES import. `InvestigationReader` reuses `TextBox`; pure helpers in `investigation.js`: `investigationOutcome(caseData, pickedId) -> {correct}`, `buildReadingPages(caseData)`, `buildResultPage(caseData, pickedId, correct)`, `READING_MAX_CHOICES=3`. New event **`investigate:done { incident, correct }`** (verb:done convention); objectives completes only on `correct:true`.
- **new objectives.js primitives**: `pointInRect` (export), `COVER_SECONDS` (export), `tickZoneObjectives` (method), the `investigate:done` handler, and `getObjectives()` now also returns `type` + `seconds` for HUD formatting.
- **5-type test pool + Title seam**: `data/periods/period_test_all5.json` (taskPool of one of each type). The Title launcher starts a period via `this.scene.start('PeriodScene', { period: <json> })`; `PeriodScene.init(data)` reads `data.period`. That `{ period }` handoff is the seam a real progression menu will replace.

## New/changed files
- New: `src/systems/investigation.js` (pure), `src/systems/investigationReader.js` (Phaser), `data/incidents.json`, `data/periods/period_test_all5.json`, `public/assets/sprites/zone_marker.png`, `scripts/test-cover.mjs`, `scripts/test-investigation.mjs`, `STAGE_07_RECAP.md`.
- Changed: `src/systems/objectives.js` (pointInRect + tickZoneObjectives + investigate handler + COVER_SECONDS + snapshot fields), `src/ui/hud.js` (cover "Ns/Ns" formatting), `src/entities/Prop.js` (`incident` field + `read` verb doc), `src/systems/interaction.js` (`read` verb), `src/scenes/PeriodScene.js` (reader, zone spawn/marker, dwell tick, per-id done listener + cover announce, zone_marker preload), `src/scenes/TitleScene.js` (third option), `scripts/gen-placeholder-assets.mjs` (zone marker).

## Deviations from canon (and why)
- **Zone is a data-driven entity `{type:'zone',...}` (not a rect on the task).** This fits the existing `needs` → spawn-only-what's-needed contract cleanly (buildPeriod already spawns entities by needs) and lets Stage 8 reuse zones. The cover task links to it with a **`zone` field = the zone entity id** (instead of the brief's `room` string), because the scene resolves the actual rect from the spawned entity that `needs` already names — so a separate room registry isn't needed. Logged as the "cleaner fit" the brief invited.
- **Dwell PAUSES, does not reset** (explicit design flag in behaviour + covered by the test). Named default `COVER_SECONDS=30`; the test period overrides to 15s for faster manual testing.
- **Investigation retry has NO penalty** (calm reading task, per brief): a wrong pick just closes the reader; reopening starts fresh. The pure outcome check is stateless, so retry is free.
- **Reused `folder.png`** for the case folder rather than generating a near-identical second folder sprite (the brief's example already specifies `sprite:'folder'`). Only `zone_marker.png` was newly generated.
- **Reader is a small dedicated system** that drives `TextBox` (mirroring DialogueSystem's input + justOpened guard) rather than shoehorning the case into the NPC dialogue graph — that keeps it decoupled from `dialogue.json` while still reusing the text box, honouring "don't build a new dialogue engine."
- **Replaced the score `doneCount` delta with a per-id `doneIds` set** so cover completion can be detected to show its message; task-bonus scoring is unchanged in effect.

## Friction points
- Verifying cover progress in a headless screenshot: Chrome's `--virtual-time-budget` didn't advance the game clock enough after the scene finished loading, so a naive "teleport + wait" showed 0s. Resolved by driving `tickZoneObjectives` deterministically in the throwaway harness (and the pure `test-cover.mjs` is the real proof). Not a game bug.
- The reader and dialogue each own a `TextBox` at the same depth; only one is ever open at a time, so they don't visually collide, but it's worth remembering if a future feature opens both.

## Open questions for the hub
- Cover default is 30s — is that the intended feel, and should leaving the room show a "you left!" nudge (currently it just silently pauses)?
- Should a wrong accusation cost anything (time? a soft "strike"?) or stay penalty-free? Kept penalty-free per this brief.
- `reach` is implemented but unused — do we want a pure "get to the office" objective in a future period, or should it stay a latent primitive?

## Ready-state for Stage 8 (Lunch boss)
- All FIVE task types are done and data-driven (trash, talk, find_use, cover, investigation); adding content is JSON only.
- Reusable patterns available: the **zone/dwell** primitive (`pointInRect` + `tickZoneObjectives`) for presence-based mechanics, and the **reading UI** (`TextBox` + a small reader) for any brief/clue/choice screen.
- The `meter` seam in objectives.js is still open (the obvious home for a Lunch "chaos meter").
- Stage 6's **timed-period harness** (`timeLimit` + countdown + bell) and **fail flow** ("Composure lost" → Title) are reusable for a boss with a clock and a lose condition.
- The Title `{ period }` launcher is the seam for wiring a real Lunch level and, eventually, progression.
