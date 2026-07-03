// The title screen. Shows the game's name and — TEMPORARY for testing — a small
// period-select menu so both levels can be launched without editing code.
//
// TEMPORARY TESTING AFFORDANCE: this two-option menu (First Period / Hall Duty)
// stands in for the real progression/handoff, which a later stage builds. It
// just starts PeriodScene with the chosen period's data.
import Phaser from 'phaser';
import period1 from '../../data/periods/period_1.json';
import hallDuty1 from '../../data/periods/hall_duty_1.json';
import periodTestAll5 from '../../data/periods/period_test_all5.json';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 44, 'OTHER DUTIES AS ASSIGNED', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(cx, cy - 26, 'pre-alpha', {
      fontFamily: 'monospace', fontSize: '8px', color: '#8a8a99',
    }).setOrigin(0.5);

    // The launchable periods (temporary test menu).
    this.options = [
      { label: 'First Period', period: period1 },
      { label: 'Hall Duty', period: hallDuty1 },
      { label: 'Test: All 5', period: periodTestAll5 },
    ];
    this.selected = 0;

    // One text row per option; clickable and hover-selectable too.
    this.optionTexts = this.options.map((o, i) =>
      this.add
        .text(cx, cy - 8 + i * 14, o.label, {
          fontFamily: 'monospace', fontSize: '10px', color: '#ffffff',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => { this.selected = i; this.refresh(); })
        .on('pointerdown', () => this.start(i))
    );

    this.add.text(cx, cy + 40, 'up / down + E   (temporary test menu)', {
      fontFamily: 'monospace', fontSize: '8px', color: '#5a5a66',
    }).setOrigin(0.5);

    // Keys: arrows or W/S to move, E/Enter to confirm, 1/2 as shortcuts.
    const KC = Phaser.Input.Keyboard.KeyCodes;
    const kb = this.input.keyboard;
    this.upKeys = [kb.addKey(KC.UP), kb.addKey(KC.W)];
    this.downKeys = [kb.addKey(KC.DOWN), kb.addKey(KC.S)];
    this.confirmKeys = [kb.addKey(KC.E), kb.addKey(KC.ENTER)];
    this.numberKeys = [kb.addKey(KC.ONE), kb.addKey(KC.TWO), kb.addKey(KC.THREE)];

    this.refresh();
  }

  // Redraw the ► cursor + highlight on the selected option.
  refresh() {
    this.optionTexts.forEach((t, i) => {
      t.setText((i === this.selected ? '> ' : '  ') + this.options[i].label);
      t.setColor(i === this.selected ? '#ffff88' : '#ffffff');
    });
  }

  start(i) {
    this.scene.start('PeriodScene', { period: this.options[i].period });
  }

  update() {
    const down = (keys) => keys.some((k) => Phaser.Input.Keyboard.JustDown(k));
    if (down(this.upKeys)) {
      this.selected = (this.selected + this.options.length - 1) % this.options.length;
      this.refresh();
    } else if (down(this.downKeys)) {
      this.selected = (this.selected + 1) % this.options.length;
      this.refresh();
    }
    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) this.start(i);
    }
    if (down(this.confirmKeys)) this.start(this.selected);
  }
}
