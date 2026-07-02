// The main "play" scene for Stage 1: it loads the test room and draws it.
// A "period" is a chunk of the school day; for now there is exactly one
// hardcoded test room so we can walk around and check the basics work.
//
// LATER STAGE: this scene will be data-driven — it will read which map/period
// to load from a JSON descriptor instead of the single hardcoded key below.
// That period-loader does NOT belong in Stage 1; see STAGE_01_RECAP.md.
import Phaser from 'phaser';

// Which map + tileset to load. Hardcoded for Stage 1 (one test room only).
const MAP_KEY = 'test-room';
const TILESET_IMAGE_KEY = 'tileset';
// This must match the tileset "name" embedded in the Tiled JSON map.
const TILESET_NAME_IN_MAP = 'tiles';

export default class PeriodScene extends Phaser.Scene {
  constructor() {
    super('PeriodScene');
  }

  preload() {
    // The tileset picture and the map layout (in Tiled's JSON format).
    this.load.image(TILESET_IMAGE_KEY, 'assets/sprites/tileset.png');
    this.load.tilemapTiledJSON(MAP_KEY, 'assets/maps/test-room.json');
  }

  create() {
    // Build the tilemap from the loaded JSON and hook up the tileset image.
    const map = this.make.tilemap({ key: MAP_KEY });
    const tiles = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);

    // Draw the two layers, floor first (underneath) then walls (on top).
    map.createLayer('floor', tiles, 0, 0);
    map.createLayer('walls', tiles, 0, 0);

    // Keep references for later checkpoints (collision, camera bounds).
    this.map = map;
  }
}
