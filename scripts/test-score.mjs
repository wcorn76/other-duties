// Unit test for src/systems/score.js — run with: node scripts/test-score.mjs
// Exercises the pure scoring logic in Node (no Phaser). Mirrors test-tasks.mjs.
import Score, { POINTS_PER_CITE, POINTS_PER_TASK } from '../src/systems/score.js';

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

console.log(`POINTS_PER_CITE = ${POINTS_PER_CITE}, POINTS_PER_TASK = ${POINTS_PER_TASK}`);

// Starts at zero.
let s = new Score();
assert(s.getValue() === 0, 'score should start at 0');

// Citing awards POINTS_PER_CITE each.
s.addCite();
assert(s.getValue() === POINTS_PER_CITE, `after one cite expected ${POINTS_PER_CITE}, got ${s.getValue()}`);
s.addCite();
assert(s.getValue() === POINTS_PER_CITE * 2, 'two cites should stack');

// Completing tasks awards POINTS_PER_TASK each; addTaskComplete(n) scales.
s.addTaskComplete();
assert(s.getValue() === POINTS_PER_CITE * 2 + POINTS_PER_TASK, 'one task bonus');
s.addTaskComplete(3);
assert(s.getValue() === POINTS_PER_CITE * 2 + POINTS_PER_TASK * 4, 'three-task batch bonus');

// Arbitrary add works.
const before = s.getValue();
s.add(7, 'bonus');
assert(s.getValue() === before + 7, 'arbitrary add');

// onChange fires with the new value + reason.
let lastValue = null;
let lastReason = null;
const s2 = new Score({ onChange: (v, reason) => { lastValue = v; lastReason = reason; } });
s2.addCite();
assert(lastValue === POINTS_PER_CITE, 'onChange should report the new value');
assert(lastReason === 'cite', 'onChange should report the reason');
s2.addTaskComplete();
assert(lastValue === POINTS_PER_CITE + POINTS_PER_TASK && lastReason === 'task', 'onChange after task');

console.log('final sample score:', s.getValue());
console.log('PASS');
