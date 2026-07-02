# Stage 1 — Work Log

A running, timestamped narration of the unattended Stage 1 build. Newest entries at the bottom.
Times are local machine time. Date: 2026-07-01.

---

## Checkpoint 1 — Ground-state check

- **Phaser version (package.json):** `^3.90.0`; installed version resolves to exactly **3.90.0**.
- **Node/npm (unchanged from Stage 0):** Node v24.16.0, npm 11.13.0.
- **Locked Phaser config confirmed** in `src/main.js`: internal resolution 384×216, `pixelArt: true`, `roundPixels: true`, `scale.mode: Phaser.Scale.FIT`, `scale.autoCenter: Phaser.Scale.CENTER_BOTH`. Will NOT change these.
- **Folder structure** matches the brief: `src/scenes`, `src/entities`, `src/systems`, `src/ui`, `public/assets/{maps,sprites,audio}`, `data`.
- **Tooling note:** ImageMagick is NOT installed. Decision: generate placeholder PNGs with a tiny dev-only Node script using the `pngjs` package (installed with `-D`, so it is not part of the shipped runtime bundle). This keeps the runtime "Phaser + Vite only" rule intact.
- Working tree clean, on `main`, in sync with `origin/main`.
- **Plan:** I will add `physics: { default: 'arcade' }` to the Phaser config. This is required for collision and does not touch any of the locked resolution/scale settings.

## Checkpoint 2 — Placeholder assets

- Added dev-only dependency `pngjs` (`npm i -D pngjs`) to emit PNGs from Node. Not bundled into the game.
- Wrote two small generator scripts kept in `scripts/` so the art can be regenerated:
  - `scripts/gen-placeholder-assets.mjs` → `tileset.png` (32×16, floor+wall) and `player.png` (48×96 sheet).
  - `scripts/gen-placeholder-map.mjs` → `test-room.json` (Tiled JSON).
- Verified dimensions: tileset 32×16, player 48×96 (= 3×4 frames of 16×24). Eyeballed both PNGs: floor (blue-grey) vs wall (tan brick) are clearly distinct; player is a recognizable little figure.
- Committed: "stage 1: placeholder assets (tileset, test map, player sheet)".

## Checkpoint 3 — PeriodScene draws the map

- `src/scenes/PeriodScene.js` loads the tileset image + Tiled JSON and renders `floor` then `walls` layers. Added a comment marking where the future data-driven period-loader will go.
- Registered `PeriodScene` in `main.js` scene list (does not auto-start; Boot still routes to Title).
- `npm run build` clean. Committed: "stage 1: PeriodScene loads and draws test map".

## Checkpoint 4 — Player + movement (no wall collision yet)

- `src/systems/movement.js`: pure movement math, no Phaser. `MOVE_SPEED = 90` px/s named constant at top. Normalizes diagonals; picks facing (left/right prioritized, then up/down; keeps previous facing when idle).
- `src/entities/Player.js`: Arcade sprite. Reads WASD + arrow keys, plays `walk-down/left/right/up` (2-frame) or shows the idle frame per facing.
- **Decision / deviation:** enabled `physics: { default: 'arcade', gravity 0 }` in `main.js` now (checkpoint 4) rather than checkpoint 5, because the Player uses velocity-based movement. No wall collider added yet, so walking through walls is still expected here — matches the brief's checkpoint-4 state.
- `npm run build` clean. Committing as "stage 1: player + movement (WASD/arrows, no collision yet)".
