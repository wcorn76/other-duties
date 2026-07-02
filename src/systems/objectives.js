// The generic objective/completion tracker — the CORE of "did the player do
// the thing?". It is deliberately content-agnostic: you hand it a list of
// objective specs (data) plus an event bus, and it flips each objective to
// "done" as matching gameplay events arrive. When ALL are done, it fires
// onComplete (and an 'objectives:allcomplete' event).
//
// Objective 'type' vocabulary: interact / talk / collect / reach / deliver / meter.
//   Implemented this stage: `interact` and `deliver`.
//   The rest are left as clearly-marked SEAMS below — later stages fill them in.
// IMPORTANT: do NOT hardcode any specific objective here. This file only knows
// the generic shapes; the actual objectives come in as data.
//
// Objective spec shapes it understands:
//   { id, type:'interact', target:<propId>, text }
//   { id, type:'deliver',  item:<itemId>, target:<propId>, text }

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

    // deliver:done { item, target } -> completes a matching 'deliver' objective.
    this.bus.on('deliver:done', ({ item, target }) => {
      this.completeWhere(
        (o) => o.type === 'deliver' && o.item === item && o.target === target
      );
    });

    // ----------------------------------------------------------------------
    // SEAMS for later stages (intentionally NOT implemented this stage).
    // Uncomment + wire the matching systems when those verbs exist:
    //
    //   talk:    this.bus.on('talk:done', ({ id }) =>
    //              this.completeWhere(o => o.type === 'talk' && o.target === id));
    //   collect: this.bus.on('collect:done', ({ item }) =>
    //              this.completeWhere(o => o.type === 'collect' && o.item === item));
    //   reach:   this.bus.on('reach:done', ({ zone }) =>
    //              this.completeWhere(o => o.type === 'reach' && o.target === zone));
    //   meter:   a metering system will call completeWhere(...) when a tracked
    //            value crosses the objective's threshold.
    // ----------------------------------------------------------------------
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
  getObjectives() {
    return this.objectives.map((o) => ({ id: o.id, text: o.text, done: o.done }));
  }
}
