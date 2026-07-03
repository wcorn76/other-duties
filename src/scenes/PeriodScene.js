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
import ObjectiveTracker, { pointInRect } from '../systems/objectives.js';
import Score from '../systems/score.js';
import Composure, { DAMAGE_PER_HIT, IFRAME_MS } from '../systems/composure.js';
import Hud from '../ui/hud.js';
import Panel from '../ui/panel.js';
import DialogueSystem, { dialoguePortraitAssets } from '../systems/dialogue.js';
import InvestigationReader from '../systems/investigationReader.js';
import period1 from '../../data/periods/period_1.json';
import { buildPeriod, installTaskWiring } from '../systems/tasks.js';
import { countUncitedGuilty, TARDY_PENALTY } from '../systems/hallDuty.js';
import Meters from '../systems/meters.js';
import Bathroom from '../systems/bathroom.js';

// Which map + tileset to load. Hardcoded for now (one test room only).
const MAP_KEY = 'test-room';
const TILESET_IMAGE_KEY = 'tileset';
// This must match the tileset "name" embedded in the Tiled JSON map.
const TILESET_NAME_IN_MAP = 'tiles';

// Response to taking a hit (the composure damage itself is in composure.js).
const KNOCKBACK_STRENGTH = 170; // px/sec shove away from the attacker
const KNOCKBACK_MS = 200;       // how long the shove lasts

// Countdown: when the remaining time is at/under this many seconds, the HUD
// timer reddens and flashes each second.
const LOW_TIMER_SECONDS = 10;

// Lunch Duty: how often a fresh piece of trash appears to be cleaned up (ms).
const TRASH_SPAWN_EVERY_MS = 4000;

export default class PeriodScene extends Phaser.Scene {
  constructor() {
    super('PeriodScene');
  }

  // The scene is launched with { period } from the Title menu. Falls back to
  // First Period if started directly (e.g. a boot or a test harness).
  init(data) {
    this.periodData = (data && data.period) || period1;
  }

  preload() {
    const periodData = this.periodData;

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
    this.load.image('zone_marker', 'assets/sprites/zone_marker.png');
    this.load.image('bathroom_tell', 'assets/sprites/bathroom_tell.png');
    for (const a of dialoguePortraitAssets()) this.load.image(a.key, a.path);

    // IMPORTANT: buildPeriod() may pick a RANDOM subset at create() time, so we
    // preload art for the WHOLE period (every possible sprite/item), not just
    // the filtered subset. Whatever gets used is then already loaded.
    for (const e of periodData.entities ?? []) {
      if (e.sprite) this.load.image(e.sprite, `assets/sprites/${e.sprite}.png`);
    }
    // find_use items aren't placed entities but need their "held" art loaded.
    for (const t of periodData.taskPool ?? []) {
      if (t.type === 'find_use' && t.item) {
        this.load.image(t.item, `assets/sprites/${t.item}.png`);
      }
    }
    // Whole student roster — they all share the 'student' sprite, but load any
    // custom sprite keys just in case.
    for (const s of periodData.students ?? []) {
      if (s.sprite) this.load.image(s.sprite, `assets/sprites/${s.sprite}.png`);
    }
  }

  create() {
    // Build the period ONCE from the loaded data (picks tasks if it's a pool).
    const period = buildPeriod(this.periodData);
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
    this.reader = new InvestigationReader(this, this.bus);
    this.interaction = new InteractionSystem(this, this.player, this.bus);

    // Zone rects (id -> { x, y, w, h }) for cover/reach objectives, resolved
    // from spawned 'zone' entities and fed to the objective tracker each frame.
    this.zoneRects = {};

    // Spawn props, NPCs, and zones from the (filtered) period.
    for (const e of period.entities) {
      if (e.type === 'prop') {
        this.interaction.register(new Prop(this, e));
      } else if (e.type === 'npc') {
        const npc = new Npc(this, e);
        this.physics.add.collider(this.player, npc); // can't walk through a teacher
        this.interaction.register(npc);
      } else if (e.type === 'zone') {
        this.spawnZone(e);
      }
    }

    // --- students (data-driven from the period JSON) ---
    this.students = [];
    for (const spec of period.students) {
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
    // Points for a VALID cite: any cite in a non-discretion period, or a GUILTY
    // cite in a discretion period. Wrong (innocent) cites score nothing.
    this.bus.on('cite:done', ({ guilty }) => {
      if (!period.discretion || guilty) this.score.addCite();
    });
    // Wrong cite in a discretion period: dock a heart (respects i-frames), with
    // a flash but NO knockback — it's self-inflicted. The student stays.
    this.bus.on('cite:done', ({ guilty }) => {
      if (period.discretion && guilty === false) {
        const res = this.composure.damage(DAMAGE_PER_HIT, this.time.now);
        if (!res.blocked) this.flashPlayer();
      }
    });
    // Completing tasks scores a bonus, once per objective. Also: when a `cover`
    // task finishes, flash its "thanks" message.
    this.doneIds = new Set();
    this.bus.on('objective:updated', (list) => {
      for (const o of list) {
        if (!o.done || this.doneIds.has(o.id)) continue;
        this.doneIds.add(o.id);
        this.score.addTaskComplete(1);
        if (o.type === 'cover') {
          const def = period.objectives.find((d) => d.id === o.id);
          this.announce((def && def.doneMsg) || 'Covered — thanks!');
        }
      }
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

    // --- Lunch Duty boss meters (Stage 8) ---
    // A `type:'boss'` period with `meters` runs the chaos-meter loop on top of
    // the shared timed harness. The three meters rise on their own and are
    // pushed down by matching actions (trash pickup / cite / bathroom grant).
    this.isBoss = period.type === 'boss' && Array.isArray(period.meters);
    this.failed = false;
    this.survived = false;
    if (this.isBoss) {
      this.meters = new Meters({
        meters: period.meters,
        onBreak: (id) => this.onMeterBroke(id),
      });
      this.hud.initMeters(this.meters.getMeters());
      this._trashAccum = 0;
      this._trashCount = 0;

      // TRASH meter: every trash pickup (collect:done, Stage 3 path) drops it.
      this.bus.on('collect:done', () => {
        this.meters.lower('trash');
        this.hud.updateMeters(this.meters.getMeters());
      });
      // MISCHIEF meter: citing a mischief (guilty) student drops it.
      this.bus.on('cite:done', ({ guilty }) => {
        if (guilty) {
          this.meters.lower('mischief');
          this.hud.updateMeters(this.meters.getMeters());
        }
      });
      // BATHROOM meter: a diner raises a hand; granting (E) drops it.
      this.bathroom = new Bathroom(this, this.bus, this.interaction, this.meters, this.hud);
    }

    // --- countdown / tardy bell (timed periods only, e.g. Hall Duty) ---
    this.hasTimer = period.timeLimit != null;
    this.timerRunning = false; // starts when the player dismisses the briefing
    this.belled = false;
    if (this.hasTimer) {
      this.timeRemainingMs = period.timeLimit * 1000;
      this.lastTimerSec = null;
      this.hud.setTimer(period.timeLimit, period.timeLimit <= LOW_TIMER_SECONDS);
    }

    // find_use "givers": the content layer owns this now (talking to the giver
    // hands over the item into the carry slot).
    installTaskWiring(period.objectives, this.bus, this.interaction);

    // Period-start to-do panel. Freeze play (same mechanism dialogue uses) and
    // list the tasks that were ACTUALLY picked (from the tracker, so it always
    // matches the random subset). Dismiss with E/Enter to begin.
    this.uiBlocked = true;
    // Boss periods brief the controls (they have no objective checklist);
    // ordinary periods list the tasks that were actually picked.
    const briefing = this.isBoss
      ? {
          title: period.name || 'Lunch Duty',
          lines: [
            'Survive to 0:00 — keep every meter down!',
            'Mischief: cite the trouble (Space)',
            'Trash: pick up the litter (E)',
            'Bathroom: grant the hall pass (E)',
          ],
        }
      : {
          title: (this.period && this.period.name) || 'To-Do',
          lines: this.tracker.getObjectives().map((o) => o.text),
        };
    this.panel = Panel.todoList(this, {
      ...briefing,
      onDismiss: () => {
        this.panel = null;
        this.uiBlocked = false; // unfreeze play
        if (this.hasTimer) this.timerRunning = true; // start the clock
      },
    });
  }

  // True while play should be frozen: during a conversation OR while a UI panel
  // is up. Player.update and interaction.update both consult this single
  // predicate, so there is exactly ONE freeze path.
  isPlayFrozen() {
    return (
      (this.dialogue && this.dialogue.isOpen()) ||
      (this.reader && this.reader.isOpen()) ||
      this.uiBlocked
    );
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

  // A brief camera-pinned announcement banner (e.g. "We've got a runner!").
  announce(message) {
    const t = this.add
      .text(192, 62, message, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffd23f',
        backgroundColor: '#101018',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1400);
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 900,
      duration: 600,
      onComplete: () => t.destroy(),
    });
  }

  // A runner just bolted (called by the Student when the player gets close).
  onRunnerTriggered() {
    this.announce("We've got a runner!");
  }

  // Draw a translucent floor marker for a cover/reach zone and record its rect.
  spawnZone(e) {
    this.add
      .tileSprite(e.x, e.y, e.w, e.h, 'zone_marker')
      .setOrigin(0, 0)
      .setDepth(0.5); // above the floor, translucent so the player reads through
    this.add
      .text(e.x + e.w / 2, e.y + e.h / 2, 'COVER\nHERE', {
        fontFamily: 'monospace', fontSize: '8px', color: '#bffff0', align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(0.6);
    this.zoneRects[e.id] = { x: e.x, y: e.y, w: e.w, h: e.h };
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
  // Mirrors the period-complete flow. This is the hard fail at ANY time.
  onComposureLost() {
    this.timerRunning = false; // stop the clock
    this.uiBlocked = true;
    this.panel = Panel.message(this, {
      main: 'Composure lost',
      sub: 'The day got the better of you.',
      onDismiss: () => this.scene.start('TitleScene'),
    });
  }

  // Fires once all objectives are complete (via the tracker's onComplete). For
  // Hall Duty this is the WIN (all guilty cited before the bell).
  onAllComplete() {
    this.timerRunning = false; // beat the bell — stop the clock
    // Read the period's completion data defensively — those follow-on scenes
    // (oc.next / oc.cutscene) don't exist yet, so we only DISPLAY them.
    const oc = this.period && this.period.onComplete ? this.period.onComplete : {};
    this.uiBlocked = true;
    this.panel = Panel.message(this, {
      main: oc.title || 'Period complete!', // Hall Duty sets "Hall cleared!"
      sub: oc.next ? 'Up next: ' + oc.next : '',
      onDismiss: () => this.scene.start('TitleScene'),
    });
  }

  // Count down the passing period; when it hits zero, ring the bell.
  updateTimer(delta) {
    if (!this.hasTimer || !this.timerRunning || this.isPlayFrozen()) return;

    this.timeRemainingMs = Math.max(0, this.timeRemainingMs - delta);
    const sec = Math.ceil(this.timeRemainingMs / 1000);
    if (sec !== this.lastTimerSec) {
      this.lastTimerSec = sec;
      const warning = sec <= LOW_TIMER_SECONDS;
      this.hud.setTimer(sec, warning);
      if (warning && sec > 0) this.hud.pulseTimer();
    }
    if (this.timeRemainingMs <= 0) {
      if (this.isBoss) this.onLunchSurvived(); // survived the 3 minutes = win
      else this.ringBell();
    }
  }

  // Lunch Duty WIN: reached 0:00 with no meter maxed. (No tardy tally here —
  // survival IS the success condition.)
  onLunchSurvived() {
    if (this.survived || this.failed) return;
    this.survived = true;
    this.timerRunning = false;
    this.hud.setTimer(0, false);
    const oc = (this.period && this.period.onComplete) || {};
    this.uiBlocked = true;
    this.panel = Panel.message(this, {
      main: oc.title || 'Lunch survived!',
      sub: `Final score ${this.score.getValue()}`,
      onDismiss: () => this.scene.start('TitleScene'),
    });
  }

  // Lunch Duty FAIL: a meter maxed out — the lunch lady storms out and yells,
  // then the level restarts. (Escalation makes late-clock maxes likely.)
  onMeterBroke(id) {
    if (this.failed || this.survived) return;
    this.failed = true;
    this.timerRunning = false;
    this.bus.emit('meter:broke', { id });
    this.showLunchLady();
    this.uiBlocked = true;
    this.panel = Panel.message(this, {
      main: 'The lunch lady storms out!',
      sub: '"WHO is supervising in here?!"',
      footer: 'Press E to try again',
      onDismiss: () => this.scene.restart({ period: this.periodData }),
    });
  }

  // Spawn fresh trash to be cleaned up (drives the Trash meter down when picked
  // up). Called each frame from the boss loop with the frame delta.
  updateTrashSpawner(delta) {
    this._trashAccum += delta;
    if (this._trashAccum < TRASH_SPAWN_EVERY_MS) return;
    this._trashAccum = 0;
    // Random spot in the open cafeteria floor (clear of the interior walls).
    const x = Phaser.Math.Between(30, 300);
    const y = Phaser.Math.Between(40, 150);
    const prop = new Prop(this, {
      id: 'lunch_trash_' + this._trashCount++,
      sprite: 'trash',
      x,
      y,
      verb: 'trash',
      item: 'trash',
    });
    this.interaction.register(prop);
  }

  // The bell: freeze play, tally every still-uncited guilty kid as a tardy,
  // apply the tardy penalty, and show the results. Then E -> Title.
  ringBell() {
    if (this.belled) return;
    this.belled = true;
    this.timerRunning = false;
    this.hud.setTimer(0, true);

    const tardies = countUncitedGuilty(this.students);
    if (tardies > 0) this.score.add(-TARDY_PENALTY * tardies, 'tardy');
    this.bus.emit('bell:done', { tardies });

    this.uiBlocked = true;
    this.panel = Panel.message(this, {
      main: 'Bell rings!',
      sub: `${tardies} tard${tardies === 1 ? 'y' : 'ies'} • Final score ${this.score.getValue()}`,
      onDismiss: () => this.scene.start('TitleScene'),
    });
  }

  update(time, delta) {
    // Order matters: dialogue and the panel consume input FIRST (each via
    // JustDown, which consumes the press for that frame), THEN interaction and
    // the player — which both early-return while play is frozen. This is what
    // stops a dismiss/confirm keypress from leaking into a gameplay interaction.
    if (this.dialogue) this.dialogue.update();
    if (this.reader) this.reader.update();
    if (this.panel) this.panel.update();
    if (this.interaction) this.interaction.update();
    if (this.slip) this.slip.update();
    if (this.player) this.player.update();
    if (this.students) {
      for (const s of this.students) if (s.active) s.update();
    }

    // Zone-based objectives (cover dwell / reach): accrue only while playing,
    // pausing whenever a panel/dialogue owns the screen.
    if (this.tracker && !this.isPlayFrozen()) {
      this.tracker.tickZoneObjectives(delta, (o) => {
        const r = this.zoneRects[o.zone];
        return !!r && pointInRect(this.player.x, this.player.y, r);
      });
    }

    // Lunch Duty meters: rise (faster as the clock runs down) while playing.
    if (this.isBoss && this.meters && this.timerRunning && !this.isPlayFrozen()) {
      const total = this.period.timeLimit * 1000;
      const timeFraction = 1 - this.timeRemainingMs / total;
      this.meters.tick(delta / 1000, timeFraction);
      this.hud.updateMeters(this.meters.getMeters());
      this.updateTrashSpawner(delta);
      if (this.bathroom) this.bathroom.update(this.time.now);
    }

    this.updateTimer(delta);
  }

  // Placeholder lunch-lady pop for the fail screen (art added in Phase D; this
  // no-ops until the texture exists).
  showLunchLady() {
    if (!this.textures.exists('lunch_lady')) return;
    const img = this.add.image(192, 92, 'lunch_lady').setScrollFactor(0).setDepth(1450).setScale(0.6);
    this.tweens.add({ targets: img, scale: 1, duration: 200 });
  }
}
