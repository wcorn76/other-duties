// Throwaway unit test for src/systems/tasks.js — run with: node scripts/test-tasks.mjs
// Verifies pickTasks/buildPeriod pick 3 distinct tasks and return exactly the
// entities those tasks need. Not shipped; safe to delete.
import { PICK_COUNT, pickTasks, buildPeriod } from '../src/systems/tasks.js';
import period1 from '../data/periods/period_1.json' with { type: 'json' };

// A TEMPORARY fake period: 5 distinct task defs, each needing a couple of
// made-up entity ids, plus an entities list covering all of them.
const period = {
  spawn: { x: 10, y: 20 },
  pickCount: 3,
  taskPool: [
    { id: 't1', type: 'talk', target: 'a', needs: ['a'] },
    { id: 't2', type: 'trash', count: 3, needs: ['b1', 'b2', 'b3'] },
    { id: 't3', type: 'find_use', giver: 'c', item: 'x', useTarget: 'd', needs: ['c', 'd'] },
    { id: 't4', type: 'interact', target: 'e', needs: ['e'] },
    { id: 't5', type: 'deliver', item: 'y', target: 'f', needs: ['g', 'f'] },
  ],
  entities: [
    { id: 'a' }, { id: 'b1' }, { id: 'b2' }, { id: 'b3' },
    { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' },
    { id: 'unused1' }, { id: 'unused2' }, // never needed by any task
  ],
  onComplete: { type: 'message', text: 'done' },
};

// Map task id -> the set of entity ids it needs, for checking.
const needsById = new Map(period.taskPool.map((t) => [t.id, new Set(t.needs)]));

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

console.log(`PICK_COUNT = ${PICK_COUNT}`);
for (let run = 1; run <= 5; run++) {
  const built = buildPeriod(period);
  const ids = built.objectives.map((o) => o.id);
  const entityIds = built.entities.map((e) => e.id);
  console.log(`run ${run}: tasks [${ids.join(', ')}]  entities [${entityIds.join(', ')}]`);

  // exactly 3 objectives
  assert(built.objectives.length === 3, `run ${run}: expected 3 objectives, got ${built.objectives.length}`);
  // all ids distinct
  assert(new Set(ids).size === ids.length, `run ${run}: picked ids not distinct: ${ids}`);

  // entities returned are EXACTLY the union of the picked tasks' needs
  const expected = new Set();
  for (const id of ids) for (const n of needsById.get(id)) expected.add(n);
  assert(entityIds.length === expected.size, `run ${run}: entity count ${entityIds.length} != expected ${expected.size}`);
  for (const e of entityIds) assert(expected.has(e), `run ${run}: unexpected entity ${e}`);
  for (const e of expected) assert(entityIds.includes(e), `run ${run}: missing needed entity ${e}`);

  // spawn + onComplete passed through untouched
  assert(built.spawn === period.spawn, `run ${run}: spawn not passed through`);
  assert(built.onComplete === period.onComplete, `run ${run}: onComplete not passed through`);
}

// Extra: count >= pool length returns all of them.
const all = pickTasks(period.taskPool, 99);
assert(all.length === period.taskPool.length, 'count>=len should return whole pool');

// ---- Same checks against the REAL period file (data/periods/period_1.json) ----
console.log(`\nreal period: ${period1.id} (pickCount ${period1.pickCount})`);
const realNeedsById = new Map(period1.taskPool.map((t) => [t.id, new Set(t.needs)]));
for (let run = 1; run <= 6; run++) {
  const built = buildPeriod(period1);
  const ids = built.objectives.map((o) => o.id);
  const entityIds = built.entities.map((e) => e.id);
  console.log(`run ${run}: tasks [${ids.join(', ')}]  entities [${entityIds.join(', ')}]`);

  assert(built.objectives.length === 3, `real run ${run}: expected 3 objectives, got ${built.objectives.length}`);
  assert(new Set(ids).size === ids.length, `real run ${run}: picked ids not distinct: ${ids}`);

  const expected = new Set();
  for (const id of ids) for (const n of realNeedsById.get(id)) expected.add(n);
  assert(entityIds.length === expected.size, `real run ${run}: entity count ${entityIds.length} != expected ${expected.size}`);
  for (const e of entityIds) assert(expected.has(e), `real run ${run}: unexpected entity ${e}`);
  for (const e of expected) assert(entityIds.includes(e), `real run ${run}: missing needed entity ${e}`);

  assert(built.spawn === period1.spawn, `real run ${run}: spawn not passed through`);
  assert(built.onComplete === period1.onComplete, `real run ${run}: onComplete not passed through`);
}

console.log('PASS');
