// Unit test for the zone/cover logic in src/systems/objectives.js — run:
//   node scripts/test-cover.mjs
// Proves pointInRect works, and that a `cover` dwell timer accrues ONLY while
// inside the zone, PAUSES (does not reset) when outside, and completes exactly
// at `seconds`. Uses Node's EventEmitter as the bus. Mirrors the other tests.
import { EventEmitter } from 'node:events';
import ObjectiveTracker, { pointInRect } from '../src/systems/objectives.js';

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

// --- pointInRect ----------------------------------------------------------
const rect = { x: 100, y: 100, w: 40, h: 30 };
assert(pointInRect(120, 115, rect), 'centre is inside');
assert(pointInRect(100, 100, rect), 'top-left corner is inside (inclusive)');
assert(pointInRect(140, 130, rect), 'bottom-right corner is inside (inclusive)');
assert(!pointInRect(99, 115, rect), 'just left of the rect is outside');
assert(!pointInRect(120, 131, rect), 'just below the rect is outside');

// --- cover dwell (accrue inside, pause outside, complete at seconds) -------
const bus = new EventEmitter();
let completedAll = false;
const tracker = new ObjectiveTracker(
  bus,
  [{ id: 'cover_lewis', type: 'cover', zone: 'z', seconds: 3, text: 'Cover the class' }],
  () => { completedAll = true; }
);
const cover = () => tracker.getObjectives().find((o) => o.id === 'cover_lewis');

// Drive a sequence of samples. Each entry: [inside?, deltaMs].
// Total INSIDE time must reach exactly 3000ms to complete; outside time is dead.
const inside = (v) => () => v;

// 1.0s inside -> progress 1s, not done.
tracker.tickZoneObjectives(1000, inside(true));
assert(cover().progress === 1 && !cover().done, `after 1s inside: expected 1s progress, got ${cover().progress}`);

// 1.5s OUTSIDE -> paused: progress unchanged, still not done.
tracker.tickZoneObjectives(1500, inside(false));
assert(cover().progress === 1 && !cover().done, 'outside time must NOT advance or reset the dwell');

// 1.0s more inside -> total 2s inside.
tracker.tickZoneObjectives(1000, inside(true));
assert(cover().progress === 2 && !cover().done, `after 2s inside: expected 2s, got ${cover().progress}`);

// Another 0.5s outside -> still paused at 2s.
tracker.tickZoneObjectives(500, inside(false));
assert(cover().progress === 2 && !cover().done, 'still paused at 2s after more outside time');

// Final 1.0s inside -> reaches 3s -> completes.
tracker.tickZoneObjectives(1000, inside(true));
assert(cover().progress === 3 && cover().done, 'reaching `seconds` inside completes the cover objective');
assert(completedAll, 'completing the only objective fires onComplete');

// After done, more inside time does nothing bad.
tracker.tickZoneObjectives(1000, inside(true));
assert(cover().progress === 3 && cover().done, 'stays complete, no overrun');

console.log('PASS');
