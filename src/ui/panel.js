// Reusable camera-pinned HUD panel, used for the period-start to-do list and
// the period-complete message. It matches the dialogue text box's look (same
// dark translucent fill + light border) so the game feels like one piece.
//
// Two builders (static factory methods, mirroring how the other ui modules are
// constructed in PeriodScene):
//   Panel.todoList(scene, { title, lines, onDismiss })  -> titled checklist
//   Panel.message(scene,  { main, sub, onDismiss })      -> big centered message
//
// Dismiss with E / Enter (never Space). A panel polls its keys from the scene's
// update loop (via update()); it does NOT register persistent key listeners, so
// tearing it down is just destroying its Phaser objects. A one-frame `justOpened`
// guard stops the same key press that opened/created the panel from also
// dismissing it (mirrors DialogueSystem's guard).
import Phaser from 'phaser';

// Depth 1500 sits above the HUD (1000) so panels overlay the play field + HUD.
const DEPTH = 1500;
const BG = { color: 0x101018, alpha: 0.94, border: 0xffffff };
const TEXT = { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff' };
const BIG = { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff' };
const DIM = '#8a8a99';
const CX = 192; // horizontal centre of the 384px-wide screen

export default class Panel {
  // Titled to-do list: title on top, each line prefixed "- ", dim footer.
  static todoList(scene, { title, lines, onDismiss }) {
    const p = new Panel(scene, onDismiss);
    const pad = 10;
    const lineH = 12;
    const n = lines.length;
    const boxW = 300;
    const boxH = pad * 2 + 16 /*title*/ + n * lineH + 6 /*gap*/ + 12 /*footer*/;
    const top = 108 - boxH / 2;

    p._box(boxW, boxH);
    p._text(CX, top + pad, title, {}, 0.5, 0); // title, centred
    const leftX = CX - boxW / 2 + 16;
    const lineY0 = top + pad + 16;
    lines.forEach((line, i) => p._text(leftX, lineY0 + i * lineH, `- ${line}`, {}, 0, 0));
    p._text(CX, lineY0 + n * lineH + 4, 'Press E to start', { color: DIM }, 0.5, 0);
    return p;
  }

  // Big centered message with an optional dim sub-line and a dim footer.
  static message(scene, { main, sub, onDismiss }) {
    const p = new Panel(scene, onDismiss);
    const boxW = 300;
    const boxH = 74;
    const top = 108 - boxH / 2;

    p._box(boxW, boxH);
    p._text(CX, top + 18, main, BIG, 0.5, 0.5);
    if (sub) p._text(CX, top + 40, sub, { color: DIM }, 0.5, 0.5);
    p._text(CX, top + boxH - 14, 'Press E to return to title', { color: DIM }, 0.5, 0.5);
    return p;
  }

  constructor(scene, onDismiss) {
    this.scene = scene;
    this.onDismiss = onDismiss;
    this.objects = [];
    this.dismissed = false;
    this.justOpened = true; // ignore any key already down on the opening frame

    const KC = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard;
    // E/Enter dismiss. These Key objects are shared with dialogue/interaction,
    // which is exactly what makes the single-press consumption work (see below).
    this.dismissKeys = [kb.addKey(KC.E), kb.addKey(KC.ENTER)];
    // NOTE: Space is intentionally NOT bound.
  }

  // Background box, matching the text box's palette.
  _box(w, h) {
    const box = this.scene.add
      .rectangle(CX, 108, w, h, BG.color, BG.alpha)
      .setOrigin(0.5)
      .setStrokeStyle(2, BG.border, 0.85)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.objects.push(box);
    return box;
  }

  _text(x, y, str, style = {}, originX = 0, originY = 0) {
    const t = this.scene.add
      .text(x, y, str, { ...TEXT, ...style })
      .setOrigin(originX, originY)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    this.objects.push(t);
    return t;
  }

  // Called from the scene's update loop. Dismisses on E/Enter, but never on the
  // frame it was created (justOpened guard).
  update() {
    if (this.dismissed) return;
    if (this.justOpened) {
      this.justOpened = false;
      return;
    }
    if (this.dismissKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      this.dismiss();
    }
  }

  isDismissed() {
    return this.dismissed;
  }

  dismiss() {
    if (this.dismissed) return;
    this.dismissed = true;
    this.destroy();
    if (this.onDismiss) this.onDismiss();
  }

  // Fully tear down: destroy every Phaser object we created. We poll keys
  // rather than registering listeners, and E/Enter are shared with the dialogue
  // and interaction systems, so we deliberately do NOT removeKey them here.
  destroy() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }
}
