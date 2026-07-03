// Unit test for src/systems/meters.js — run: node scripts/test-meters.mjs
// Proves the pure Lunch Duty meter logic (no Phaser): rising increases a meter,
// the escalation multiplier is 1.0 at the start and ~ESCALATION_MAX_MULT at the
// end, lower() clamps at 0, and a meter reaching max fires onBreak exactly once.
import Meters, {
  escalationMult,
  ESCALATION_MAX_MULT,
  METER_MAX,
  FALL_PER_ACTION,
} from '../src/systems/meters.js';

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

const makeMeters = (opts = {}) =>
  new Meters({
    meters: [
      { id: 'mischief', label: 'Mischief', max: METER_MAX, baseEventRate: 1 },
      { id: 'trash', label: 'Trash', max: METER_MAX, baseEventRate: 1 },
      { id: 'bathroom', label: 'Bathroom', max: METER_MAX, baseEventRate: 1 },
    ],
    ...opts,
  });

// --- escalation curve -----------------------------------------------------
assert(escalationMult(0) === 1, `escalationMult(0) should be 1, got ${escalationMult(0)}`);
assert(escalationMult(1) === ESCALATION_MAX_MULT, `escalationMult(1) should be ${ESCALATION_MAX_MULT}, got ${escalationMult(1)}`);
assert(escalationMult(-5) === 1 && escalationMult(9) === ESCALATION_MAX_MULT, 'escalation clamps out-of-range input');
assert(escalationMult(0.5) > 1 && escalationMult(0.5) < ESCALATION_MAX_MULT, 'midpoint is between 1 and max');
// easeIn ramps slower than linear early on.
assert(escalationMult(0.5, 'easeIn') < escalationMult(0.5, 'linear'), 'easeIn is gentler at the midpoint');

// --- rising increases current --------------------------------------------
{
  const m = makeMeters({ rng: () => 0.99 }); // suppress discrete events (0.99 > chance)
  m.tick(1, 0); // one tick at 1x escalation
  const trash = m.getMeters().find((x) => x.id === 'trash');
  assert(trash.current > 0, 'a tick should raise the meters');
}

// --- lower clamps at 0 ----------------------------------------------------
{
  const m = makeMeters({ rng: () => 0.99 });
  m.tick(3, 0); // accrue some
  m.lower('trash', 999); // over-lower
  assert(m.getMeters().find((x) => x.id === 'trash').current === 0, 'lower() clamps at 0');
  // default fall amount works too
  m.lower('trash'); // already 0 -> stays 0
  assert(m.getMeters().find((x) => x.id === 'trash').current === 0, 'lowering an empty meter stays at 0');
}

// --- onBreak fires exactly once, then rising stops ------------------------
{
  let breaks = [];
  const m = makeMeters({ rng: () => 0.99, onBreak: (id) => breaks.push(id) });
  // Drive many ticks at full escalation until something maxes and beyond.
  for (let i = 0; i < 100; i++) m.tick(1, 1);
  assert(breaks.length === 1, `onBreak should fire exactly once (fired ${breaks.length}: ${breaks})`);
  assert(m.isBroken(), 'meters report broken after a max');
  // Every further tick is a no-op.
  const before = JSON.stringify(m.getMeters());
  m.tick(10, 1);
  assert(JSON.stringify(m.getMeters()) === before, 'no rising after a break');
}

// --- getMeters shape ------------------------------------------------------
{
  const snap = makeMeters().getMeters();
  assert(snap.length === 3 && snap.every((x) => x.id && x.label && x.max), 'getMeters returns id/label/current/max');
  assert(snap.every((x) => x.current === 0), 'meters start at 0');
}

console.log('FALL_PER_ACTION default =', FALL_PER_ACTION);
console.log('PASS');
