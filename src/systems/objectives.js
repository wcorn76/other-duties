// The generic objective/completion tracker — the CORE of "did the player do
// the thing?". It is deliberately content-agnostic: you hand it a list of
// objective specs (data) plus an event bus, and it flips each objective to
// "done" as matching gameplay events arrive. When ALL are done, it fires
// onComplete (and an 'objectives:allcomplete' event).
//
// Objective 'type' vocabulary: interact / deliver / talk / trash / find_use /
// cite / reach / cover / investigation, with `meter` still left as a SEAM below.
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
//   { id, type:'cite',     count:<n>, text }
//       count-based (Hall Duty); advances only on GUILTY cites, completes at N.
//   { id, type:'reach',    zone:<zoneId>, text }
//       completes the instant the player is inside the zone rect.
//   { id, type:'cover',    zone:<zoneId>, seconds:<n>, text }
//       reach-AND-DWELL: a timer accrues only while the player is inside the
//       zone; leaving PAUSES it (does not reset); completes at `seconds`.
//   { id, type:'investigation', incident:<incidentId>, text }
//       completes on an investigate:done event with correct:true for that case.
//
// The zone geometry check is a PURE, exported helper so it's Node-testable; the
// scene feeds the player position + zone rects into tickZoneObjectives().

// Default dwell for a `cover` task when its data omits `seconds`.
export const COVER_SECONDS = 30;

// Is point (px,py) inside rect { x, y, w, h }? (Pure — no Phaser.)
export function pointInRect(px, py, rect) {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

export default class ObjectiveTracker {
  constructor(bus, objectives, onComplete) {
    this.bus = bus;
    // Copy each spec and add a `done` flag we own. Cover tasks get a default
    // dwell if they didn't specify one.
    this.objectives = objectives.map((o) => ({
      ...o,
      done: false,
      seconds: o.type === 'cover' && o.seconds == null ? COVER_SECONDS : o.seconds,
    }));
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

    // cite:done { id, guilty } -> counts toward 'cite' objectives, but ONLY when
    // the cited student was guilty. Innocent (wrong) cites are ignored here.
    this.bus.on('cite:done', ({ guilty }) => {
      if (guilty === true) this.progressCite();
    });

    // investigate:done { incident, correct } -> completes an 'investigation'
    // objective for that incident, but only on a CORRECT accusation.
    this.bus.on('investigate:done', ({ incident, correct }) => {
      if (correct === true) {
        this.completeWhere((o) => o.type === 'investigation' && o.incident === incident);
      }
    });

    // NOTE: 'reach' and 'cover' are zone-based and driven by the scene each
    // frame via tickZoneObjectives() (they need the live player position), not
    // by a one-shot event. The only SEAM still open is:
    //   meter:  a metering system will call completeWhere(...) when a tracked
    //           value crosses the objective's threshold.
  }

  // Called every frame by the scene for zone-based objectives. `isInside(o)`
  // returns whether the player is currently inside objective `o`'s zone.
  //   'reach' completes the instant the player is inside.
  //   'cover' accrues a dwell timer ONLY while inside; leaving pauses (does not
  //           reset) it; it completes once elapsed reaches `seconds`.
  tickZoneObjectives(deltaMs, isInside) {
    let changed = false;
    for (const o of this.objectives) {
      if (o.done) continue;

      if (o.type === 'reach') {
        if (isInside(o)) {
          o.done = true;
          changed = true;
        }
        continue;
      }

      if (o.type === 'cover') {
        if (!isInside(o)) continue; // outside the room -> pause (keep progress)
        o.elapsedMs = (o.elapsedMs || 0) + deltaMs;
        const nowDone = o.elapsedMs >= o.seconds * 1000;
        const sec = Math.min(o.seconds, Math.floor(o.elapsedMs / 1000));
        if (nowDone) {
          o.done = true;
          o.progress = o.seconds;
          changed = true;
        } else if (sec !== (o.progress || 0)) {
          o.progress = sec; // whole-second tick for the HUD
          changed = true;
        }
      }
    }
    if (changed) {
      this.bus.emit('objective:updated', this.getObjectives());
      this.checkAllComplete();
    }
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

  // Count-based progress for 'cite' objectives (Hall Duty): each GUILTY cite
  // ticks every open cite objective up by one; it completes at its count.
  progressCite() {
    let changed = false;
    for (const o of this.objectives) {
      if (o.done || o.type !== 'cite') continue;
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
      type: o.type,
      text: o.text,
      done: o.done,
      count: o.count,
      seconds: o.seconds, // for 'cover' progress display (Ns / Ns)
      progress: o.progress || 0,
    }));
  }
}
