// DEV-ONLY tool. Draws the placeholder art as PNG files.
// This is NOT part of the game that ships to players — it just makes the
// stand-in tileset, character, and prop images so we have something to look at.
// Run it with:  node scripts/gen-placeholder-assets.mjs
//
// It writes:
//   public/assets/sprites/tileset.png     (2 tiles: floor + wall, 16x16 each)
//   public/assets/sprites/player.png       (character sheet, 16x24 frames)
//   public/assets/sprites/coffee_pot.png   (prop, 16x16)  [Stage 2]
//   public/assets/sprites/folder.png        (prop, 16x16)  [Stage 2]
//   public/assets/sprites/desk.png          (prop, 16x16)  [Stage 2]
//   public/assets/sprites/npc.png           (NPC body, 16x24 idle, tintable) [Stage 3]
//   public/assets/sprites/portrait_*.png    (dialogue portraits, 48x48)       [Stage 3]
//   public/assets/sprites/trash.png         (prop, 16x16)                     [Stage 3]
//   public/assets/sprites/stack_of_paper.png(carriable item, 16x16)           [Stage 3]
//   public/assets/sprites/copier.png        (accepts target, 16x24)           [Stage 3]
//   public/assets/sprites/student.png        (citeable student, 16x24, tintable)[Stage 5]
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

// --- 3) Stage 2 props: each is its own 16x16 PNG -------------------------
// Kept deliberately simple and colour-coded so they read as distinct objects
// and none of them look like the tan brick wall.

// Coffee pot: dark carafe with a handle and a little red "on" light.
function buildCoffeePot() {
  const png = makeImage(16, 16);
  fillRect(png, 4, 4, 8, 10, [40, 40, 48]);      // body
  strokeRect(png, 4, 4, 8, 10, [20, 20, 26]);    // outline
  fillRect(png, 5, 3, 6, 2, [70, 70, 82]);       // lid
  fillRect(png, 12, 6, 2, 4, [40, 40, 48]);      // handle (right)
  setPixel(png, 13, 7, [20, 20, 26]);
  setPixel(png, 13, 8, [20, 20, 26]);
  fillRect(png, 6, 10, 4, 3, [120, 70, 40]);     // coffee window
  setPixel(png, 6, 12, [220, 60, 50]);           // red power light
  save(png, 'public/assets/sprites/coffee_pot.png');
}

// Folder: bright manila folder with a darker tab, clearly not wall-coloured.
function buildFolder() {
  const png = makeImage(16, 16);
  fillRect(png, 2, 6, 3, 2, [200, 170, 90]);     // tab
  fillRect(png, 2, 7, 12, 7, [235, 205, 120]);   // folder body
  strokeRect(png, 2, 7, 12, 7, [150, 120, 60]);  // outline
  fillRect(png, 4, 9, 8, 1, [150, 120, 60]);     // paper line
  fillRect(png, 4, 11, 6, 1, [150, 120, 60]);    // paper line
  save(png, 'public/assets/sprites/folder.png');
}

// Desk: brown wooden desk seen top-down, with a lighter top surface.
function buildDesk() {
  const png = makeImage(16, 16);
  fillRect(png, 1, 3, 14, 11, [92, 62, 38]);     // desk body
  strokeRect(png, 1, 3, 14, 11, [58, 38, 22]);   // outline
  fillRect(png, 3, 5, 10, 5, [140, 100, 62]);    // lighter desktop
  fillRect(png, 4, 11, 3, 2, [58, 38, 22]);      // drawer handles
  fillRect(png, 9, 11, 3, 2, [58, 38, 22]);
  save(png, 'public/assets/sprites/desk.png');
}

// --- Stage 3 -------------------------------------------------------------

// A tiny 5x7 pixel font, just the few capital letters we need for portrait
// initials. Each glyph is 7 rows of a 5-wide bit string ('1' = pixel).
const FONT_5x7 = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '01010'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
};

// Draw one glyph at (ox,oy), each font pixel scaled to `scale` real pixels.
function drawGlyph(png, glyph, ox, oy, scale, colour) {
  glyph.forEach((rowStr, row) => {
    [...rowStr].forEach((bit, col) => {
      if (bit === '1') {
        fillRect(png, ox + col * scale, oy + row * scale, scale, scale, colour);
      }
    });
  });
}

// A dialogue portrait: 48x48, a solid colour panel + a white initial so the
// two speakers are obviously different at a glance.
function buildPortrait(id, letter, bg) {
  const png = makeImage(48, 48);
  fillRect(png, 0, 0, 48, 48, bg);
  strokeRect(png, 0, 0, 48, 48, [20, 20, 26]);
  // Centre the 5x7 glyph scaled by 5 -> 25x35, roughly centred.
  drawGlyph(png, FONT_5x7[letter], 12, 7, 5, [255, 255, 255]);
  save(png, `public/assets/sprites/portrait_${id}.png`);
}

// A neutral NPC body (16x24 idle). Kept light/greyish so a per-NPC tint reads.
function buildNpc() {
  const png = makeImage(16, 24);
  const SKIN = [232, 200, 170];
  const BODY = [235, 235, 240]; // near-white so tint colours it strongly
  const LEG = [180, 180, 190];
  const SHOE = [40, 40, 48];
  fillRect(png, 5, 2, 6, 6, SKIN);       // head
  fillRect(png, 5, 2, 6, 2, [120, 100, 80]); // hair fringe
  setPixel(png, 6, 5, [20, 20, 24]);      // eyes
  setPixel(png, 9, 5, [20, 20, 24]);
  fillRect(png, 4, 8, 8, 7, BODY);        // torso
  fillRect(png, 3, 8, 1, 6, SKIN);        // arms
  fillRect(png, 12, 8, 1, 6, SKIN);
  fillRect(png, 5, 15, 2, 5, LEG);        // legs
  fillRect(png, 9, 15, 2, 5, LEG);
  fillRect(png, 5, 20, 2, 2, SHOE);       // feet
  fillRect(png, 9, 20, 2, 2, SHOE);
  save(png, 'public/assets/sprites/npc.png');
}

// Litter: a crumpled grey paper ball, clearly not floor or wall.
function buildTrash() {
  const png = makeImage(16, 16);
  fillRect(png, 4, 5, 8, 7, [200, 200, 205]); // paper wad
  strokeRect(png, 4, 5, 8, 7, [120, 120, 128]);
  setPixel(png, 6, 7, [130, 130, 140]);        // crease shadows
  setPixel(png, 9, 8, [130, 130, 140]);
  setPixel(png, 7, 10, [130, 130, 140]);
  fillRect(png, 3, 11, 10, 1, [110, 110, 120]); // squashed bottom
  save(png, 'public/assets/sprites/trash.png');
}

// A neat stack of white paper (the item you carry to the copier).
function buildStackOfPaper() {
  const png = makeImage(16, 16);
  fillRect(png, 3, 4, 11, 9, [245, 245, 245]);  // stack
  strokeRect(png, 3, 4, 11, 9, [150, 150, 155]);
  fillRect(png, 3, 6, 11, 1, [200, 200, 205]);  // sheet lines
  fillRect(png, 3, 8, 11, 1, [200, 200, 205]);
  fillRect(png, 3, 10, 11, 1, [200, 200, 205]);
  save(png, 'public/assets/sprites/stack_of_paper.png');
}

// A student body (16x24 idle). Kept light/greyish so a per-student tint reads,
// with backpack straps + a cap so it reads as a "kid", distinct from teachers.
function buildStudent() {
  const png = makeImage(16, 24);
  const SKIN = [232, 200, 170];
  const HOODIE = [225, 225, 230]; // near-white so a tint colours it strongly
  const STRAP = [90, 90, 100];    // backpack straps
  const LEG = [90, 95, 110];
  const SHOE = [40, 40, 48];
  const CAP = [110, 90, 70];
  fillRect(png, 5, 3, 6, 5, SKIN);        // head
  fillRect(png, 4, 2, 8, 2, CAP);          // cap brim
  setPixel(png, 6, 6, [20, 20, 24]);       // eyes
  setPixel(png, 9, 6, [20, 20, 24]);
  fillRect(png, 4, 9, 8, 7, HOODIE);       // hoodie torso
  fillRect(png, 6, 9, 1, 7, STRAP);        // left backpack strap
  fillRect(png, 9, 9, 1, 7, STRAP);        // right backpack strap
  fillRect(png, 3, 9, 1, 6, SKIN);         // arms
  fillRect(png, 12, 9, 1, 6, SKIN);
  fillRect(png, 5, 16, 2, 5, LEG);         // legs
  fillRect(png, 9, 16, 2, 5, LEG);
  fillRect(png, 5, 21, 2, 2, SHOE);        // feet
  fillRect(png, 9, 21, 2, 2, SHOE);
  save(png, 'public/assets/sprites/student.png');
}

// A copier: a tall grey machine with a paper tray and a green ready light.
function buildCopier() {
  const png = makeImage(16, 24);
  fillRect(png, 1, 3, 14, 19, [120, 124, 132]);  // body
  strokeRect(png, 1, 3, 14, 19, [70, 74, 82]);
  fillRect(png, 3, 5, 10, 4, [80, 84, 92]);       // lid/top
  setPixel(png, 12, 6, [90, 230, 120]);           // green ready light
  fillRect(png, 3, 12, 10, 2, [50, 52, 60]);      // control slot
  fillRect(png, 2, 17, 12, 3, [150, 154, 162]);   // paper tray
  save(png, 'public/assets/sprites/copier.png');
}

buildTileset();
buildPlayer();
buildCoffeePot();
buildFolder();
buildDesk();
buildNpc();
buildPortrait('washington', 'W', [56, 120, 120]); // teal
buildPortrait('prince', 'P', [130, 80, 150]);       // purple
buildPortrait('lewis', 'L', [200, 120, 60]);         // amber
// A translucent floor marker tile for "cover here" zones (16x16, tiled over the
// zone). Baked-in alpha so it reads as a soft highlight the player stands on.
function buildZoneMarker() {
  const png = makeImage(16, 16);
  fillRect(png, 0, 0, 16, 16, [70, 150, 140, 55]);      // soft teal fill
  strokeRect(png, 0, 0, 16, 16, [130, 230, 210, 150]);  // brighter edge
  // little corner ticks so the tiling reads as a marked area
  fillRect(png, 1, 1, 2, 2, [190, 250, 235, 200]);
  fillRect(png, 13, 1, 2, 2, [190, 250, 235, 200]);
  fillRect(png, 1, 13, 2, 2, [190, 250, 235, 200]);
  fillRect(png, 13, 13, 2, 2, [190, 250, 235, 200]);
  save(png, 'public/assets/sprites/zone_marker.png');
}

// A "raised hand" tell that floats over a student asking for the bathroom
// (Lunch Duty). Cyan so it reads distinct from the red mischief "!".
function buildBathroomTell() {
  const png = makeImage(16, 16);
  const HAND = [150, 220, 255];
  const OUT = [60, 120, 160];
  fillRect(png, 4, 7, 8, 6, HAND);   // palm
  fillRect(png, 4, 2, 1, 6, HAND);   // fingers
  fillRect(png, 6, 2, 1, 6, HAND);
  fillRect(png, 8, 2, 1, 6, HAND);
  fillRect(png, 10, 2, 1, 6, HAND);
  fillRect(png, 3, 8, 1, 3, HAND);   // thumb
  strokeRect(png, 4, 7, 8, 6, OUT);
  save(png, 'public/assets/sprites/bathroom_tell.png');
}

// A cafeteria table (32x16, top-down) with benches — Lunch Duty dressing.
function buildTable() {
  const png = makeImage(32, 16);
  fillRect(png, 0, 2, 32, 2, [130, 100, 75]);   // top bench
  fillRect(png, 0, 12, 32, 2, [130, 100, 75]);  // bottom bench
  fillRect(png, 2, 4, 28, 8, [170, 140, 110]);  // table top
  strokeRect(png, 2, 4, 28, 8, [110, 85, 60]);
  fillRect(png, 8, 6, 3, 3, [210, 210, 215]);   // a couple of trays
  fillRect(png, 20, 7, 3, 3, [210, 210, 215]);
  save(png, 'public/assets/sprites/table.png');
}

// The lunch lady (40x48): hairnet, apron, and a yelling mouth — for the fail pop.
function buildLunchLady() {
  const png = makeImage(40, 48);
  const SKIN = [235, 195, 160], NET = [70, 60, 60], APRON = [240, 240, 245];
  const DRESS = [150, 90, 110], BROW = [60, 40, 40], EYE = [20, 20, 24], MOUTH = [120, 40, 40];
  fillRect(png, 12, 4, 16, 14, SKIN);       // head
  fillRect(png, 11, 3, 18, 5, NET);          // hairnet
  fillRect(png, 14, 9, 5, 2, BROW);          // angry brows
  fillRect(png, 21, 9, 5, 2, BROW);
  fillRect(png, 15, 11, 2, 2, EYE);          // eyes
  fillRect(png, 23, 11, 2, 2, EYE);
  fillRect(png, 17, 14, 6, 3, MOUTH);        // yelling mouth
  fillRect(png, 8, 18, 24, 26, DRESS);       // body
  fillRect(png, 14, 20, 12, 22, APRON);      // apron
  fillRect(png, 4, 20, 4, 14, SKIN);         // arms
  fillRect(png, 32, 20, 4, 14, SKIN);
  save(png, 'public/assets/sprites/lunch_lady.png');
}

buildTrash();
buildStackOfPaper();
buildCopier();
buildStudent();
buildZoneMarker();
buildBathroomTell();
buildTable();
buildLunchLady();
console.log('done');
