// Movement math for a top-down character. This file has NO Phaser code — it
// just answers the question: "given which direction keys are held, how fast
// and which way should the character move, and which way are they facing?"
// Keeping it separate makes the movement easy to tweak and reason about.

// --- Tunables (change these to adjust how it feels) ----------------------

// Walking speed in pixels per second.
export const MOVE_SPEED = 90;

// --- Logic ----------------------------------------------------------------

// input: { up, down, left, right } booleans (a key is held or not).
// prevFacing: the direction the character was last facing ('down' etc.),
//   so that when they stop we keep them facing the same way.
// Returns { vx, vy, moving, facing }.
export function computeMovement(input, prevFacing) {
  let vx = 0;
  let vy = 0;
  if (input.left) vx -= 1;
  if (input.right) vx += 1;
  if (input.up) vy -= 1;
  if (input.down) vy += 1;

  const moving = vx !== 0 || vy !== 0;

  // Normalize so diagonal movement isn't faster than straight movement.
  if (moving) {
    const length = Math.hypot(vx, vy);
    vx = (vx / length) * MOVE_SPEED;
    vy = (vy / length) * MOVE_SPEED;
  }

  // Pick a facing. We prefer left/right (side views read more clearly), then
  // up/down. If no key is held, keep the previous facing.
  let facing = prevFacing;
  if (input.left) facing = 'left';
  else if (input.right) facing = 'right';
  else if (input.up) facing = 'up';
  else if (input.down) facing = 'down';

  return { vx, vy, moving, facing };
}
