# STAGE 01 — RECAP
Status: Complete   Date: 2026-07-01

Stage 1 is finished and committed locally on `main`. Nothing has been pushed or
deployed yet — that's waiting for you (see the last section).

## Definition of Done — results (one line each, 1–8, with a note)
1. **Placeholder assets** — DONE. Tileset PNG (16×16 floor + wall), Tiled-format JSON map (30×20), and a 16×24 player sheet (4 directions, 2-frame walk + idle) all generated into the correct folders.
2. **PeriodScene loads + draws the map** — DONE. Renders the `floor` then `walls` layers; a comment marks where the future data-driven period loader will go.
3. **Player + movement** — DONE. WASD *and* arrow keys, diagonal speed normalized, 4-direction facing, 2-frame walk animation, idle frame when still. Move speed is a named constant (`MOVE_SPEED = 90`) at the top of `movement.js`.
4. **Wall collision (Arcade Physics)** — DONE. The player bumps into wall tiles and can't leave the room. Verified visually via a headless screenshot of the room.
5. **Camera** — DONE. Follows the player, clamped to the map edges, pixel-snapped.
6. **Flow** — DONE. Boot → Title → (press any key / click) → PeriodScene. You start the game and walk around the test room.
7. **Still builds clean** — DONE. `npm run build` succeeds. The only message is the expected Phaser "chunk > 500 kB" advisory, which is a warning, not an error.
8. **Housekeeping** — DONE. Exact Phaser version recorded below; Title subtitle changed to just "pre-alpha".

## Live check (what the deploy WILL show once pushed; push is pending your review)
Once you push, https://other-duties.vercel.app/ will show:
- A title screen: **OTHER DUTIES AS ASSIGNED**, subtitle **pre-alpha**, and **press any key to start**.
- Press any key (or click): you enter the test room — a tiled floor bordered by brick walls, with a few interior walls and pillars.
- You control a little placeholder character with **WASD or the arrow keys**. It faces the way it walks, animates a simple two-frame walk, and stands on an idle frame when still.
- You **can't walk through walls** or off the edge of the room, and the **camera follows** you.
(Confirmed locally with headless-browser screenshots of both the title and the room.)

## Environment / versions (exact Phaser version; note if Node/npm/Vite changed)
- **Phaser: 3.90.0** (`package.json` pins `^3.90.0`; installed resolves to exactly 3.90.0). Unchanged from Stage 0.
- Node v24.16.0, npm 11.13.0 — unchanged.
- Vite 7.x — unchanged.
- **New dev-only dependency: `pngjs` (^7.0.0)**, used only by the asset-generator scripts to emit placeholder PNGs. It is NOT part of the game that ships to players, so the "runtime = Phaser + Vite only" rule still holds.

## New/changed files (real list)
New:
- `src/scenes/PeriodScene.js` — the playable scene (loads map, spawns player, collision, camera).
- `src/entities/Player.js` — the player character (input, animation).
- `src/systems/movement.js` — movement math + `MOVE_SPEED` tunable.
- `public/assets/sprites/tileset.png` — 32×16 placeholder tileset (floor + wall).
- `public/assets/sprites/player.png` — 48×96 placeholder character sheet.
- `public/assets/maps/test-room.json` — the Tiled-format test map.
- `scripts/gen-placeholder-assets.mjs`, `scripts/gen-placeholder-map.mjs` — dev-only art generators.
- `STAGE_01_WORKLOG.md`, `STAGE_01_RECAP.md` — this run's notes.

Changed:
- `src/main.js` — registered `PeriodScene`; added `physics: arcade` (gravity 0). Locked resolution/scale settings untouched.
- `src/scenes/TitleScene.js` — subtitle → "pre-alpha", added start prompt + key/click handoff to PeriodScene.
- `package.json` / `package-lock.json` — added dev-only `pngjs`.

## Data/asset formats actually used (Stage 2 depends on these — read carefully)
- **Map:** orthogonal, `tilewidth`/`tileheight` = 16, `width` = 30, `height` = 20. File: `public/assets/maps/test-room.json`.
- **Layers (exact names):** `floor` (all floor) and `walls` (border + interior walls). Both are tile layers.
- **Tile GIDs:** `0` = empty, **`1` = floor**, **`2` = wall**. **Collision is on gid 2** (implemented as "every non-empty tile in the `walls` layer is solid").
- **Embedded tileset name inside the map JSON:** `tiles` (Phaser call: `map.addTilesetImage('tiles', 'tileset')`). Tileset image is `public/assets/sprites/tileset.png` (2 tiles, 16×16 each).
- **Player sheet:** file `public/assets/sprites/player.png`, frame size **16×24**, laid out **3 columns × 4 rows**.
  - Columns: `[idle, walkA, walkB]`. Rows: `[down, left, right, up]`.
  - Frame number = row × 3 + column, so: **down = 0,1,2 · left = 3,4,5 · right = 6,7,8 · up = 9,10,11**.
  - Idle frames per direction: down=0, left=3, right=6, up=9.
  - Animation keys: **`walk-down` [1,2] · `walk-left` [4,5] · `walk-right` [7,8] · `walk-up` [10,11]**, 6 fps, looping.
- **Spawn:** tile (3, 3), centre of the tile.

## Deviations from this brief (and why)
- **Enabled Arcade Physics in `main.js` at checkpoint 4 instead of 5.** The player moves using physics velocity, so physics had to be on before movement worked. No wall collider was added until checkpoint 5, so "walk through walls" was still true at checkpoint 4 as the brief expected. This does not touch any locked resolution/scale setting.
- **Added a dev-only `pngjs` dependency + two generator scripts** to create the placeholder PNGs (no design tool / ImageMagick on this machine). The brief explicitly allows a dev-only tool for this; nothing was added to the shipped runtime.
- **Player hitbox is smaller than the sprite** (feet-sized, 12×10). This is a normal top-down choice and lets the character fit through one-tile gaps. Noted here so Stage 2 isn't surprised.
- Everything else follows the brief. No interaction/verbs, tasks, HUD, dialogue, inventory, or data-driven level loading were built (correctly out of scope).

## Friction points (anything that would trip up the non-technical owner)
- **The "chunk > 500 kB" message during build is normal.** It is a yellow warning about Phaser being a big library, not an error. The build still succeeds.
- **`gh` (GitHub CLI) lives at `~/.local/bin/gh`**, not on the default PATH (installed during Stage 0). If a command says "gh: command not found", use the full path `~/.local/bin/gh`.
- Nothing is live yet — you must run the deploy command below to see these changes on the website.

## Open questions for the hub
- **Facing priority on diagonals:** I made left/right win over up/down when both are held (side views read more clearly). If canon prefers vertical-facing priority, it's a one-line change in `movement.js`.
- **Player size vs tile size:** the character is 16×24 (taller than one 16px tile). One-tile-tall horizontal gaps are hard to pass; I used a smaller feet hitbox to help. Confirm the intended character/door proportions for Stage 2 map authoring.
- **Move speed** is 90 px/s as a first guess — easy to retune once there's a feel target.

## Ready-state for Stage 2 (what Stage 2 can safely assume exists)
- A working Boot → Title → PeriodScene flow, with a controllable player, wall collision, and a following camera.
- A concrete, documented map + sprite format (see "Data/asset formats" above): layer names `floor`/`walls`, wall = gid 2, player frame order as listed.
- `PeriodScene.js` has a marked spot where the **data-driven period/JSON loader** should replace the single hardcoded `test-room` map.
- Reusable pieces: `Player` entity, `movement.js` system, and the two asset-generator scripts for making more placeholders.

## Exact command to deploy (for you to run after eyeballing it)
From inside the `other-duties` folder:

```
git push origin main
```

That pushes all of Stage 1's commits to GitHub `main`. Vercel will automatically build and update **https://other-duties.vercel.app/** a minute or two later. (If you want to preview locally first, run `npm run dev` and open the printed http://localhost:5173/ address.)
