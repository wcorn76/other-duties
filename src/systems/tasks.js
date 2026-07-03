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
// Two shapes are supported:
//   - taskPool + pickCount  -> pick a random subset (First Period): objectives
//     are the picked tasks, and entities are trimmed to just what they `need`.
//   - a direct `objectives` array (no taskPool) -> use it as-is, and keep ALL
//     entities (used by Hall Duty, whose objective is fixed).
// Either way metadata (id/name/onComplete) and Hall-Duty fields (students,
// timeLimit, discretion) are carried through for the scene/UI.
export function buildPeriod(period) {
  let objectives;
  let entities;

  if (period.taskPool) {
    // Pick-N path (First Period).
    const count = period.pickCount ?? PICK_COUNT;
    const picked = pickTasks(period.taskPool, count);
    objectives = picked;

    // Keep only the entities the picked tasks need.
    const neededIds = new Set();
    for (const task of picked) {
      for (const id of task.needs ?? []) neededIds.add(id);
    }
    entities = (period.entities ?? []).filter((e) => neededIds.has(e.id));
  } else {
    // Direct-objectives path (Hall Duty): use them as given, keep all entities.
    objectives = period.objectives ?? [];
    entities = period.entities ?? [];
  }

  // The concrete period run.
  return {
    id: period.id,
    name: period.name,
    type: period.type,                  // e.g. 'boss' (Lunch Duty)
    spawn: period.spawn,
    objectives,
    entities,
    students: period.students ?? [],   // data-driven students (Stage 6)
    timeLimit: period.timeLimit,        // seconds; undefined = no countdown
    discretion: period.discretion === true, // gates the wrong-cite penalty
    meters: period.meters ?? null,      // Lunch Duty chaos meters (Stage 8)
    onFail: period.onFail,              // boss fail hook
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
