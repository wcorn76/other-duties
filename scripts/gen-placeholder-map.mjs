// DEV-ONLY tool. Writes the Stage 1 test room as a Tiled-format JSON map.
// We are NOT installing the Tiled editor this stage, but we hand-build the file
// in Tiled's own JSON format so it can be opened and edited in Tiled later.
// Run with:  node scripts/gen-placeholder-map.mjs
// Output:    public/assets/maps/test-room.json

import { writeFileSync } from 'node:fs';

const WIDTH = 30;          // tiles across
const HEIGHT = 20;         // tiles down
const TILE = 16;           // pixels per tile
const FLOOR = 1;           // gid 1 = floor tile
const WALL = 2;            // gid 2 = wall tile (this is what the player collides with)
const EMPTY = 0;           // 0 = no tile

// helper: index into a flat row-major array
const idx = (x, y) => y * WIDTH + x;

// Floor layer: solid floor everywhere.
const floorData = new Array(WIDTH * HEIGHT).fill(FLOOR);

// Walls layer: start empty, then draw the border and a few interior walls.
const wallData = new Array(WIDTH * HEIGHT).fill(EMPTY);

// Outer border wall.
for (let x = 0; x < WIDTH; x++) {
  wallData[idx(x, 0)] = WALL;
  wallData[idx(x, HEIGHT - 1)] = WALL;
}
for (let y = 0; y < HEIGHT; y++) {
  wallData[idx(0, y)] = WALL;
  wallData[idx(WIDTH - 1, y)] = WALL;
}

// A horizontal interior wall with a gap to walk through.
for (let x = 5; x <= 12; x++) {
  if (x === 8 || x === 9) continue; // doorway gap
  wallData[idx(x, 10)] = WALL;
}

// A vertical interior wall with a gap.
for (let y = 4; y <= 12; y++) {
  if (y === 8) continue; // doorway gap
  wallData[idx(20, y)] = WALL;
}

// A couple of lone pillars to bump into.
wallData[idx(24, 6)] = WALL;
wallData[idx(24, 7)] = WALL;
wallData[idx(15, 15)] = WALL;

// Assemble the Tiled JSON structure.
const map = {
  compressionlevel: -1,
  width: WIDTH,
  height: HEIGHT,
  tilewidth: TILE,
  tileheight: TILE,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  nextlayerid: 3,
  nextobjectid: 1,
  // Embedded tileset so Phaser can resolve gids without an external .tsx file.
  tilesets: [
    {
      firstgid: 1,
      name: 'tiles',
      image: 'tileset.png',
      imagewidth: 32,
      imageheight: 16,
      tilewidth: TILE,
      tileheight: TILE,
      tilecount: 2,
      columns: 2,
      margin: 0,
      spacing: 0,
    },
  ],
  layers: [
    {
      id: 1,
      name: 'floor',
      type: 'tilelayer',
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT,
      data: floorData,
    },
    {
      id: 2,
      name: 'walls',
      type: 'tilelayer',
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      width: WIDTH,
      height: HEIGHT,
      data: wallData,
    },
  ],
};

writeFileSync(
  'public/assets/maps/test-room.json',
  JSON.stringify(map, null, 2)
);
console.log('wrote public/assets/maps/test-room.json');
