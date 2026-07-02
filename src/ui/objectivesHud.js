// Minimal objectives HUD: a plain checklist pinned to the screen that ticks
// each objective off as it is completed. It listens for 'objective:updated'
// and re-draws the list.
//
// This is intentionally bare-bones. The REAL heads-up display (hearts,
// composure, score, the day ticker) arrives in Stage 4 and will own the top
// strip of the screen; this placeholder just sits in the top-left corner so we
// can see objectives working during Stage 2.

// Where the list sits and how tall each line is (screen pixels).
const X = 6;
const Y = 6;
const LINE_HEIGHT = 10;

export default class ObjectivesHud {
  constructor(scene, bus, objectives) {
    this.scene = scene;
    this.lines = []; // the Text objects, one per objective

    this.render(objectives);

    // Re-render whenever an objective's done-state changes.
    bus.on('objective:updated', (list) => this.render(list));
  }

  render(objectives) {
    // Rebuild the list from scratch (small lists, so this is simple + fine).
    this.lines.forEach((t) => t.destroy());
    this.lines = objectives.map((o, i) => {
      const box = o.done ? '[x]' : '[ ]';
      return this.scene.add
        .text(X, Y + i * LINE_HEIGHT, `${box} ${o.text}`, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: o.done ? '#8fe38f' : '#ffffff',
        })
        .setScrollFactor(0) // stay fixed on screen, don't scroll with the map
        .setDepth(2000);
    });
  }
}
