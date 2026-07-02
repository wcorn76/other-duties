// The main "play" scene. It loads the test room, spawns the player, props, and
// NPCs, and runs the interaction, carry, dialogue, and objective systems so the
// world has verbs: talk to people, tidy up, fetch-and-use items, and watch
// objectives tick off.
//
// The scene's CONTENT now comes from a period data file (data/periods/*.json)
// via the tasks.js content layer, which picks a random subset of the period's
// task pool. This is the data-driven seam that replaced the old inline config.
import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Prop from '../entities/Prop.js';
import Npc from '../entities/Npc.js';
import InteractionSystem from '../systems/interaction.js';
import ObjectiveTracker from '../systems/objectives.js';
import Hud from '../ui/hud.js';
import Panel from '../ui/panel.js';
import DialogueSystem, { dialoguePortraitAssets } from '../systems/dialogue.js';
import period1 from '../../data/periods/period_1.json';
import { buildPeriod, installTaskWiring } from '../systems/tasks.js';

// Which map + tileset to load. Hardcoded for now (one test room only).
const MAP_KEY = 'test-room';
const TILESET_IMAGE_KEY = 'tileset';
// This must match the tileset "name" embedded in the Tiled JSON map.
const TILESET_NAME_IN_MAP = 'tiles';

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

    // IMPORTANT: buildPeriod() picks a RANDOM subset at create() time, so we
    // must preload art for the WHOLE period (every possible sprite/item), not
    // the filtered subset. Whatever gets picked is then already loaded.
    for (const e of period1.entities) {
      if (e.sprite) this.load.image(e.sprite, `assets/sprites/${e.sprite}.png`);
    }
    // Items a find_use giver hands over aren't placed entities, but still need
    // their "held above the head" art loaded — pull them from the full pool.
    for (const t of period1.taskPool) {
      if (t.type === 'find_use' && t.item) {
        this.load.image(t.item, `assets/sprites/${t.item}.png`);
      }
    }
  }

  create() {
    // Build the period ONCE: this picks the random subset of tasks and trims
    // the entity list down to only what those tasks need.
    const period = buildPeriod(period1);
    this.period = period;

    // When true, play is frozen for a UI panel (to-do / complete). This feeds
    // the SAME freeze predicate the dialogue system uses (see isPlayFrozen).
    this.uiBlocked = false;
    this.panel = null;

    // --- map ---
    const map = this.make.tilemap({ key: MAP_KEY });
    const tiles = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);
    map.createLayer('floor', tiles, 0, 0);
    const wallsLayer = map.createLayer('walls', tiles, 0, 0);
    wallsLayer.setCollisionByExclusion([-1]);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- player ---
    this.player = new Player(this, period.spawn.x, period.spawn.y);
    this.physics.add.collider(this.player, wallsLayer);

    // --- camera ---
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true);

    // --- event bus + systems ---
    this.bus = new Phaser.Events.EventEmitter();
    this.dialogue = new DialogueSystem(this, this.bus);
    this.interaction = new InteractionSystem(this, this.player, this.bus);

    // Spawn props and NPCs from the (filtered) period; register interactables.
    for (const e of period.entities) {
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
      period.objectives,
      () => this.onAllComplete()
    );
    this.hud = new Hud(this, this.bus, this.tracker.getObjectives());

    // find_use "givers": the content layer owns this now (talking to the giver
    // hands over the item into the carry slot).
    installTaskWiring(period.objectives, this.bus, this.interaction);

    // Period-start to-do panel. Freeze play (same mechanism dialogue uses) and
    // list the tasks that were ACTUALLY picked (from the tracker, so it always
    // matches the random subset). Dismiss with E/Enter to begin.
    this.uiBlocked = true;
    this.panel = Panel.todoList(this, {
      // buildPeriod() doesn't carry `name` through, so fall back to the raw
      // period file's name (then a generic default) rather than changing tasks.js.
      title: (this.period && this.period.name) || period1.name || 'To-Do',
      lines: this.tracker.getObjectives().map((o) => o.text),
      onDismiss: () => {
        this.panel = null;
        this.uiBlocked = false; // unfreeze play
      },
    });
  }

  // True while play should be frozen: during a conversation OR while a UI panel
  // is up. Player.update and interaction.update both consult this single
  // predicate, so there is exactly ONE freeze path.
  isPlayFrozen() {
    return (this.dialogue && this.dialogue.isOpen()) || this.uiBlocked;
  }

  // Fires once all objectives are complete (via the tracker's onComplete).
  onAllComplete() {
    // Read the period's completion data defensively — those follow-on scenes
    // (oc.next / oc.cutscene) don't exist yet, so we only DISPLAY them.
    const oc = this.period && this.period.onComplete ? this.period.onComplete : {};
    this.uiBlocked = true;
    this.panel = Panel.message(this, {
      main: 'Period complete!',
      sub: oc.next ? 'Up next: ' + oc.next : '',
      onDismiss: () => this.scene.start('TitleScene'),
    });
  }

  update() {
    // Order matters: dialogue and the panel consume input FIRST (each via
    // JustDown, which consumes the press for that frame), THEN interaction and
    // the player — which both early-return while play is frozen. This is what
    // stops a dismiss/confirm keypress from leaking into a gameplay interaction.
    if (this.dialogue) this.dialogue.update();
    if (this.panel) this.panel.update();
    if (this.interaction) this.interaction.update();
    if (this.player) this.player.update();
  }
}
