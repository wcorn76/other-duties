// Pure rendering of the dialogue text box: a panel across the bottom of the
// screen with a portrait on the left, the NPC's current line, and up to three
// choices with a ► cursor on the selected one. It knows NOTHING about the
// conversation graph — the dialogue system tells it what to draw. Camera-pinned
// so it stays put while the world scrolls, and drawn on top of everything.

// Layout, in the game's internal 384x216 pixels.
const PANEL = { x: 4, y: 150, w: 376, h: 62 };
const PORTRAIT = { x: 10, y: 158, size: 48 };
const NPC_TEXT = { x: 66, y: 156, wrap: 306 };
const CHOICES = { x: 70, y: 186, lineHeight: 11 };
const DEPTH = 5000;
const MAX_CHOICES = 3;

export default class TextBox {
  constructor(scene) {
    this.scene = scene;

    // Background panel.
    this.bg = scene.add
      .rectangle(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 0x101018, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.85)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    // Portrait (texture is swapped in on show()). '__WHITE' is a built-in key.
    this.portrait = scene.add
      .image(PORTRAIT.x, PORTRAIT.y, '__WHITE')
      .setOrigin(0, 0)
      .setDisplaySize(PORTRAIT.size, PORTRAIT.size)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // The NPC's spoken line.
    this.npcText = scene.add
      .text(NPC_TEXT.x, NPC_TEXT.y, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        wordWrap: { width: NPC_TEXT.wrap },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // Up to three choice lines, created once and reused.
    this.choiceTexts = [];
    for (let i = 0; i < MAX_CHOICES; i++) {
      this.choiceTexts.push(
        scene.add
          .text(CHOICES.x, CHOICES.y + i * CHOICES.lineHeight, '', {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#ffffff',
          })
          .setScrollFactor(0)
          .setDepth(DEPTH + 1)
      );
    }

    this.choices = [];
    this.hide();
  }

  // Draw a node: portrait, line, and its choices with the cursor on `selected`.
  show(portraitKey, npcLine, choices, selectedIndex) {
    this.choices = choices || [];
    this.portrait.setTexture(portraitKey).setDisplaySize(PORTRAIT.size, PORTRAIT.size);
    this.npcText.setText(npcLine);

    this.choiceTexts.forEach((t, i) => {
      if (i < this.choices.length) t.setVisible(true);
      else t.setVisible(false);
    });

    this.setSelection(selectedIndex || 0);
    this.setVisible(true);
  }

  // Move the ► cursor to choice `i` and re-label the visible choice lines.
  setSelection(i) {
    this.selectedIndex = i;
    this.choiceTexts.forEach((t, k) => {
      if (k < this.choices.length) {
        const cursor = k === i ? '► ' : '  ';
        t.setText(cursor + this.choices[k]);
        t.setColor(k === i ? '#ffff88' : '#cccccc');
      }
    });
  }

  hide() {
    this.setVisible(false);
  }

  setVisible(v) {
    this.bg.setVisible(v);
    this.portrait.setVisible(v);
    this.npcText.setVisible(v);
    this.choiceTexts.forEach((t) => t.setVisible(v && this.choices.length > 0));
  }
}
