// The generic objective/completion tracker — the CORE of "did the player do
// the thing?". It is deliberately content-agnostic: you hand it a list of
// objective specs (data) plus an event bus, and it flips each objective to
// "done" as matching gameplay events arrive. When ALL are done, it fires
// onComplete (and an 'objectives:allcomplete' event).
//
// Objective 'type' vocabulary: interact / deliver / talk / trash / find_use,
// with `reach` and `meter` still left as clearly-marked SEAMS below.
// IMPORTANT: do NOT hardcode any specific objective here. This file only knows
// the generic shapes; the actual objectives come in as data.
//
// Objective spec shapes it understands:
//   { id, type:'interact', target:<propId>, text }
//   { id, type:'deliver',  item:<itemId>, target:<propId>, text }
//   { id, type:'talk',     target:<npcId>, text }
//   { id, type:'trash',    count:<n>, text, item?:<litterType> }
//       count-based; the optional `item` filters which collect:done events
//       count toward it (omit `item` to count ANY litter).
//   { id, type:'find_use', item:<itemId>, useTarget:<propId>, giver?, text }
//       completed by the same deliver:done event as `deliver`.

export default class ObjectiveTracker {
  constructor(bus, objectives, onComplete) {
    this.bus = bus;
    // Copy each spec and add a `done` flag we own.
    this.objectives = objectives.map((o) => ({ ...o, done: false }));
    this.onComplete = onComplete;
    this.allComplete = false;

    this.wire();
  }

  // Subscribe to the gameplay events that can complete objectives.
  wire() {
    // interact:done { id }  -> completes an 'interact' objective for that target.
    this.bus.on('interact:done', ({ id }) => {
      this.completeWhere((o) => o.type === 'interact' && o.target === id);
    });

    // deliver:done { item, target } -> completes a matching 'deliver' objective
    // AND a matching 'find_use' objective (both verbs finish by delivering an
    // item to a target; find_use just names its target `useTarget`).
    this.bus.on('deliver:done', ({ item, target }) => {
      this.completeWhere(
        (o) =>
          (o.type === 'deliver' && o.item === item && o.target === target) ||
          (o.type === 'find_use' && o.item === item && o.useTarget === target)
      );
    });

    // talk:done { id } -> completes a 'talk' objective for that NPC.
    this.bus.on('talk:done', ({ id }) => {
      this.completeWhere((o) => o.type === 'talk' && o.target === id);
    });

    // collect:done { item } -> counts toward 'trash' objectives (collect N).
    // These are count-based rather than one-shot, so they get their own path.
    this.bus.on('collect:done', ({ item }) => {
      this.progressTrash(item);
    });

    // ----------------------------------------------------------------------
    // SEAMS still open for later stages (intentionally NOT implemented):
    //   reach:  this.bus.on('reach:done', ({ zone }) =>
    //             this.completeWhere(o => o.type === 'reach' && o.target === zone));
    //   meter:  a metering system will call completeWhere(...) when a tracked
    //           value crosses the objective's threshold.
    // (A generic 'collect item X' verb can reuse completeWhere like talk/deliver;
    //  'trash' above is the count-based variant used this stage.)
    // ----------------------------------------------------------------------
  }

  // Count-based progress for 'trash' objectives: each collect:done ticks every
  // open trash objective up by one; it completes when it reaches its count.
  // If an objective has an `item` (litter type), only matching collect:done
  // events count toward it; objectives without `item` count any litter.
  progressTrash(item) {
    let changed = false;
    for (const o of this.objectives) {
      if (o.done || o.type !== 'trash') continue;
      if (o.item != null && o.item !== item) continue; // litter-type filter
      o.progress = (o.progress || 0) + 1;
      if (o.progress >= o.count) o.done = true;
      changed = true;
    }
    if (changed) {
      this.bus.emit('objective:updated', this.getObjectives());
      this.checkAllComplete();
    }
  }

  // Mark every not-yet-done objective matching `pred` as complete.
  completeWhere(pred) {
    let changed = false;
    for (const o of this.objectives) {
      if (!o.done && pred(o)) {
        o.done = true;
        changed = true;
      }
    }
    if (changed) {
      this.bus.emit('objective:updated', this.getObjectives());
      this.checkAllComplete();
    }
  }

  checkAllComplete() {
    if (this.allComplete) return;
    if (this.objectives.every((o) => o.done)) {
      this.allComplete = true;
      this.bus.emit('objectives:allcomplete');
      if (this.onComplete) this.onComplete();
    }
  }

  // A read-only snapshot for the HUD (so it can't mutate our state).
  // `count`/`progress` are included for count-based objectives (e.g. trash)
  // so the HUD can show "(1/3)"; they are undefined for one-shot objectives.
  getObjectives() {
    return this.objectives.map((o) => ({
      id: o.id,
      text: o.text,
      done: o.done,
      count: o.count,
      progress: o.progress || 0,
    }));
  }
}
