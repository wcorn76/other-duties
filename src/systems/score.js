// Score — the running points total. The CORE is deliberately Phaser-free (plain
// numbers + rules) so it can be unit-tested in Node, exactly like tasks.js /
// objectives.js. Rendering lives in the HUD: pass an `onChange` callback and the
// scene hands the new value to hud.setScore().
//
// Rules this stage: citing a student awards points; completing a task awards a
// (smaller) bonus. Add more scoring rules by adding methods here — the HUD just
// shows whatever getValue() returns.

// --- Tunables (named constants near the top) ------------------------------
export const POINTS_PER_CITE = 100; // caught a student with the detention slip
export const POINTS_PER_TASK = 50;  // completed one of the period's tasks

export default class Score {
  // opts.onChange(value, reason) is called after every change (optional).
  constructor({ onChange } = {}) {
    this.value = 0;
    this.onChange = onChange || null;
  }

  // Add an arbitrary number of points, tagged with a reason (for feedback/logs).
  add(points, reason = '') {
    this.value += points;
    if (this.onChange) this.onChange(this.value, reason);
    return this.value;
  }

  addCite() {
    return this.add(POINTS_PER_CITE, 'cite');
  }

  // n = how many tasks completed at once (usually 1).
  addTaskComplete(n = 1) {
    return this.add(POINTS_PER_TASK * n, 'task');
  }

  getValue() {
    return this.value;
  }
}
