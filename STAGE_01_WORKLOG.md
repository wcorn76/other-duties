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
- **Plan:** I will add `physics: { default: 'arcade' }` to the Phaser config in checkpoint 5. This is required for collision and does not touch any of the locked resolution/scale settings.
