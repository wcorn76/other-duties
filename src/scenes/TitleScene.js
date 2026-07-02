// The title screen. It shows the game's name and a "pre-alpha" label on a dark
// background, then waits for the player to press any key or click to start.
import Phaser from 'phaser';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // Find the middle of the screen so we can center the text.
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Main title.
    this.add.text(centerX, centerY - 20, 'OTHER DUTIES AS ASSIGNED', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Smaller subtitle underneath.
    this.add.text(centerX, centerY + 4, 'pre-alpha', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#8a8a99',
    }).setOrigin(0.5);

    // Prompt telling the player how to begin.
    this.add.text(centerX, centerY + 24, 'press any key to start', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#5a5a66',
    }).setOrigin(0.5);

    // Start the game on any key press or mouse click. `once` so it only fires
    // a single time even if several keys are pressed.
    this.input.keyboard.once('keydown', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  startGame() {
    this.scene.start('PeriodScene');
  }
}
