// The main "play" scene. It loads the test room, spawns the player, props, and
// NPCs, and runs the interaction, carry, dialogue, and objective systems so the
// world has verbs: talk to people, tidy up, fetch-and-use items, and watch
// objectives tick off.
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Prop from '../entities/Prop.js';
import Npc from '../entities/Npc.js';
import InteractionSystem from '../systems/interaction.js';
import ObjectiveTracker from '../systems/objectives.js';
import ObjectivesHud from '../ui/objectivesHud.js';
import DialogueSystem, { dialoguePortraitAssets } from '../systems/dialogue.js';

// Which map + tileset to load. Hardcoded for now (one test room only).
const MAP_KEY = 'test-room';
const TILESET_IMAGE_KEY = 'tileset';
// This must match the tileset "name" embedded in the Tiled JSON map.
const TILESET_NAME_IN_MAP = 'tiles';

// Per-NPC tints for the shared placeholder body, so teachers look different.
const TINT_WASHINGTON = 0x66d0d0; // teal, matches the portrait
const TINT_PRINCE = 0xc080d0;     // purple, matches the portrait

// -------------------------------------------------------------------------
// DATA-DRIVEN SEAM: the scene's content (spawn, props/NPCs, objectives) is
// defined inline here as a plain config object. LATER STAGE (Stage 4): this
// comes from tasks.js + a JSON period descriptor instead; the systems below
// already take it as data, so only this block changes.
// -------------------------------------------------------------------------
const TEST_CONFIG = {
  spawn: { x: 56, y: 56 },

  entities: [
    // Stage 2 props.
    { type: 'prop', id: 'coffee_pot', sprite: 'coffee_pot', x: 64, y: 64, verb: 'use' },
    { type: 'prop', id: 'folder', sprite: 'folder', x: 120, y: 96, verb: 'pickup', item: 'folder' },
    { type: 'prop', id: 'desk', sprite: 'desk', x: 200, y: 64, verb: 'accepts', accepts: 'folder' },

    // Stage 3 — talk task: Mrs. Washington.
    { type: 'npc', id: 'washington', sprite: 'npc', x: 104, y: 56, dialogue: 'washington_p1', tint: TINT_WASHINGTON },

    // Stage 3 — trash task: three pieces of litter.
    { type: 'prop', id: 'trash1', sprite: 'trash', x: 88, y: 140, verb: 'trash', item: 'trash' },
    { type: 'prop', id: 'trash2', sprite: 'trash', x: 112, y: 140, verb: 'trash', item: 'trash' },
    { type: 'prop', id: 'trash3', sprite: 'trash', x: 136, y: 140, verb: 'trash', item: 'trash' },

    // Stage 3 — find_use task: Mrs. Prince (giver) + the copier (accepts).
    { type: 'npc', id: 'prince', sprite: 'npc', x: 168, y: 120, dialogue: 'prince_p1', tint: TINT_PRINCE },
    { type: 'prop', id: 'copier', sprite: 'copier', x: 240, y: 120, verb: 'accepts', accepts: 'stack_of_paper' },
  ],

  objectives: [
    // Stage 2.
    { id: 'coffee', type: 'interact', target: 'coffee_pot', text: 'Put the coffee out' },
    { id: 'file', type: 'deliver', item: 'folder', target: 'desk', text: 'File the folder' },
    // Stage 3.
    { id: 'talk_w', type: 'talk', target: 'washington', dialogue: 'washington_p1', text: 'Check in with Mrs. Washington' },
    { id: 'trash', type: 'trash', count: 3, text: 'Pick up the trash' },
    { id: 'copier', type: 'find_use', giver: 'prince', item: 'stack_of_paper', useTarget: 'copier', text: 'Sort out the copier' },
  ],
};

export default class PeriodScene extends Phaser.Scene {
  constructor() {
    super('PeriodScene');
  }

  preload() {
    // Map + tileset + player sheet.
    this.load.image(TILESET_IMAGE_KEY, 'assets/sprites/tileset.png');
    this.load.tilemapTiledJSON(MAP_KEY, 'assets/maps/test-room.json');
    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth: 16,
      frameHeight: 24,
    });

    // Shared NPC body + the portraits our conversations need.
    this.load.image('npc', 'assets/sprites/npc.png');
    for (const a of dialoguePortraitAssets()) this.load.image(a.key, a.path);

    // Every sprite referenced by an entity in the config (deduped by key).
    for (const e of TEST_CONFIG.entities) {
      if (e.sprite) this.load.image(e.sprite, `assets/sprites/${e.sprite}.png`);
    }
    // Items a find_use giver hands over aren't placed in the world, but still
    // need their art loaded for the "held above the head" sprite.
    for (const o of TEST_CONFIG.objectives) {
      if (o.type === 'find_use' && o.item) {
        this.load.image(o.item, `assets/sprites/${o.item}.png`);
      }
    }
  }

  create() {
    // --- map ---
    const map = this.make.tilemap({ key: MAP_KEY });
    const tiles = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);
    map.createLayer('floor', tiles, 0, 0);
    const wallsLayer = map.createLayer('walls', tiles, 0, 0);
    wallsLayer.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- player ---
    this.player = new Player(this, TEST_CONFIG.spawn.x, TEST_CONFIG.spawn.y);
    this.physics.add.collider(this.player, wallsLayer);

    // --- camera ---
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true);

    // --- event bus + systems ---
    this.bus = new Phaser.Events.EventEmitter();
    this.dialogue = new DialogueSystem(this, this.bus);
    this.interaction = new InteractionSystem(this, this.player, this.bus);

    // Spawn props and NPCs from the config; register them as interactables.
    for (const e of TEST_CONFIG.entities) {
      if (e.type === 'prop') {
        this.interaction.register(new Prop(this, e));
      } else if (e.type === 'npc') {
        const npc = new Npc(this, e);
        this.physics.add.collider(this.player, npc); // can't walk through a teacher
        this.interaction.register(npc);
      }
    }

    // --- objectives + HUD ---
    this.tracker = new ObjectiveTracker(
      this.bus,
      TEST_CONFIG.objectives,
      () => this.onAllComplete()
    );
    this.hud = new ObjectivesHud(this, this.bus, this.tracker.getObjectives());

    // find_use "givers": talking to the giver hands over the item. Stage 4's
    // tasks.js will own this granting; for now the scene wires it directly.
    this.bus.on('talk:done', ({ id }) => {
      const giverObj = TEST_CONFIG.objectives.find(
        (o) => o.type === 'find_use' && o.giver === id
      );
      if (giverObj) this.interaction.giveItem(giverObj.item);
    });
  }

  // Placeholder for the real end-of-period cutscene (a later stage).
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
    // Order matters a little: let dialogue consume input first when open, then
    // interaction (which early-returns while dialogue is open), then the player.
    if (this.dialogue) this.dialogue.update();
    if (this.interaction) this.interaction.update();
    if (this.player) this.player.update();
  }
}
