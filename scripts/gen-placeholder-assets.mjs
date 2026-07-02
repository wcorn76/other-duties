// DEV-ONLY tool. Draws the Stage 1 placeholder art as PNG files.
// This is NOT part of the game that ships to players — it just makes the
// stand-in tileset and character images so we have something to look at.
// Run it with:  node scripts/gen-placeholder-assets.mjs
//
// It writes:
//   public/assets/sprites/tileset.png   (2 tiles: floor + wall, 16x16 each)
//   public/assets/sprites/player.png     (character sheet, 16x24 frames)
// The map JSON is written by a separate step; see gen-placeholder-map.mjs.

import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';

// --- tiny drawing helpers -------------------------------------------------

// Make a blank (fully transparent) image of the given size.
function makeImage(width, height) {
  const png = new PNG({ width, height });
  png.data.fill(0); // 0,0,0,0 = transparent
  return png;
}

// Set one pixel to a colour. Colour is [r,g,b] or [r,g,b,a] (a defaults to 255).
function setPixel(png, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * y + x) << 2;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

// Fill a rectangle (x,y) with size (w,h) in one colour.
function fillRect(png, x, y, w, h, colour) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(png, xx, yy, colour);
  }
}

// Draw a 1px-thick outline rectangle.
function strokeRect(png, x, y, w, h, colour) {
  for (let xx = x; xx < x + w; xx++) {
    setPixel(png, xx, y, colour);
    setPixel(png, xx, y + h - 1, colour);
  }
  for (let yy = y; yy < y + h; yy++) {
    setPixel(png, x, yy, colour);
    setPixel(png, x + w - 1, yy, colour);
  }
}

function save(png, path) {
  writeFileSync(path, PNG.sync.write(png));
  console.log('wrote', path);
}

// --- 1) tileset: floor tile + wall tile, side by side (32x16) -------------
// GID mapping used by the map: floor = gid 1 (left tile), wall = gid 2 (right).
function buildTileset() {
  const png = makeImage(32, 16);

  // Floor tile (left, x 0..15): calm blue-grey with a faint grid so tiles read.
  fillRect(png, 0, 0, 16, 16, [46, 50, 64]);
  strokeRect(png, 0, 0, 16, 16, [40, 44, 56]); // subtle darker edge
  setPixel(png, 4, 4, [54, 58, 74]);            // a couple of speckles
  setPixel(png, 11, 9, [54, 58, 74]);

  // Wall tile (right, x 16..31): warm tan brick, clearly different from floor.
  fillRect(png, 16, 0, 16, 16, [150, 118, 84]);
  strokeRect(png, 16, 0, 16, 16, [92, 70, 48]);   // dark mortar outline
  fillRect(png, 18, 2, 12, 5, [176, 142, 104]);   // top brick highlight
  fillRect(png, 18, 9, 12, 5, [176, 142, 104]);   // bottom brick highlight
  fillRect(png, 16, 7, 16, 2, [92, 70, 48]);      // mortar line across middle

  save(png, 'public/assets/sprites/tileset.png');
}

// --- 2) player sheet: 3 cols x 4 rows of 16x24 frames (48x96) -------------
// Columns: [idle, walkA, walkB].  Rows: [down, left, right, up].
// A blocky little person with a coloured shirt and a facing marker so you can
// tell which way they look, and shifting feet so the walk cycle is visible.
function buildPlayer() {
  const FW = 16, FH = 24, COLS = 3, ROWS = 4;
  const png = makeImage(FW * COLS, FH * ROWS);

  const SKIN = [232, 190, 152];
  const HAIR = [66, 48, 40];
  const SHIRT = [70, 120, 180];
  const PANTS = [58, 62, 78];
  const SHOE = [30, 30, 36];
  const EYES = [20, 20, 24];

  // Draw one frame. dir: 0=down 1=left 2=right 3=up. step: 0=idle 1=A 2=B
  function drawFrame(col, row, dir, step) {
    const ox = col * FW;
    const oy = row * FH;

    // Head (6x6) near the top, centred.
    fillRect(png, ox + 5, oy + 2, 6, 6, SKIN);
    // Hair cap on top / back depending on facing.
    if (dir === 3) fillRect(png, ox + 5, oy + 2, 6, 4, HAIR);       // up: back of head
    else fillRect(png, ox + 5, oy + 2, 6, 2, HAIR);                 // fringe
    if (dir === 1) fillRect(png, ox + 9, oy + 2, 2, 6, HAIR);       // left: hair on right side
    if (dir === 2) fillRect(png, ox + 5, oy + 2, 2, 6, HAIR);       // right: hair on left side

    // Eyes / facing marker (skip for 'up' since we see the back of the head).
    if (dir === 0) { setPixel(png, ox + 6, oy + 5, EYES); setPixel(png, ox + 9, oy + 5, EYES); }
    if (dir === 1) { setPixel(png, ox + 6, oy + 5, EYES); }
    if (dir === 2) { setPixel(png, ox + 9, oy + 5, EYES); }

    // Torso / shirt (8 wide x 7 tall).
    fillRect(png, ox + 4, oy + 8, 8, 7, SHIRT);
    // Arms (1px columns either side).
    fillRect(png, ox + 3, oy + 8, 1, 6, SKIN);
    fillRect(png, ox + 12, oy + 8, 1, 6, SKIN);

    // Legs / pants (two legs).
    fillRect(png, ox + 5, oy + 15, 2, 5, PANTS);
    fillRect(png, ox + 9, oy + 15, 2, 5, PANTS);

    // Feet — shift them to fake a walk step.
    // idle: both feet level. walkA: left foot forward. walkB: right foot forward.
    let leftFootY = oy + 20, rightFootY = oy + 20;
    if (step === 1) { leftFootY = oy + 19; rightFootY = oy + 21; }
    if (step === 2) { leftFootY = oy + 21; rightFootY = oy + 19; }
    fillRect(png, ox + 5, leftFootY, 2, 2, SHOE);
    fillRect(png, ox + 9, rightFootY, 2, 2, SHOE);
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) drawFrame(col, row, row, col);
  }

  save(png, 'public/assets/sprites/player.png');
}

buildTileset();
buildPlayer();
console.log('done');
