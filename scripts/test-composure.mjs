// Unit test for src/systems/composure.js — run: node scripts/test-composure.mjs
// Exercises the pure composure logic in Node (no Phaser). Mirrors test-tasks.mjs.
// i-frame timing is driven by an explicit `now` argument so it's deterministic.
import Composure, {
  STARTING_HEARTS,
  IFRAME_MS,
  DAMAGE_PER_HIT,
} from '../src/systems/composure.js';

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

console.log(`STARTING_HEARTS = ${STARTING_HEARTS}, IFRAME_MS = ${IFRAME_MS}, DAMAGE_PER_HIT = ${DAMAGE_PER_HIT}`);

// Starts full.
let changes = [];
let fails = 0;
const c = new Composure({
  onChange: (cur, max) => changes.push([cur, max]),
  onFail: () => { fails += 1; },
});
assert(c.getHearts() === STARTING_HEARTS, 'should start at STARTING_HEARTS');

// First hit at t=0 reduces by DAMAGE_PER_HIT and opens the i-frame window.
let r = c.damage(DAMAGE_PER_HIT, 0);
assert(!r.blocked && c.getHearts() === STARTING_HEARTS - DAMAGE_PER_HIT, 'first hit reduces');

// A hit DURING i-frames (t within IFRAME_MS) is blocked — no further loss.
r = c.damage(DAMAGE_PER_HIT, IFRAME_MS - 1);
assert(r.blocked && c.getHearts() === STARTING_HEARTS - DAMAGE_PER_HIT, 'i-frames block repeat damage');

// After i-frames expire, damage lands again.
r = c.damage(DAMAGE_PER_HIT, IFRAME_MS);
assert(!r.blocked && c.getHearts() === STARTING_HEARTS - 2 * DAMAGE_PER_HIT, 'damage lands after i-frames');

// Drain to zero: keep hitting past the i-frame window each time.
let t = 2 * IFRAME_MS;
while (c.getHearts() > 0) {
  c.damage(DAMAGE_PER_HIT, t);
  t += IFRAME_MS;
}
assert(c.getHearts() === 0, 'clamps at 0');
assert(fails === 1, `onFail should fire exactly once (fired ${fails})`);

// Once failed, further damage is blocked and stays at 0 (no double-fail).
r = c.damage(DAMAGE_PER_HIT, t + IFRAME_MS);
assert(r.blocked && c.getHearts() === 0 && fails === 1, 'no damage or extra fail after death');

// Never goes negative even with a big hit from full.
const c2 = new Composure();
c2.damage(999, 0);
assert(c2.getHearts() === 0, 'big hit clamps at 0, not negative');

console.log('changes observed:', JSON.stringify(changes));
console.log('PASS');
