// The main "play" scene. It loads the test room, spawns the player and the
// interactable props, and runs the interaction, carry, and objective systems
// so the world has verbs: walk up to a thing, press E, an objective ticks off.
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Prop from '../entities/Prop.js';
import InteractionSystem from '../systems/interaction.js';
import ObjectiveTracker from '../systems/objectives.js';
import ObjectivesHud from '../ui/objectivesHud.js';

// Which map + tileset to load. Hardcoded for now (one test room only).
const MAP_KEY = 'test-room';
const TILESET_IMAGE_KEY = 'tileset';
// This must match the tileset "name" embedded in the Tiled JSON map.
const TILESET_NAME_IN_MAP = 'tiles';

// -------------------------------------------------------------------------
// DATA-DRIVEN SEAM: for now the scene's content (where the player starts, what
// props exist, and the period's objectives) is defined inline here as a plain
// config object. LATER STAGE: this will be read from a JSON period descriptor
// instead of being hardcoded; the systems below already take it as data, so
// only this block changes. The shapes here are the canon Stage 2 shapes.
// -------------------------------------------------------------------------
const TEST_CONFIG = {
  // Where the player starts, in pixels. (Tile 3,3 -> 56,56.)
  spawn: { x: 56, y: 56 },

  // Props placed in the room.
  entities: [
    { type: 'prop', id: 'coffee_pot', sprite: 'coffee_pot', x: 64, y: 64, verb: 'use' },
    { type: 'prop', id: 'folder', sprite: 'folder', x: 120, y: 96, verb: 'pickup', item: 'folder' },
    { type: 'prop', id: 'desk', sprite: 'desk', x: 200, y: 64, verb: 'accepts', accepts: 'folder' },
  ],

  // The two things the player must do this period.
  objectives: [
    { id: 'coffee', type: 'interact', target: 'coffee_pot', text: 'Put the coffee out' },
    { id: 'file', type: 'deliver', item: 'folder', target: 'desk', text: 'File the folder' },
  ],
};

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

    // Load every prop image referenced by the config (deduped by key).
    for (const e of TEST_CONFIG.entities) {
      this.load.image(e.sprite, `assets/sprites/${e.sprite}.png`);
    }
  }

  create() {
    // --- map ---
    const map = this.make.tilemap({ key: MAP_KEY });
    const tiles = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);
    map.createLayer('floor', tiles, 0, 0);
    const wallsLayer = map.createLayer('walls', tiles, 0, 0);
    this.map = map;
    this.wallsLayer = wallsLayer;

    // Every non-empty tile in the walls layer is solid.
    wallsLayer.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- player ---
    this.player = new Player(this, TEST_CONFIG.spawn.x, TEST_CONFIG.spawn.y);
    this.physics.add.collider(this.player, wallsLayer);

    // --- camera ---
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true); // true = round to pixels

    // --- event bus ---
    // A dedicated emitter for gameplay events (interact:done, deliver:done, ...)
    // kept separate from Phaser's own scene events so they never collide.
    this.bus = new Phaser.Events.EventEmitter();

    // --- interaction + carry ---
    this.interaction = new InteractionSystem(this, this.player, this.bus);

    // Spawn props from the config and register them as interactables.
    for (const e of TEST_CONFIG.entities) {
      if (e.type !== 'prop') continue;
      const prop = new Prop(this, e);
      this.interaction.register(prop);
    }

    // --- objectives + HUD ---
    this.tracker = new ObjectiveTracker(
      this.bus,
      TEST_CONFIG.objectives,
      () => this.onAllComplete()
    );
    this.hud = new ObjectivesHud(this, this.bus, this.tracker.getObjectives());
  }

  // Placeholder for the real end-of-period cutscene (a later stage). For now we
  // just flash a message when every objective is checked off.
  onAllComplete() {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'All duties complete!', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(3000);
  }

  update() {
    if (this.player) this.player.update();
    if (this.interaction) this.interaction.update();
  }
}
