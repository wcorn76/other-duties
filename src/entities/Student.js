// A student: a citeable kid who wanders the room. In Stage 5 the behaviour is
// deliberately simple (idle / random wander) — but it is built to be EXTENDED,
// not replaced. Stage 6 "Hall Duty" will subclass or reconfigure this to add
// herding and "up to no good" behaviour; the clean extension points are:
//   - chooseBehaviour(now): the ONLY place movement decisions are made. Override
//     it (or swap `this.speed`) to change how a student moves.
//   - canDamage: if true, the scene wires an overlap so contact hurts the player.
//   - cite(): what happens when the detention slip catches this student.
//
// Movement decisions are re-rolled on a timer; the student picks a random
// cardinal direction or pauses. It collides with walls (collider added by the
// scene) and freezes whenever play is frozen (dialogue / panels).
import Phaser from 'phaser';

// --- Tunables (named constants near the top per house style) --------------
const STUDENT_SPEED = 30;       // wander speed in px/sec (slow, ambient)
const WANDER_MIN_MS = 700;      // shortest time before re-deciding direction
const WANDER_MAX_MS = 1600;     // longest time before re-deciding
const PAUSE_CHANCE = 0.35;      // chance a decision is "stand still"

export default class Student extends Phaser.Physics.Arcade.Sprite {
  // spec = { id, x, y, sprite?, tint?, canDamage?, speed? }
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
    this.cited = false;

    if (spec.tint != null) this.setTint(spec.tint);

    // Schedule the first movement decision a touch into the future.
    this.nextDecisionAt = 0;
  }

  // Called every frame by the scene.
  update() {
    if (!this.active || this.cited) return;

    // Freeze while play is frozen (conversations / panels), same as everyone.
    if (this.scene.isPlayFrozen && this.scene.isPlayFrozen()) {
      this.setVelocity(0, 0);
      return;
    }

    const now = this.scene.time.now;
    if (now >= this.nextDecisionAt) {
      this.chooseBehaviour(now);
      this.nextDecisionAt =
        now + Phaser.Math.Between(WANDER_MIN_MS, WANDER_MAX_MS);
    }
  }

  // EXTENSION POINT: decide how to move this frame's stretch. Stage 5 default is
  // "wander randomly or pause". Stage 6 can override for herding / mischief.
  chooseBehaviour() {
    if (Math.random() < PAUSE_CHANCE) {
      this.setVelocity(0, 0);
      return;
    }
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];
    const [dx, dy] = Phaser.Utils.Array.GetRandom(dirs);
    this.setVelocity(dx * this.speed, dy * this.speed);
  }

  // Called by the detention slip when this student is caught. The scene owns
  // the celebratory FX (DETENTION pop + poof); here we just leave the world.
  cite() {
    if (this.cited) return;
    this.cited = true;
    this.setVelocity(0, 0);
    this.destroy();
  }
}
