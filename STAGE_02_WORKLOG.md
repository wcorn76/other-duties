# Stage 2 — Work Log

Timestamped narration of the Stage 2 build. Newest entries at the bottom.
Date: 2026-07-01. Same style as STAGE_01_WORKLOG.md.

---

## Checkpoint 0 — Ground-state check

- `git status`: clean tree on `main`, in sync with `origin/main` (Stage 1 already pushed/deployed).
- Re-read the files I'm building on: `PeriodScene.js`, `Player.js`, `scripts/gen-placeholder-assets.mjs`. Confirmed the locked map/sprite conventions still hold.
- **Key architecture decisions (finalized up front):**
  - **Event bus:** a dedicated `Phaser.Events.EventEmitter` created in `PeriodScene` and passed into the systems. Chosen over `scene.events` so gameplay events never collide with Phaser's own lifecycle events.
  - **Events used:** `interact:done { id }`, `deliver:done { item, target }`, plus helper `pickup:done { item }` / `drop:done { item }`. The objectives tracker only needs the first two.
  - **Where "carry" lives:** the pickup/drop/deliver verbs + the single carry slot live inside `src/systems/interaction.js`, because canon says "verbs in interaction.js". Kept as a clearly separated Carry section within that file rather than a new file.
  - **Interact key:** `E` and `Enter`. **`Space` left completely unused** (reserved for the detention slip later). **Drop key:** `Q` (now taken — documented).
  - **INTERACT_RANGE:** 22 px (a bit over one tile) — feels right for 16px tiles.

## Checkpoint 1 — Prop sprites + Prop entity

- Extended `scripts/gen-placeholder-assets.mjs` with `buildCoffeePot/buildFolder/buildDesk` → three 16×16 PNGs. Chose colours that read as distinct objects and none like the tan brick wall: coffee pot = dark carafe + red light; folder = bright manila yellow; desk = brown with a lighter top. Eyeballed all three.
- `src/entities/Prop.js`: an Arcade **static-body** sprite that just holds interaction data (`id`, `verb`, `item`, `accepts`, `used`). No collider added (player can stand on a prop to interact). Constructed from the config spec directly.
- `npm run build` clean. Committed: "stage 2: placeholder prop sprites + Prop entity".

## Checkpoint 2 — Interaction + carry (the verb layer)

- `src/systems/interaction.js` (one cohesive file, since canon says "verbs in interaction.js" — so the carry slot lives here too; tasks 9 and 10 share this file).
- Detection: nearest active prop within `INTERACT_RANGE` by distance; floating "E" text repositioned over it each frame, hidden when nothing is in range.
- Keys: `E` and `Enter` interact; `Q` drops. **Space is never bound** (reserved). Used `Phaser.Input.Keyboard.JustDown` for edge-triggered presses.
- Verbs: `use` → tint green + `interact:done {id}` (once). `pickup` → fills the single carry slot, removes the world prop, shows the item above the head, `pickup:done {item}`. `accepts` → if held item matches `accepts`, consume it + `deliver:done {item,target}`. Drop (`Q`) re-creates a pickup Prop at the player and emits `drop:done {item}`.
- Syntax-checked with `node --check` (can't `node -e import` Phaser without a DOM). Committed: "stage 2: interaction system (prompt, use verb, carry: pickup/drop/deliver)".

## Checkpoint 3 — Objective tracker core + HUD

- `src/systems/objectives.js`: generic `ObjectiveTracker(bus, objectives, onComplete)`. Copies specs + adds a `done` flag; subscribes to `interact:done` and `deliver:done`; `completeWhere(pred)` flips matches, emits `objective:updated`, and fires `objectives:allcomplete` + `onComplete` when every objective is done. `talk/collect/reach/meter` left as commented seams. No specific objective is hardcoded — all content arrives as data.
- `src/ui/objectivesHud.js`: minimal checklist pinned to the camera (`setScrollFactor(0)`), re-renders on `objective:updated`, `[ ]`→`[x]` and turns green. Comment notes Stage 4's real HUD owns the top strip.
- Committed: "stage 2: generic objective tracker core + minimal objectives HUD".

## Checkpoint 4 — Wiring + verification

- Rewrote `PeriodScene.js`: added the inline `TEST_CONFIG { spawn, entities[], objectives[] }` at the marked data-driven seam (with a comment that a JSON loader replaces it later), created a dedicated `Phaser.Events.EventEmitter` bus, spawned the player at `spawn`, built props from `entities` and registered them, created the tracker + HUD, and wired `onComplete` → the placeholder **"All duties complete!"** message. `update()` now drives `interaction.update()` too. Prop images are loaded from the config entity list.
- **Verification:**
  1. Node logic test of `objectives.js` with a fake bus: wrong events ignored; `interact:done` completes only coffee; `deliver:done` completes file; `onComplete` fires exactly when both done → PASS.
  2. Headless-Chrome screenshots via a temporary `verify.html` (deleted after): initial state shows the room, all three props, the player, the "E" prompt over the coffee pot, and the unchecked HUD; the `?complete` variant shows both HUD lines checked (green `[x]`) and the "All duties complete!" banner.
- `npm run build` clean (only the expected Phaser chunk-size advisory). Deleted `verify.html`, stopped the dev server.
- **No push** — stopping for owner review per brief. Committed: "stage 2: wire test config, systems, and completion message into PeriodScene".

### Deviations / notes
- Carry lives inside `interaction.js` (not a separate `carry.js`) to honour the "verbs in interaction.js" canon. Documented.
- Props use a static physics body but no collider this stage (you can walk onto them). If Stage 3 wants solid furniture, add a collider.
- `Q` is now a taken key (drop). `Space` remains free.
