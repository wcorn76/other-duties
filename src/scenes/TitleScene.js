// The title screen. It just shows the game's name and a "pre-alpha" label
// on a dark background. There is no gameplay or interaction here yet.
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
    this.add.text(centerX, centerY - 12, 'OTHER DUTIES AS ASSIGNED', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Smaller subtitle underneath.
    this.add.text(centerX, centerY + 12, 'pre-alpha — Stage 0', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#8a8a99',
    }).setOrigin(0.5);
  }
}
