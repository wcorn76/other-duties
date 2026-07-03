// The detention slip — the player's primary "gear", used with SPACE.
//
// Pressing SPACE does a quick directional SWIPE: a brief flash appears in a
// hitbox IN FRONT of the player (based on which way they're facing). Any student
// caught in that hitbox is CITED — they get a "DETENTION!" pop + a little poof
// and leave the world, and a `cite:done { id }` event fires on the bus (the
// score system listens for it). There's a short cooldown between swipes.
//
// SPACE is the slip's key (it was reserved for exactly this). No other keys are
// touched. The slip does nothing while play is frozen (panels / dialogue).
//
// In "discretion" periods (Hall Duty) the slip routes the cite by whether the
// student was up to no good (see hallDuty.citeOutcome): a GUILTY cite removes
// them and scores; an INNOCENT cite is a mistake — no points, the kid STAYS, and
// the scene docks a heart. In non-discretion periods (First Period) every cite
// just scores, exactly as in Stage 5. The scene decides the score/heart effects
// by listening to `cite:done { id, guilty }`.
import Phaser from 'phaser';
import { citeOutcome } from './hallDuty.js';

// --- Tunables (named constants near the top) ------------------------------
const SLIP_COOLDOWN_MS = 350; // minimum time between swipes
const HITBOX_LEN = 22;        // reach of the swipe, in the facing direction
const HITBOX_WIDTH = 20;      // breadth of the swipe, across the facing direction
const HITBOX_GAP = 4;         // small gap between the player and the hitbox
const SWIPE_FX_MS = 140;      // how long the swipe flash lingers
const FX_DEPTH = 500;         // above the play field, below the HUD (1000)

// Unit vector for each facing direction.
const DIR = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export default class DetentionSlip {
  constructor(scene, player, bus) {
    this.scene = scene;
    this.player = player;
    this.bus = bus;
    this.readyAt = 0; // scene time when the next swipe is allowed

    this.spaceKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
  }

  update() {
    // No swiping while a panel/conversation owns the screen.
    if (this.scene.isPlayFrozen && this.scene.isPlayFrozen()) return;

    const now = this.scene.time.now;
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && now >= this.readyAt) {
      this.swipe(now);
    }
  }

  swipe(now) {
    this.readyAt = now + SLIP_COOLDOWN_MS;

    const rect = this.hitboxFor(this.player.facing);
    this.showSwipeFx(rect);
    if (this.scene.hud && this.scene.hud.pulseGear) this.scene.hud.pulseGear();

    // Cite every active student caught in the hitbox.
    const students = this.scene.students || [];
    // Iterate a copy since citing mutates the scene's students array.
    for (const student of [...students]) {
      if (!student.active) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, student.getBounds())) {
        this.cite(student);
      }
    }
  }

  // Build the swipe hitbox rectangle in front of the player for a given facing.
  hitboxFor(facing) {
    const dir = DIR[facing] || DIR.down;
    const horizontal = dir.x !== 0;
    const w = horizontal ? HITBOX_LEN : HITBOX_WIDTH;
    const h = horizontal ? HITBOX_WIDTH : HITBOX_LEN;
    const cx = this.player.x + dir.x * (HITBOX_GAP + w / 2);
    const cy = this.player.y + dir.y * (HITBOX_GAP + h / 2);
    return new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
  }

  cite(student) {
    const { x, y } = student;
    const discretion = this.scene.period && this.scene.period.discretion;
    const outcome = citeOutcome(student.upToNoGood, discretion);

    if (outcome === 'innocent') {
      // Wrong cite: the kid was innocent. No points, they STAY; the scene docks
      // a heart (it listens for guilty:false). Just a sheepish "?!" beat here.
      this.bus.emit('cite:done', { id: student.id, guilty: false });
      this.wrongCiteBeat(x, y);
      return;
    }

    // Valid cite (a guilty kid, or any kid in a non-discretion period).
    this.bus.emit('cite:done', { id: student.id, guilty: student.upToNoGood === true });
    this.detentionPop(x, y);
    this.poof(x, y);
    student.cite(); // removes it from the world

    const students = this.scene.students;
    if (students) {
      const i = students.indexOf(student);
      if (i >= 0) students.splice(i, 1);
    }
  }

  // --- feedback FX ---------------------------------------------------------

  showSwipeFx(rect) {
    const fx = this.scene.add
      .rectangle(rect.centerX, rect.centerY, rect.width, rect.height, 0xffffff, 0.4)
      .setDepth(FX_DEPTH);
    this.scene.tweens.add({
      targets: fx,
      alpha: 0,
      duration: SWIPE_FX_MS,
      onComplete: () => fx.destroy(),
    });
  }

  detentionPop(x, y) {
    const text = this.scene.add
      .text(x, y - 14, 'DETENTION!', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffd23f',
      })
      .setOrigin(0.5)
      .setDepth(FX_DEPTH + 1);
    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 650,
      onComplete: () => text.destroy(),
    });
  }

  // Brief "?!" over an innocent student who was cited by mistake.
  wrongCiteBeat(x, y) {
    const text = this.scene.add
      .text(x, y - 14, '?!', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#8fd0ff',
      })
      .setOrigin(0.5)
      .setDepth(FX_DEPTH + 1);
    this.scene.tweens.add({
      targets: text,
      y: y - 26,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  poof(x, y) {
    const puff = this.scene.add.circle(x, y, 6, 0xffffff, 0.7).setDepth(FX_DEPTH);
    this.scene.tweens.add({
      targets: puff,
      scale: 2.2,
      alpha: 0,
      duration: 260,
      onComplete: () => puff.destroy(),
    });
  }
}
