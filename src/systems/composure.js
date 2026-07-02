// Composure — the player's "health", shown as hearts in the HUD. The CORE is
// Phaser-free (numbers + rules) so it can be unit-tested in Node like score.js.
//
// Taking a hit reduces composure by DAMAGE_PER_HIT and starts a window of
// invincibility (i-frames): further hits during that window are IGNORED, so one
// bump can't drain you instantly. At ZERO composure it FAILS once (calls onFail
// — the scene uses that to show "Composure lost" and return to Title).
//
// i-frame timing is handled here with an explicit `now` timestamp passed in by
// the caller (scene.time.now in game, plain numbers in tests) — that keeps the
// whole thing pure and testable. The visual flash / knockback that go WITH a hit
// live in the scene, since those are Phaser rendering/physics concerns.

// --- Tunables (named constants near the top) ------------------------------
export const STARTING_HEARTS = 3; // starting (and max) composure
export const IFRAME_MS = 1000;    // invincibility window after taking a hit
export const DAMAGE_PER_HIT = 1;  // composure lost per hit

export default class Composure {
  // opts: { max, iframeMs, onChange(current,max), onFail() }
  constructor({ max = STARTING_HEARTS, iframeMs = IFRAME_MS, onChange, onFail } = {}) {
    this.max = max;
    this.current = max;
    this.iframeMs = iframeMs;
    this.onChange = onChange || null;
    this.onFail = onFail || null;
    this.invincibleUntil = 0;
    this.failed = false;
  }

  isInvincible(now) {
    return now < this.invincibleUntil;
  }

  // Take a hit. Returns { blocked, hp, dead }.
  //   blocked: true if ignored (i-frames or already failed) — no knockback/flash.
  //   dead:    true once composure has hit zero.
  damage(amount = DAMAGE_PER_HIT, now = 0) {
    if (this.failed) return { blocked: true, hp: this.current, dead: true };
    if (this.isInvincible(now)) return { blocked: true, hp: this.current, dead: false };

    this.current = Math.max(0, this.current - amount); // clamp at 0
    this.invincibleUntil = now + this.iframeMs;
    if (this.onChange) this.onChange(this.current, this.max);

    if (this.current <= 0) {
      this.failed = true;
      if (this.onFail) this.onFail();
      return { blocked: false, hp: 0, dead: true };
    }
    return { blocked: false, hp: this.current, dead: false };
  }

  getHearts() {
    return this.current;
  }
}
