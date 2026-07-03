// Unit test for src/systems/objectives.js — run: node scripts/test-objectives.mjs
// Focuses on the Stage 6 `cite` objective (Phaser-free): it advances only on
// GUILTY cites, ignores innocent ones, and completes at its count. Mirrors the
// other test-*.mjs scripts. Uses Node's EventEmitter as the bus.
import { EventEmitter } from 'node:events';
import ObjectiveTracker from '../src/systems/objectives.js';

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

// A cite objective needing 3 guilty cites, plus a talk objective for a sanity
// check that unrelated events don't disturb the cite counter.
const bus = new EventEmitter();
let allComplete = false;
const tracker = new ObjectiveTracker(
  bus,
  [
    { id: 'clear_hall', type: 'cite', count: 3, text: 'Cite the guilty' },
    { id: 'say_hi', type: 'talk', target: 'lewis', text: 'Say hi' },
  ],
  () => { allComplete = true; }
);

const citeProgress = () => tracker.getObjectives().find((o) => o.id === 'clear_hall').progress;
const citeDone = () => tracker.getObjectives().find((o) => o.id === 'clear_hall').done;

// Innocent cites must NOT advance the counter.
bus.emit('cite:done', { id: 'a', guilty: false });
bus.emit('cite:done', { id: 'b', guilty: false });
assert(citeProgress() === 0, `innocent cites should not advance (got ${citeProgress()})`);

// Guilty cites advance one at a time.
bus.emit('cite:done', { id: 'c', guilty: true });
assert(citeProgress() === 1, 'first guilty cite advances to 1');
bus.emit('cite:done', { id: 'd', guilty: true });
assert(citeProgress() === 2 && !citeDone(), 'two guilty cites, not done yet');

// An innocent cite mixed in still does nothing.
bus.emit('cite:done', { id: 'e', guilty: false });
assert(citeProgress() === 2, 'innocent cite between guilty ones is ignored');

// The 3rd guilty cite completes it — but the whole period isn't done until the
// talk objective is also satisfied.
bus.emit('cite:done', { id: 'f', guilty: true });
assert(citeProgress() === 3 && citeDone(), 'third guilty cite completes the cite objective');
assert(!allComplete, 'period not complete while the talk objective is open');

// Further guilty cites do not overshoot the count.
bus.emit('cite:done', { id: 'g', guilty: true });
assert(citeProgress() === 3, 'progress does not exceed count');

// Finish the other objective -> whole period completes.
bus.emit('talk:done', { id: 'lewis' });
assert(allComplete, 'completing all objectives fires onComplete');

console.log('cite progress path:', tracker.getObjectives().map((o) => `${o.id}:${o.done ? 'x' : (o.count ? o.progress + '/' + o.count : '.')}`).join(' '));
console.log('PASS');
