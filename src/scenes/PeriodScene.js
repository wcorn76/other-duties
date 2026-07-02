// The main "play" scene for Stage 1: it loads the test room and draws it.
// A "period" is a chunk of the school day; for now there is exactly one
// hardcoded test room so we can walk around and check the basics work.
//
// LATER STAGE: this scene will be data-driven — it will read which map/period
// to load from a JSON descriptor instead of the single hardcoded key below.
// That period-loader does NOT belong in Stage 1; see STAGE_01_RECAP.md.
import Phaser from 'phaser';
import Player from '../entities/Player.js';

// Which map + tileset to load. Hardcoded for Stage 1 (one test room only).
const MAP_KEY = 'test-room';
const TILESET_IMAGE_KEY = 'tileset';
// This must match the tileset "name" embedded in the Tiled JSON map.
const TILESET_NAME_IN_MAP = 'tiles';

// Where the player starts, in tile coordinates (kept clear of walls).
const SPAWN_TILE_X = 3;
const SPAWN_TILE_Y = 3;

export default class PeriodScene extends Phaser.Scene {
  constructor() {
    super('PeriodScene');
  }

  preload() {
    // The tileset picture and the map layout (in Tiled's JSON format).
    this.load.image(TILESET_IMAGE_KEY, 'assets/sprites/tileset.png');
    this.load.tilemapTiledJSON(MAP_KEY, 'assets/maps/test-room.json');

    // The player sprite sheet: 16x24 frames laid out 3 columns x 4 rows.
    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth: 16,
      frameHeight: 24,
    });
  }

  create() {
    // Build the tilemap from the loaded JSON and hook up the tileset image.
    const map = this.make.tilemap({ key: MAP_KEY });
    const tiles = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);

    // Draw the two layers, floor first (underneath) then walls (on top).
    map.createLayer('floor', tiles, 0, 0);
    const wallsLayer = map.createLayer('walls', tiles, 0, 0);

    // Keep references for later checkpoints (collision, camera bounds).
    this.map = map;
    this.wallsLayer = wallsLayer;

    // Make every non-empty tile in the walls layer solid. The walls layer only
    // ever contains wall tiles (gid 2) and empty cells, so "everything that
    // isn't empty" is exactly the collidable walls.
    wallsLayer.setCollisionByExclusion([-1]);

    // Confine physics (and therefore the player) to the map, not just the
    // small camera viewport, so setCollideWorldBounds keeps them inside the room.
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Spawn the player at the centre of the chosen start tile.
    this.player = new Player(
      this,
      SPAWN_TILE_X * map.tileWidth + map.tileWidth / 2,
      SPAWN_TILE_Y * map.tileHeight + map.tileHeight / 2
    );

    // Stop the player from walking through walls.
    this.physics.add.collider(this.player, wallsLayer);
  }

  update() {
    // Drive the player's own per-frame logic (reading keys, animating).
    if (this.player) this.player.update();
  }
}
