// Pure Hall Duty rules — no Phaser here, so it can be unit-tested in Node like
// score.js / composure.js. It answers three small questions the scene/entities
// ask, keeping the tricky logic testable and the rendering elsewhere:
//   - citeOutcome(): when you cite a student, what should happen?
//   - runnerSpeed(): how fast is a bolting runner right now (fast, then slows)?
//   - countUncitedGuilty(): at the bell, how many tardies?

// --- Tunables (named constants near the top) ------------------------------

// Points knocked off the score for each guilty kid still loose at the bell.
export const TARDY_PENALTY = 40;

// The runner: bolts fast, then tires. Speed decays linearly from START to MIN.
export const RUNNER_START_SPEED = 135;   // px/sec the instant it bolts
export const RUNNER_MIN_SPEED = 24;      // px/sec floor once it's winded
export const RUNNER_DECEL = 60;          // px/sec lost per second of running
export const RUNNER_TRIGGER_RADIUS = 72; // how close the player gets before it bolts

// --- Rules ----------------------------------------------------------------

// Decide what a cite does. Only in "discretion" periods does guilt matter:
//   'points'   -> non-discretion period: any cite just scores (Stage 5 feel).
//   'guilty'   -> discretion period, student was up to no good: valid cite.
//   'innocent' -> discretion period, student was innocent: wrong cite (penalty).
export function citeOutcome(upToNoGood, discretion) {
  if (!discretion) return 'points';
  return upToNoGood ? 'guilty' : 'innocent';
}

// A bolting runner's current speed, given how long (ms) it's been running.
// Starts at RUNNER_START_SPEED and decays to RUNNER_MIN_SPEED — so you get a
// shrinking window to catch it.
export function runnerSpeed(elapsedMs) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return Math.max(RUNNER_MIN_SPEED, RUNNER_START_SPEED - RUNNER_DECEL * seconds);
}

// At the bell, tally tardies = guilty students who were never cited. Works on
// real Student instances or plain test objects ({ upToNoGood, cited }).
export function countUncitedGuilty(students) {
  return students.filter((s) => s.upToNoGood && !s.cited).length;
}
