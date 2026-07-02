// The CONTENT layer: the bridge between a period's raw data and the generic
// ObjectiveTracker. A "period" ships a *pool* of possible tasks; this file
// decides which ones actually run this playthrough (pick 3 of 5 by default),
// trims the world down to only the entities those tasks need, and owns the
// small "giver hands you an item" wiring for find_use tasks.
//
// Deliberately PHASER-FREE (no Phaser import) so it can be unit-tested with
// plain node, exactly like objectives.js. It only deals in plain data + a
// couple of injected collaborators (the event bus + the interaction system).
//
// TWEAK THE PICK COUNT HERE:  PICK_COUNT below is the default number of tasks
// drawn from a period's pool. A period can override it with `pickCount`.

// Default number of tasks drawn from a period's pool.
export const PICK_COUNT = 3;

// Return `count` DISTINCT tasks chosen at random from `pool`.
// Uses a Fisher-Yates shuffle of a COPY (never mutates the caller's array),
// then takes the first `count`. If count >= pool.length, returns all of them.
export function pickTasks(pool, count = PICK_COUNT) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (count >= shuffled.length) return shuffled;
  return shuffled.slice(0, count);
}

// Turn a period's data into the concrete run for this playthrough.
// period = { id?, name?, spawn:{x,y}, taskPool:[...taskDefs], pickCount?, entities:[...], onComplete }
// Returns { id, name, spawn, objectives, entities, onComplete } ready for the
// scene — metadata (id/name) is carried through so the UI reads it from the
// built object instead of the raw JSON.
export function buildPeriod(period) {
  // a) how many tasks to draw
  const count = period.pickCount ?? PICK_COUNT;

  // b) draw the tasks
  const picked = pickTasks(period.taskPool, count);

  // c) the picked task defs already match the Stage 3 objective shapes the
  //    tracker understands. A task def may also carry a planning-only "needs"
  //    array of entity ids it uses; harmless to leave on the objective.
  const objectives = picked;

  // d) gather the union of entity ids the picked tasks need, then keep only
  //    those entities from the period's full entity list.
  const neededIds = new Set();
  for (const task of picked) {
    for (const id of task.needs ?? []) neededIds.add(id);
  }
  const entities = period.entities.filter((e) => neededIds.has(e.id));

  // e) the concrete period run (metadata carried through for the UI)
  return {
    id: period.id,
    name: period.name,
    spawn: period.spawn,
    objectives,
    entities,
    onComplete: period.onComplete,
  };
}

// Owns the find_use "giver grants item" wiring (previously inlined in the
// scene). Talking to a picked find_use task's giver hands over its item by
// filling the interaction carry slot. Call this once after building a period.
export function installTaskWiring(objectives, bus, interaction) {
  bus.on('talk:done', ({ id }) => {
    const giverTask = objectives.find(
      (o) => o.type === 'find_use' && o.giver === id
    );
    if (giverTask) interaction.giveItem(giverTask.item);
  });
}
