# Stage 3 — Work Log

Timestamped narration of the Stage 3 build. Newest entries at the bottom.
Date: 2026-07-01. Same style as STAGE_02_WORKLOG.md.

---

## Checkpoint 0 — Ground-state review

- `git status`: clean tree on `main`, in sync with `origin/main` (Stage 2 pushed + live).
- Re-read the systems I'm extending: `movement.js` (pure, `MOVE_SPEED=90`), `Player.js`, `interaction.js`, `objectives.js`, `Prop.js`, `objectivesHud.js`, `PeriodScene.js`, and the generator. Confirmed the locked conventions still hold.
- **Plan / decisions finalized up front:**
  - **dialogue.json load:** via a plain ES `import` inside `src/systems/dialogue.js` (Vite bundles JSON imports). This sets the pattern for tasks/periods JSON in Stage 4. Documented in the recap.
  - **New events:** `talk:done { id }`, `collect:done { item }`. Same `scene.bus` / `verb:done` pattern.
  - **Input blocking while a conversation is open:** `Player.update()` and `interaction.update()` early-return (and zero velocity) when `scene.dialogue.isOpen()`. Plus a one-frame `justOpened` guard inside the dialogue system so the same `E` press that opened the conversation can't also confirm the first choice.
  - **Dialogue keys:** Up/Down = arrows + W/S; confirm = E/Enter or 1/2/3. **Space never bound** (still reserved).
  - **objectives.js stays Phaser-free:** each new task type (`talk`, `trash`/collect, `find_use`) is a small pure handler keyed off the data list — no hardcoded content.

## Checkpoint A/B/C — implementation

Because the generic systems make each task type a tiny handler, I implemented the three types across the same set of files and committed them by concern rather than strictly one-checkpoint-per-commit (noted as a deviation below). What went in:

- **Generator** (`scripts/gen-placeholder-assets.mjs`): added a 5×7 pixel font (just `W`/`P`), `buildPortrait` (48×48, colour + initial), `buildNpc` (16×24 near-white tintable body), `buildTrash`/`buildStackOfPaper` (16×16), `buildCopier` (16×24). Eyeballed all; portraits read as teal-W / purple-P.
- **`data/dialogue.json`**: `washington_p1` (verbatim template) + `prince_p1` (same shape, copier "giver", ends by handing over a stack of paper). Validated: every first path is 3 nodes deep and ends at `end:true`.
- **`src/ui/textbox.js`**: bottom panel, portrait + wrapped NPC line + up to 3 choices with a ► cursor; camera-pinned, depth 5000. (Tweaked the layout after the first screenshot so the 3rd choice fits.)
- **`src/systems/dialogue.js`**: imports `dialogue.json` via ES import (Vite bundles it — documented). Graph walk + input (Up/Down = arrows+W/S, confirm = E/Enter or 1/2/3, **no Space**). `start(id,npcId)` / `isOpen()` / closes on a terminal node and emits `talk:done {id}`. One-frame `justOpened` guard so the opening E can't confirm the first choice.
- **`src/entities/Npc.js`**: interactable with `verb:'talk'` + `dialogue`, immovable feet-hitbox body, per-NPC tint. Collider vs player added in the scene.
- **`interaction.js`**: early-returns (prompt hidden) while dialogue is open; added `talk` (opens dialogue), `trash` (destroys prop + `collect:done {item}`, no carry slot), and `giveItem(itemId)` (fills the carry slot like a pickup).
- **`Player.js`**: freezes (zeroes velocity, idle frame) while dialogue is open.
- **`objectives.js`** (still Phaser-free): implemented `talk` (`talk:done`→complete by target), count-based `trash` (`collect:done`→`progressTrash`, done at `count`), and `find_use` (folded into the `deliver:done` handler so a delivery completes both `deliver` and `find_use`). `reach`/`meter` remain commented seams. `getObjectives()` now also returns `count`/`progress` for the HUD.
- **`objectivesHud.js`**: shows `(progress/count)` for count-based objectives.
- **`PeriodScene.js`**: creates the dialogue system, spawns props + NPCs from the config (NPCs get a player-collider), wires the tracker+HUD, and listens for `talk:done` to grant a find_use giver's item via `interaction.giveItem` (comment: Stage 4 `tasks.js` owns this later). Full 5-objective `TEST_CONFIG` at the data-driven seam. Preloads portraits (from `dialoguePortraitAssets()`), the NPC body, all entity sprites, and find_use item art.

Commits: (1) placeholder art, (2) dialogue system + Npc, (3) task handlers + input-block + scene wiring.

## Checkpoint D — verify

- **Node logic test** of `objectives.js` (Phaser-free) driving all five objectives: interact→coffee, talk→talk_w, deliver→file, three collect:done→trash 1/3→2/3→3/3, deliver stack_of_paper→copier. `onComplete` fired only after the last. PASS. (Also confirmed `allComplete` was false until the final event.)
- **`npm run build` clean** (only the expected Phaser chunk-size advisory).
- **Headless screenshots** via a temporary `verify.html` (deleted after): (1) initial room shows all 5 objectives incl. "Pick up the trash (0/3)", both tinted NPCs, 3 trash, copier, folder, desk, coffee pot; (2) `?dialogue` shows the text box with the teal-W portrait, NPC line, and 3 choices with the ► cursor; (3) `?complete` shows all 5 checked (trash 3/3) and "All duties complete!".
- **Double-trigger check:** confirmed by design — interaction early-returns while dialogue is open (so it never sees the confirm E), and the `justOpened` guard skips input on the opening frame. On close, the closing E is consumed by the dialogue system before interaction runs that frame, so it can't re-open.

### Deviations
- Committed by concern (art / dialogue-core / handlers+wiring) rather than one commit per A/B/C checkpoint, because the three task types share the same small generic handlers and files. All three were verified together at checkpoint D. No canon data shapes changed.
- NPC tints are subtle at 16px (near-white body × tint); portraits are the clear differentiator in conversation. Not a blocker.
