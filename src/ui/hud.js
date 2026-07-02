// The game's HUD. It owns the reserved top strip of the screen (per TECH_SPEC
// §2) and, just beneath it, the live objectives checklist.
//
// LIVE now:
//   - OBJECTIVES: seeded from the tracker and updated on the 'objective:updated'
//     event; ticks [ ] -> [x] (green) and shows (progress/count) for trash.
// STATIC placeholders (a later stage wires these to real values):
//   - HEARTS (composure) on the left.
//   - SCORE on the right.
//
// Everything here is camera-pinned (setScrollFactor(0)) at a high depth so it
// stays fixed on screen and draws above the play field. Internal res is 384x216.

// --- layout / style (internal 384x216 pixels) ---------------------------
const STRIP = { x: 0, y: 0, w: 384, h: 14 };
const DEPTH = 1000;

const HEARTS = { x: 4, y: 3, size: 7, gap: 10, count: 3, color: 0xff4444 };
const SCORE = { x: 380, y: 3 };

const OBJECTIVES = { x: 4, y: 18, lineHeight: 9 };
const TEXT_STYLE = { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff' };

export default class Hud {
  // Constructed exactly like the old ObjectivesHud: (scene, bus, objectives).
  constructor(scene, bus, objectives) {
    this.scene = scene;
    this.objLines = []; // objective Text objects, one per objective

    this.buildStrip();
    this.render(objectives);

    // Re-render the objectives whenever their done-state changes.
    bus.on('objective:updated', (list) => this.render(list));
  }

  // The fixed top strip: background band + static hearts + static score.
  buildStrip() {
    const scene = this.scene;

    // Background band across the whole top of the screen.
    scene.add
      .rectangle(STRIP.x, STRIP.y, STRIP.w, STRIP.h, 0x101018, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // HEARTS (left) — STATIC placeholder. Stage 5 wires live composure here.
    for (let i = 0; i < HEARTS.count; i++) {
      scene.add
        .rectangle(
          HEARTS.x + i * HEARTS.gap,
          HEARTS.y,
          HEARTS.size,
          HEARTS.size,
          HEARTS.color
        )
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
    }

    // CENTER of the strip is reserved for the active-gear indicator
    // (TECH_SPEC §2) — a later stage will draw it here.

    // SCORE (right) — STATIC placeholder. Stage 5 wires live score here.
    scene.add
      .text(SCORE.x, SCORE.y, 'Score 0', TEXT_STYLE)
      .setOrigin(1, 0) // right-aligned
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
  }

  // LIVE objectives checklist, drawn just under the strip. (Behaviour moved
  // verbatim from the old objectivesHud.js — only the position changed.)
  render(objectives) {
    this.objLines.forEach((t) => t.destroy());
    this.objLines = objectives.map((o, i) => {
      const box = o.done ? '[x]' : '[ ]';
      // Show progress for count-based objectives, e.g. "Pick up the trash (1/3)".
      const counter = o.count ? ` (${o.progress}/${o.count})` : '';
      return this.scene.add
        .text(OBJECTIVES.x, OBJECTIVES.y + i * OBJECTIVES.lineHeight, `${box} ${o.text}${counter}`, {
          ...TEXT_STYLE,
          color: o.done ? '#8fe38f' : '#ffffff',
        })
        .setScrollFactor(0)
        .setDepth(DEPTH + 1);
    });
  }
}
