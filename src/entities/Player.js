// The player character (the school principal). This wraps a Phaser sprite:
// it reads the keyboard, moves using the shared movement math, and plays the
// right walk/idle animation for the direction being faced.
import Phaser from 'phaser';
import { computeMovement } from '../systems/movement.js';

// The sprite sheet is laid out as 3 columns x 4 rows of 16x24 frames.
// Columns: [idle, walkA, walkB].  Rows: [down, left, right, up].
// Frame number = row * 3 + column, so:
//   down = 0,1,2   left = 3,4,5   right = 6,7,8   up = 9,10,11
const IDLE_FRAME = { down: 0, left: 3, right: 6, up: 9 };
const WALK_FRAMES = {
  'walk-down': [1, 2],
  'walk-left': [4, 5],
  'walk-right': [7, 8],
  'walk-up': [10, 11],
};
const WALK_FRAME_RATE = 6; // animation speed of the 2-frame walk cycle

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player', IDLE_FRAME.down);

    // Register this sprite with the scene and the physics engine.
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Don't let the player walk off the edge of the map.
    this.setCollideWorldBounds(true);

    // Shrink the collision box to roughly the character's feet. This makes
    // movement feel right for a top-down view and lets them fit through
    // one-tile gaps. The visible sprite is unchanged; only the hitbox shrinks.
    this.body.setSize(12, 10);
    this.body.setOffset(2, 13);

    // Which way we're currently looking; used to pick the idle frame.
    this.facing = 'down';

    this.createAnimations(scene);

    // Set up both key sets: arrow keys and WASD.
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
  }

  // Build the four walking animations once (guarded so we don't redefine them).
  createAnimations(scene) {
    for (const [key, frames] of Object.entries(WALK_FRAMES)) {
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers('player', { frames }),
        frameRate: WALK_FRAME_RATE,
        repeat: -1, // loop forever while walking
      });
    }
  }

  // Called every frame by the scene. Reads input and moves/animates.
  update() {
    // Freeze the player while play is frozen (a conversation or a UI panel is
    // up). Same predicate the interaction system uses — one freeze path.
    if (this.scene.isPlayFrozen && this.scene.isPlayFrozen()) {
      this.setVelocity(0, 0);
      this.anims.stop();
      this.setFrame(IDLE_FRAME[this.facing]);
      return;
    }

    const c = this.cursors;
    const w = this.wasd;
    const input = {
      up: c.up.isDown || w.up.isDown,
      down: c.down.isDown || w.down.isDown,
      left: c.left.isDown || w.left.isDown,
      right: c.right.isDown || w.right.isDown,
    };

    const { vx, vy, moving, facing } = computeMovement(input, this.facing);
    this.facing = facing;
    this.setVelocity(vx, vy);

    if (moving) {
      this.anims.play('walk-' + facing, true);
    } else {
      // Standing still: stop the walk loop and show the idle frame.
      this.anims.stop();
      this.setFrame(IDLE_FRAME[facing]);
    }
  }
}
