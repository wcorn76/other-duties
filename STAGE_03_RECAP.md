# STAGE 03 — RECAP
Status: Complete   Date: 2026-07-01

Stage 3 is finished and committed locally on `main`. **Not pushed** — waiting for
your review. Local-test + push commands are at the bottom.

## Definition of Done — results
- [x] 1. Branching dialogue system (node graph, portrait, blocks input, emits talk:done) — `src/systems/dialogue.js` + `src/ui/textbox.js`; walks `data/dialogue.json`; Up/Down + E/Enter or 1/2/3 (never Space); freezes player + interaction while open; emits `talk:done {id}` on close.
- [x] 2. Npc entity (interact → talk) — `src/entities/Npc.js`; immovable feet-hitbox body, player collider, `verb:'talk'`; interaction opens its conversation.
- [x] 3. `talk` task type — `objectives.js`: `talk:done {id}` completes `type:'talk'` where `target===id`. Stays Phaser-free.
- [x] 4. `trash` task type (collect N, no carry slot) — `interaction.js` `trash` verb destroys the prop + emits `collect:done {item}`; `objectives.js` counts up and completes at `count`. No carry slot used.
- [x] 5. `find_use` task type (giver → carry → use on target) — talking to the giver grants the item (`interaction.giveItem`); carrying it to an `accepts` target emits `deliver:done`, which now completes `find_use` too.
- [x] 6. Objective HUD shows all three ticking — `objectivesHud.js`; `[ ]`→`[x]` green, and `(progress/count)` for trash. Verified all 5 checking off by screenshot.
- [x] 7. Test config: all three + existing verbs end-to-end — `TEST_CONFIG` in `PeriodScene` has coffee(use)+folder→desk(deliver)+washington(talk)+3×trash+prince(giver)→copier(find_use). Node logic test + screenshots confirm end-to-end.
- [x] 8. Builds clean + (pushed?) live URL — `npm run build` clean (only the expected Phaser chunk-size advisory). **Not pushed**, so the live URL still shows Stage 2.

## Live check
- Live URL: https://other-duties.vercel.app/ (pushed? **no**; still shows the Stage 2 sandbox). After you push it will show: talk to Mrs. Washington (branching chat) → objective ticks; pick up 3 trash → 0/3→3/3; talk to Mrs. Prince to receive the paper, carry it to the copier and press E → find_use ticks; plus the Stage 2 coffee + folder tasks. All five → "All duties complete!".

## Data formats actually used (Stage 4 depends on these)
- **Dialogue node shape** (real snippet from `data/dialogue.json`):
  ```json
  "washington_p1": {
    "portrait": "washington",
    "start": "n1",
    "nodes": {
      "n1": { "npc": "Oh good, an administrator. The copier ate my quiz. Again.",
        "choices": [ { "text": "I'll put in a ticket.", "next": "n2a" } ] },
      "n3": { "npc": "Thanks. You're the only one who listens.", "end": true }
    }
  }
  ```
  A node with `"end": true` and no `choices` ends the conversation.
- **How dialogue.json is loaded:** a plain ES `import dialogues from '../../data/dialogue.json'` inside `dialogue.js`. Vite bundles JSON imports at build time — **no runtime fetch**. This is the intended pattern for tasks/periods JSON in Stage 4.
- **Task-def shapes** (exactly as loaded in `TEST_CONFIG.objectives`):
  - talk: `{ id:"talk_w", type:"talk", target:"washington", dialogue:"washington_p1", text:"Check in with Mrs. Washington" }`
  - trash: `{ id:"trash", type:"trash", count:3, text:"Pick up the trash" }`
  - find_use: `{ id:"copier", type:"find_use", giver:"prince", item:"stack_of_paper", useTarget:"copier", text:"Sort out the copier" }`
  - (kept from Stage 2) interact: `{ id:"coffee", type:"interact", target:"coffee_pot", text:"..." }`; deliver: `{ id:"file", type:"deliver", item:"folder", target:"desk", text:"..." }`
- **Entity shapes** (`TEST_CONFIG.entities`):
  - npc: `{ type:"npc", id:"washington", sprite:"npc", x:104, y:56, dialogue:"washington_p1", tint:0x66d0d0 }`
  - trash prop: `{ type:"prop", id:"trash1", sprite:"trash", x:88, y:140, verb:"trash", item:"trash" }`
  - accepts prop: `{ type:"prop", id:"copier", sprite:"copier", x:240, y:120, verb:"accepts", accepts:"stack_of_paper" }`
- **New event names + payloads:** `talk:done { id }`, `collect:done { item }`. (Existing still used: `interact:done {id}`, `deliver:done {item,target}`, `pickup:done {item}`, `drop:done {item}`.) The tracker also emits `objective:updated (objectives[])` and `objectives:allcomplete`.
- **How the giver grants the find_use item:** `PeriodScene` listens on `scene.bus` for `talk:done {id}`; if an objective has `type:'find_use'` with `giver===id`, it calls `interaction.giveItem(objective.item)`, which fills the single carry slot (heldItem + heldSprite) exactly like a pickup. Comment marks that Stage 4 `tasks.js` will own granting.
- **Dialogue choice keys:** Up/Down = ↑/↓ or W/S; confirm = E / Enter / 1 / 2 / 3. Space is never bound.
- **Portraits:** keyed `portrait_<portraitId>` (e.g. `portrait_washington`), file `public/assets/sprites/portrait_<id>.png` (48×48). Preloaded in `PeriodScene` from `dialoguePortraitAssets()` (exported from `dialogue.js`, derived from the JSON). Textbox resolves `portrait_${conv.portrait}`.

## New/changed files
- New: `data/dialogue.json`, `src/ui/textbox.js`, `src/systems/dialogue.js`, `src/entities/Npc.js`.
- New art: `public/assets/sprites/{npc,portrait_washington,portrait_prince,trash,stack_of_paper,copier}.png`.
- Changed: `scripts/gen-placeholder-assets.mjs` (new generators), `src/systems/objectives.js` (talk/trash/find_use handlers, progress in snapshot), `src/systems/interaction.js` (dialogue block, `talk`+`trash` verbs, `giveItem`), `src/entities/Player.js` (freeze while talking), `src/ui/objectivesHud.js` (progress display), `src/scenes/PeriodScene.js` (dialogue system, NPC spawning + collider, full config, giver grant).
- Docs: `STAGE_03_WORKLOG.md`, `STAGE_03_RECAP.md`.
- Unchanged locked bits: `main.js` config, map/tileset/player sheet, `movement.js` (`MOVE_SPEED=90`), `Prop.js`.

## Deviations from canon (and why)
- **Commits grouped by concern** (art / dialogue-core / handlers+wiring), not strictly one per A/B/C checkpoint — the three task types share the same tiny generic handlers and files, so splitting further would have meant artificial partial-file commits. All three were verified together at checkpoint D. No data shape changed.
- **NPC tint is subtle** at 16px because the shared body is near-white; the portrait (colour + initial) is the real differentiator in conversation. Flagging, not blocking.
- No canon data SHAPE was changed or invented.

## Friction points
- `dialogue.js`/`interaction.js` import Phaser, so they can't be unit-tested with bare `node` (no DOM); verified via `node --check` + headless screenshots. `objectives.js` stayed Phaser-free and was fully Node-tested — worth keeping future core systems Phaser-free.
- The dialogue panel is tight at 384×216 with three choices; I nudged the layout once so the 3rd choice fits. Worth keeping choice lines short in future content.

## Open questions for the hub
- **Giver-grants-item ownership:** the scene currently maps `talk:done`→`giveItem` from the find_use objective's `giver`. Stage 4's `tasks.js` should own this — confirm the hand-off shape (does a task declare "on talk with X, grant item Y"?).
- **Talk objective vs. dialogue outcome:** right now finishing ANY conversation with an NPC completes a `talk` objective for that id, regardless of which branch was chosen. Should specific choices matter (e.g. a "correct" path), or is any completed chat enough?
- **Trash as one objective vs. per-item:** `trash` is one count-based objective (`count:3`) completed by any `collect:done`. If Stage 4 wants typed litter (e.g. count only `soda_can`), we'd filter by `item` — easy, just flagging.
- **NPC art:** confirm whether NPCs get their own directional sheets later (like the player) or stay single-frame idols with portraits doing the heavy lifting.

## Ready-state for Stage 4
Stage 4 can safely assume:
- A **branching dialogue system** (`scene.dialogue`) with a documented node-graph JSON loaded by ES import — the pattern for tasks/periods JSON.
- **Five working task types** driven by a generic, Phaser-free `objectives.js`: `interact`, `deliver`, `talk`, `trash` (count-based), `find_use`. Adding a task type = a small pure handler + data (`reach`/`meter` seams still open). No hardcoded content in the tracker.
- A stable **event bus** (`scene.bus`, `verb:done` names) with documented payloads, plus `objective:updated` / `objectives:allcomplete`.
- Verb layer: proximity prompt, one-slot carry (pickup/drop/deliver), and `interaction.giveItem()` for granting.
- Documented, stable **data shapes** for objectives and entities and the `{ spawn, entities[], objectives[] }` config wrapper, all sitting at the marked data-driven seam in `PeriodScene` — swapping it for a `tasks.js` + period-JSON loader should touch only that block.
- Placeholder art + a `/scripts` generator that already emits NPC bodies, portraits, and props (extend for new content).

---

## For the owner — how to review and ship

**1) Test locally** (from inside `other-duties/`):
```
npm run dev
```
Open the printed http://localhost:5173/ , press any key, then:
- Walk to **Mrs. Washington** (near your start) and press **E** → pick answers with ↑/↓ and **E** (or press 1/2/3) → the chat ends and "Check in with Mrs. Washington" ticks off.
- Walk over the **3 trash** pieces pressing **E** on each → "Pick up the trash" goes 0/3 → 3/3.
- Talk to **Mrs. Prince** (center) → she hands you a stack of paper (rides above your head) → carry it to the **copier** (grey machine) and press **E** → "Sort out the copier" ticks off.
- Finish the Stage 2 coffee + folder→desk tasks too → **"All duties complete!"**.
- Controls: WASD/arrows move; **E/Enter** interact; **Q** drop; **Space** does nothing (reserved).

**2) Push + deploy** (this makes it live):
```
git push origin main
```
Vercel auto-builds on push; ~1 minute later https://other-duties.vercel.app/ updates.

**3) What you'll see live:** the same three-task-type sandbox above, on the public URL.
