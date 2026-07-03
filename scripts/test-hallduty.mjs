// Unit test for src/systems/hallDuty.js — run: node scripts/test-hallduty.mjs
// Covers the pure Hall Duty rules (no Phaser): the runner speed curve, the
// cite-outcome routing decision, and the tardy tally. Mirrors the other tests.
import {
  runnerSpeed,
  citeOutcome,
  countUncitedGuilty,
  RUNNER_START_SPEED,
  RUNNER_MIN_SPEED,
} from '../src/systems/hallDuty.js';

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

// --- runner speed curve ---------------------------------------------------
// Starts fast, decays, and never drops below the floor.
assert(runnerSpeed(0) === RUNNER_START_SPEED, `runnerSpeed(0) should be ${RUNNER_START_SPEED}, got ${runnerSpeed(0)}`);
assert(runnerSpeed(-500) === RUNNER_START_SPEED, 'negative elapsed clamps to start speed');

let prev = Infinity;
for (let ms = 0; ms <= 6000; ms += 500) {
  const s = runnerSpeed(ms);
  assert(s <= prev, `speed should be non-increasing (at ${ms}ms: ${s} > ${prev})`);
  assert(s >= RUNNER_MIN_SPEED, `speed never below floor (at ${ms}ms: ${s})`);
  prev = s;
}
// After a long time it has bottomed out at the floor.
assert(runnerSpeed(999999) === RUNNER_MIN_SPEED, 'far future speed is the floor');
// It actually slowed meaningfully partway through.
assert(runnerSpeed(1000) < RUNNER_START_SPEED, 'runner has slowed after 1s');
console.log(`runner curve: 0ms=${runnerSpeed(0)}  1000ms=${runnerSpeed(1000)}  3000ms=${runnerSpeed(3000)}  floor=${RUNNER_MIN_SPEED}`);

// --- cite outcome routing -------------------------------------------------
// Non-discretion period: every cite just scores.
assert(citeOutcome(false, false) === 'points', 'non-discretion innocent -> points');
assert(citeOutcome(true, false) === 'points', 'non-discretion guilty -> points');
// Discretion period: guilt matters.
assert(citeOutcome(true, true) === 'guilty', 'discretion guilty -> guilty');
assert(citeOutcome(false, true) === 'innocent', 'discretion innocent -> innocent');

// --- tardy tally ----------------------------------------------------------
// Given a roster, tardies = guilty students who were never cited.
const roster = [
  { id: 'g1', upToNoGood: true, cited: false },  // tardy
  { id: 'g2', upToNoGood: true, cited: true },   // caught, not tardy
  { id: 'g3', upToNoGood: true, cited: false },  // tardy
  { id: 'i1', upToNoGood: false, cited: false }, // innocent, never a tardy
  { id: 'i2', upToNoGood: false, cited: true },  // innocent, irrelevant
];
assert(countUncitedGuilty(roster) === 2, `expected 2 tardies, got ${countUncitedGuilty(roster)}`);
assert(countUncitedGuilty([]) === 0, 'empty roster -> 0 tardies');
// If every guilty kid was cited, zero tardies.
assert(countUncitedGuilty(roster.map((s) => ({ ...s, cited: true }))) === 0, 'all cited -> 0 tardies');

console.log('PASS');
