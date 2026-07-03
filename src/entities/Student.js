// A student: a citeable kid who fills the hall. Built to be EXTENDED, not
// replaced (Stage 6 adds the "up to no good" discretion mechanic + a runner).
//
// Behaviours (spec.behaviour):
//   'wander' — drifts in random cardinal directions (the Stage 5 default).
//   'loiter' — mostly stands around, occasional small moves.
//   'runner' — loiters until the player gets close, then BOLTS away, fast at
//              first then tiring (speed curve lives in systems/hallDuty.js).
//
// Discretion: `upToNoGood` guilty students are VISIBLY MARKED with a floating
// "!" so citing is fair, and read slightly different via a tint. The slip and
// scene decide what a cite DOES (see detentionSlip.js / hallDuty.citeOutcome).
//
// Extension points kept clean: chooseBehaviour(now), canDamage, cite().
import Phaser from 'phaser';
import { runnerSpeed, RUNNER_TRIGGER_RADIUS } from '../systems/hallDuty.js';

// --- Tunables (named constants near the top per house style) --------------
const STUDENT_SPEED = 30;       // wander speed in px/sec (slow, ambient)
const WANDER_MIN_MS = 700;      // shortest time before re-deciding direction
const WANDER_MAX_MS = 1600;     // longest time before re-deciding
const PAUSE_CHANCE = 0.35;      // chance a wander decision is "stand still"
const LOITER_PAUSE_CHANCE = 0.75; // loiterers stand still much more
const GUILTY_TINT = 0xffd27f;   // subtle warm tint for guilty kids (if none given)
const MARK_OFFSET_Y = -13;      // where the "!" floats above the head

export default class Student extends Phaser.Physics.Arcade.Sprite {
  // spec = { id, x, y, sprite?, tint?, canDamage?, speed?, upToNoGood?, behaviour? }
  constructor(scene, spec) {
    super(scene, spec.x, spec.y, spec.sprite || 'student');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // Feet hitbox, matching the player/NPCs so bumping feels consistent.
    this.body.setSize(12, 10);
    this.body.setOffset(2, 13);

    this.id = spec.id;
    this.canDamage = spec.canDamage === true; // does contact hurt the player?
    this.speed = spec.speed ?? STUDENT_SPEED;
    this.upToNoGood = spec.upToNoGood === true; // guilty?
    this.behaviour = spec.behaviour || 'wander';
    this.cited = false;

    // Runner state.
    this.runnerTriggered = false;
    this.runnerStartAt = 0;

    if (spec.tint != null) this.setTint(spec.tint);
    else if (this.upToNoGood) this.setTint(GUILTY_TINT);

    // Guilty tell: a floating "!" so a wrong cite is the player's fault, not the
    // game's. Innocent students have no marker.
    this.mark = null;
    if (this.upToNoGood) {
      this.mark = scene.add
        .text(spec.x, spec.y + MARK_OFFSET_Y, '!', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ff5555',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 1)
        .setDepth(400);
    }

    this.nextDecisionAt = 0;
  }

  // Called every frame by the scene.
  update() {
    if (!this.active || this.cited) return;

    // Freeze while play is frozen (conversations / panels), same as everyone.
    if (this.scene.isPlayFrozen && this.scene.isPlayFrozen()) {
      this.setVelocity(0, 0);
      this.updateMark();
      return;
    }

    const now = this.scene.time.now;
    if (this.behaviour === 'runner') {
      this.updateRunner(now);
    } else if (now >= this.nextDecisionAt) {
      this.chooseBehaviour(now);
      this.nextDecisionAt = now + Phaser.Math.Between(WANDER_MIN_MS, WANDER_MAX_MS);
    }
    this.updateMark();
  }

  // EXTENSION POINT: how to move for the next stretch. Dispatches on behaviour.
  chooseBehaviour() {
    if (this.behaviour === 'loiter') return this.loiterMove();
    return this.wanderMove();
  }

  wanderMove() {
    if (Math.random() < PAUSE_CHANCE) return this.setVelocity(0, 0);
    const [dx, dy] = Phaser.Utils.Array.GetRandom([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    this.setVelocity(dx * this.speed, dy * this.speed);
  }

  loiterMove() {
    if (Math.random() < LOITER_PAUSE_CHANCE) return this.setVelocity(0, 0);
    const [dx, dy] = Phaser.Utils.Array.GetRandom([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    this.setVelocity(dx * (this.speed * 0.6), dy * (this.speed * 0.6));
  }

  // Runner: loiter until the player gets close, then bolt away and tire out.
  updateRunner(now) {
    const player = this.scene.player;
    if (!this.runnerTriggered) {
      if (player && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= RUNNER_TRIGGER_RADIUS) {
        this.triggerRun(now);
        return;
      }
      if (now >= this.nextDecisionAt) {
        this.loiterMove();
        this.nextDecisionAt = now + Phaser.Math.Between(WANDER_MIN_MS, WANDER_MAX_MS);
      }
      return;
    }
    // Bolting: flee directly away from the player at the (decaying) run speed.
    const speed = runnerSpeed(now - this.runnerStartAt);
    let ax = player ? this.x - player.x : 1;
    let ay = player ? this.y - player.y : 0;
    const len = Math.hypot(ax, ay) || 1;
    this.setVelocity((ax / len) * speed, (ay / len) * speed);
  }

  triggerRun(now) {
    this.runnerTriggered = true;
    this.runnerStartAt = now;
    if (this.scene.onRunnerTriggered) this.scene.onRunnerTriggered(this);
  }

  // Keep the "!" marker glued above the head.
  updateMark() {
    if (this.mark) this.mark.setPosition(this.x, this.y + MARK_OFFSET_Y);
  }

  // Called by the slip on a valid cite. Leaves the world (scene owns the FX).
  cite() {
    if (this.cited) return;
    this.cited = true;
    this.setVelocity(0, 0);
    this.destroy();
  }

  // Make sure the floating marker goes with us.
  destroy(fromScene) {
    if (this.mark) {
      this.mark.destroy();
      this.mark = null;
    }
    super.destroy(fromScene);
  }
}
