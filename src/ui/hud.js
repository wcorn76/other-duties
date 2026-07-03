// The game's HUD. It owns the reserved top strip of the screen (per TECH_SPEC
// §2) and, just beneath it, the live objectives checklist.
//
// LIVE now:
//   - OBJECTIVES: seeded from the tracker and updated on the 'objective:updated'
//     event; ticks [ ] -> [x] (green) and shows (progress/count) for trash.
//   - HEARTS (composure): setHearts(current, max) fills/empties them (Stage 5).
//   - SCORE: setScore(n) updates the number live (Stage 5).
//   - ACTIVE GEAR (centre): setActiveGear(label) shows the current primary gear
//     (the detention slip); pulseGear() flashes it when used (Stage 5).
//
// Everything here is camera-pinned (setScrollFactor(0)) at a high depth so it
// stays fixed on screen and draws above the play field. Internal res is 384x216.

// --- layout / style (internal 384x216 pixels) ---------------------------
const STRIP = { x: 0, y: 0, w: 384, h: 14 };
const DEPTH = 1000;

const HEARTS = { x: 4, y: 3, size: 7, gap: 10, full: 0xff4444, empty: 0x442022 };
const SCORE = { x: 380, y: 3 };
const GEAR = { x: 192, y: 3 };  // centre of the strip: active-gear indicator
// Countdown sits in the gap between the (centred) gear and the (right) score,
// so it never overlaps hearts / gear / score. Only used by timed periods.
const TIMER = { x: 282, y: 3 };

const OBJECTIVES = { x: 4, y: 18, lineHeight: 9 };
const TEXT_STYLE = { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff' };

// Lunch Duty three-bar meter display (top-left, under the strip). Boss periods
// have no objective checklist, so this reuses that space and does not overlap
// the hearts/gear/score/timer on the strip above. Bar ends at ~144px, clear of
// the centre gear (~155+).
const METERS = { x: 4, y: 18, rowH: 11, labelW: 54, barW: 84, barH: 6 };

export default class Hud {
  // Constructed exactly like the old ObjectivesHud: (scene, bus, objectives).
  constructor(scene, bus, objectives) {
    this.scene = scene;
    this.objLines = []; // objective Text objects, one per objective
    this.hearts = [];   // heart squares (filled/emptied live)

    this.buildStrip();
    this.render(objectives);

    // Re-render the objectives whenever their done-state changes.
    bus.on('objective:updated', (list) => this.render(list));
  }

  // The fixed top strip: background band + hearts + active-gear slot + score.
  buildStrip() {
    const scene = this.scene;

    // Background band across the whole top of the screen.
    scene.add
      .rectangle(STRIP.x, STRIP.y, STRIP.w, STRIP.h, 0x101018, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // HEARTS (left) — LIVE. Created empty here; setHearts() fills them.
    // (Count is set the first time setHearts(current, max) is called.)

    // ACTIVE GEAR (centre) — LIVE. The current primary gear (detention slip).
    this.gearText = scene.add
      .text(GEAR.x, GEAR.y, '', TEXT_STYLE)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // SCORE (right) — LIVE. setScore() updates the number.
    this.scoreText = scene.add
      .text(SCORE.x, SCORE.y, 'Score 0', TEXT_STYLE)
      .setOrigin(1, 0) // right-aligned
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // COUNTDOWN (centre-right gap) — LIVE, but only timed periods use it. Blank
    // until setTimer() is called, so untimed periods (First Period) show nothing.
    this.timerText = scene.add
      .text(TIMER.x, TIMER.y, '', TEXT_STYLE)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  // LIVE countdown. `seconds` remaining; `warning` reddens it (under threshold).
  setTimer(seconds, warning) {
    const s = Math.max(0, Math.ceil(seconds));
    const mm = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    this.timerText.setText(`${mm}:${ss}`);
    this.timerText.setColor(warning ? '#ff5555' : '#ffffff');
  }

  // Quick scale "flash" of the countdown — the scene calls this each second
  // while the timer is in the warning window.
  pulseTimer() {
    this.timerText.setScale(1.4);
    this.scene.tweens.add({ targets: this.timerText, scale: 1, duration: 200 });
  }

  // LIVE hearts: draw `max` squares, filled up to `current`. Rebuilds on demand.
  setHearts(current, max) {
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    for (let i = 0; i < max; i++) {
      this.hearts.push(
        this.scene.add
          .rectangle(
            HEARTS.x + i * HEARTS.gap,
            HEARTS.y,
            HEARTS.size,
            HEARTS.size,
            i < current ? HEARTS.full : HEARTS.empty
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(DEPTH + 1)
      );
    }
  }

  // LIVE score.
  setScore(value) {
    this.scoreText.setText('Score ' + value);
  }

  // --- Lunch Duty meter bars ---------------------------------------------

  // Create the three labeled bars once. Call with the meter snapshot.
  initMeters(meters) {
    this.meterBars = meters.map((m, i) => {
      const y = METERS.y + i * METERS.rowH;
      const label = this.scene.add
        .text(METERS.x, y, m.label, TEXT_STYLE)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
      const barX = METERS.x + METERS.labelW;
      const bg = this.scene.add
        .rectangle(barX, y, METERS.barW, METERS.barH, 0x33333f)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
      const fill = this.scene.add
        .rectangle(barX, y, 0, METERS.barH, 0x6ad06a)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 2);
      return { id: m.id, label, bg, fill };
    });
    this.updateMeters(meters);
  }

  // Resize/recolour the fills each time the meter values change. Greens low,
  // oranges mid, reds near max.
  updateMeters(meters) {
    if (!this.meterBars) return;
    for (const m of meters) {
      const bar = this.meterBars.find((b) => b.id === m.id);
      if (!bar) continue;
      const ratio = Math.max(0, Math.min(1, m.current / m.max));
      bar.fill.width = METERS.barW * ratio;
      const color = ratio > 0.75 ? 0xd05050 : ratio > 0.5 ? 0xd0a040 : 0x6ad06a;
      bar.fill.setFillStyle(color);
    }
  }

  // Show which primary gear is active (centre of the strip).
  setActiveGear(label) {
    this.gearText.setText('[Space] ' + label);
  }

  // Brief flash of the gear label when the gear is used.
  pulseGear() {
    this.gearText.setColor('#ffff88');
    this.scene.time.delayedCall(120, () => this.gearText.setColor('#ffffff'));
  }

  // LIVE objectives checklist, drawn just under the strip. (Behaviour moved
  // verbatim from the old objectivesHud.js — only the position changed.)
  render(objectives) {
    this.objLines.forEach((t) => t.destroy());
    this.objLines = objectives.map((o, i) => {
      const box = o.done ? '[x]' : '[ ]';
      // Progress suffix: cover shows seconds ("— 12s / 30s"); other count-based
      // objectives show "(1/3)".
      let suffix = '';
      if (o.type === 'cover') suffix = ` — ${o.progress}s / ${o.seconds}s`;
      else if (o.count) suffix = ` (${o.progress}/${o.count})`;
      return this.scene.add
        .text(OBJECTIVES.x, OBJECTIVES.y + i * OBJECTIVES.lineHeight, `${box} ${o.text}${suffix}`, {
          ...TEXT_STYLE,
          color: o.done ? '#8fe38f' : '#ffffff',
        })
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
    });
  }
}
