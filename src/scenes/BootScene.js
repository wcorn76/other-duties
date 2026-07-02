// The very first scene. Right now it does almost nothing and jumps straight
// to the Title screen. Later on this is where we will preload global assets
// (images, sounds, fonts) before the rest of the game starts.
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // TODO (later stage): preload global assets here before continuing.
    this.scene.start('TitleScene');
  }
}
