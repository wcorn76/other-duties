// The Lunch Duty meter system — the one genuinely new system this stage.
//
// Three "chaos" meters (Mischief / Trash / Bathroom) that RISE on their own over
// the 3-minute lunch period (faster as the clock runs down) and FALL when the
// player does the matching action. If any meter fills to its max, the lunch lady
// storms out and you fail. Survive to 0:00 with all meters below max and you win.
//
// The CORE here is Phaser-free (plain numbers + rules) so it runs under plain
// Node for the self-test — exactly like score.js / composure.js. The scene feeds
// it the frame delta and how much of the clock is gone; rendering lives in the HUD.

// --- Lunch Duty balance knobs (all placeholders — final tuning is a later pass) ---
export const METER_MAX             = 100;   // fail when a meter reaches this
export const TICK_SECONDS          = 1.0;   // how often the rise logic runs
export const BASE_RISE_PER_TICK    = 4;     // steady drift per meter per tick at 1x escalation (before baseEventRate)
export const EVENT_CHANCE_PER_TICK = 0.35;  // chance a discrete "event" bumps one random meter each tick
export const EVENT_BUMP            = 10;     // size of that discrete bump at 1x escalation
export const FALL_PER_ACTION       = 25;    // default drop when the player does the matching action
export const ESCALATION_MAX_MULT   = 2.5;   // rise/event rate multiplier at 0:00 (1.0 at start)
export const ESCALATION_CURVE      = 'linear'; // 'linear' | 'easeIn' — how the multiplier ramps
// Bathroom mechanic
export const BATHROOM_REQUEST_EVERY_MS = 6000; // roughly how often a new bathroom request appears
export const GRANT_RANGE_PX            = 20;    // how close you must be to grant with E
//   NOTE: the bathroom grant reuses the interaction system's proximity + E, so
//   in practice the reach is INTERACT_RANGE (22px). GRANT_RANGE_PX is kept here
//   as the documented intent if a dedicated grant range is ever wanted.

// The escalation multiplier for a given `timeFraction` (0 at lunch start, 1 at
// 0:00). Pure + tiny so it's easy to test. 1.0 at the start, ~ESCALATION_MAX_MULT
// at the end.
export function escalationMult(timeFraction, curve = ESCALATION_CURVE) {
  const f = Math.max(0, Math.min(1, timeFraction));
  const shaped = curve === 'easeIn' ? f * f : f; // easeIn ramps slower early
  return 1 + (ESCALATION_MAX_MULT - 1) * shaped;
}

export default class Meters {
  // opts = { meters:[{ id, label, max?, baseEventRate?, fallPerAction? }], onBreak?, rng? }
  constructor({ meters, onBreak, rng = Math.random } = {}) {
    this.list = meters.map((m) => ({
      id: m.id,
      label: m.label,
      current: 0,
      max: m.max ?? METER_MAX,
      baseEventRate: m.baseEventRate ?? 1, // per-meter drift multiplier
      fallPerAction: m.fallPerAction ?? FALL_PER_ACTION,
    }));
    this.byId = Object.fromEntries(this.list.map((m) => [m.id, m]));
    this.onBreak = onBreak || null;
    this.rng = rng;
    this.broken = false; // set once a meter maxes; stops all further rising
    this._accum = 0;     // leftover seconds between whole ticks
  }

  // Advance the meters. `dtSeconds` is the frame delta; `timeFraction` is how
  // much of the lunch clock is gone (0..1). Runs the rise logic in whole
  // TICK_SECONDS steps so it's framerate-independent.
  tick(dtSeconds, timeFraction) {
    if (this.broken) return;
    this._accum += dtSeconds;
    const mult = escalationMult(timeFraction);
    while (this._accum >= TICK_SECONDS) {
      this._accum -= TICK_SECONDS;
      this.step(mult);
      if (this.broken) return;
    }
  }

  // One tick of rise: a steady drift on every meter (scaled by its baseEventRate
  // and the escalation multiplier), plus a chance of a discrete random "event"
  // that bumps one random meter harder.
  step(mult) {
    for (const m of this.list) {
      this.raise(m, BASE_RISE_PER_TICK * m.baseEventRate * mult);
      if (this.broken) return;
    }
    if (this.rng() < EVENT_CHANCE_PER_TICK * mult) {
      const m = this.list[Math.floor(this.rng() * this.list.length)];
      this.raise(m, EVENT_BUMP * mult);
    }
  }

  raise(m, amount) {
    if (this.broken) return;
    m.current = Math.min(m.max, m.current + amount);
    if (m.current >= m.max) {
      this.broken = true;
      if (this.onBreak) this.onBreak(m.id); // fired exactly once (broken guard)
    }
  }

  // Player action: push a meter back down (clamped at 0). Defaults to the
  // meter's own fallPerAction.
  lower(id, amount) {
    const m = this.byId[id];
    if (!m) return;
    const drop = amount != null ? amount : m.fallPerAction;
    m.current = Math.max(0, m.current - drop);
  }

  // Read-only snapshot for the HUD.
  getMeters() {
    return this.list.map((m) => ({ id: m.id, label: m.label, current: m.current, max: m.max }));
  }

  isBroken() {
    return this.broken;
  }
}
