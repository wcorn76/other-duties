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
import Student from '../entities/Student.js';
import InteractionSystem from '../systems/interaction.js';
import DetentionSlip from '../systems/detentionSlip.js';
import ObjectiveTracker from '../systems/objectives.js';
import Score from '../systems/score.js';
import Composure, { DAMAGE_PER_HIT, IFRAME_MS } from '../systems/composure.js';
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

// Test students for Stage 5. These are spawned every run (independent of which
// tasks were picked) so citing/composure are always exercisable. `student_rowdy`
// can DAMAGE the player on contact. Stage 6 (Hall Duty) will replace these with
// data-driven student spawns; kept in-scene for now as a simple test harness.
const STUDENT_SPAWNS = [
  { id: 'student_a', x: 140, y: 100 },
  { id: 'student_b', x: 180, y: 132 },
  { id: 'student_c', x: 108, y: 152 },
  { id: 'student_rowdy', x: 224, y: 108, canDamage: true, tint: 0xff8080 },
];

// Response to taking a hit (the composure damage itself is in composure.js).
const KNOCKBACK_STRENGTH = 170; // px/sec shove away from the attacker
const KNOCKBACK_MS = 200;       // how long the shove lasts

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

    // Shared NPC + student bodies + the portraits our conversations need.
    this.load.image('npc', 'assets/sprites/npc.png');
    this.load.image('student', 'assets/sprites/student.png');
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

    // --- students (test harness for citing + composure) ---
    this.students = [];
    for (const spec of STUDENT_SPAWNS) {
      const student = new Student(this, spec);
      this.physics.add.collider(student, wallsLayer);
      this.students.push(student);
    }

    // --- objectives + HUD ---
    this.tracker = new ObjectiveTracker(
      this.bus,
      period.objectives,
      () => this.onAllComplete()
    );
    this.hud = new Hud(this, this.bus, this.tracker.getObjectives());

    // --- detention slip (primary gear, SPACE) ---
    this.slip = new DetentionSlip(this, this.player, this.bus);
    this.hud.setActiveGear('Slip');

    // --- score (live in the HUD) ---
    this.score = new Score({ onChange: (v) => this.hud.setScore(v) });
    this.hud.setScore(this.score.getValue());
    // Citing a student scores points.
    this.bus.on('cite:done', () => this.score.addCite());
    // Completing tasks scores a bonus: award for each newly-completed objective.
    this.doneCount = 0;
    this.bus.on('objective:updated', (list) => {
      const done = list.filter((o) => o.done).length;
      if (done > this.doneCount) this.score.addTaskComplete(done - this.doneCount);
      this.doneCount = done;
    });

    // --- composure / hearts (live in the HUD) ---
    this.composure = new Composure({
      onChange: (cur, max) => this.hud.setHearts(cur, max),
      onFail: () => this.onComposureLost(),
    });
    this.hud.setHearts(this.composure.getHearts(), this.composure.max);

    // Any student flagged canDamage hurts the player on contact.
    for (const student of this.students) {
      if (student.canDamage) {
        this.physics.add.overlap(this.player, student, () => this.onPlayerHit(student));
      }
    }

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

  // Called when the player overlaps a damaging student. Composure owns the
  // i-frame logic (repeat contact during i-frames is ignored); here we react to
  // a hit that actually LANDS with knockback + a flash.
  onPlayerHit(student) {
    if (this.uiBlocked) return; // ignore while a panel owns the screen
    const res = this.composure.damage(DAMAGE_PER_HIT, this.time.now);
    if (res.blocked) return;

    // Shove the player away from the student.
    const angle = Phaser.Math.Angle.Between(student.x, student.y, this.player.x, this.player.y);
    this.player.knockback(
      Math.cos(angle) * KNOCKBACK_STRENGTH,
      Math.sin(angle) * KNOCKBACK_STRENGTH,
      KNOCKBACK_MS
    );

    // Blink the player for the i-frame window so invulnerability is visible.
    this.flashPlayer();
  }

  // Blink the player's alpha for roughly the i-frame duration.
  flashPlayer() {
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: Math.max(1, Math.floor(IFRAME_MS / 200) - 1),
      onComplete: () => this.player.setAlpha(1),
    });
  }

  // Composure hit zero: freeze play and show the fail message, then Title.
  // Mirrors the period-complete flow.
  onComposureLost() {
    this.uiBlocked = true;
    this.panel = Panel.message(this, {
      main: 'Composure lost',
      sub: 'The day got the better of you.',
      onDismiss: () => this.scene.start('TitleScene'),
    });
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
    if (this.slip) this.slip.update();
    if (this.player) this.player.update();
    if (this.students) {
      for (const s of this.students) if (s.active) s.update();
    }
  }
}
