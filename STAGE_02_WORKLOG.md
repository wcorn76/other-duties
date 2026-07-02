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
