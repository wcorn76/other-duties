// This is the starting point of the game. It sets up Phaser (the game engine)
// with our chosen screen size and options, then hands control to the scenes.
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';

const config = {
  type: Phaser.AUTO,        // Let Phaser pick WebGL or Canvas automatically.
  parent: 'game',           // Draw inside the <div id="game"> in index.html.
  backgroundColor: '#101014',

  // The game "thinks" at this small pixel resolution and is then scaled up.
  width: 384,
  height: 216,

  pixelArt: true,           // Keep pixel art crisp (no blurry smoothing).
  roundPixels: true,        // Snap drawing to whole pixels to avoid shimmering.

  scale: {
    mode: Phaser.Scale.FIT,             // Scale the game to fit the window.
    autoCenter: Phaser.Scale.CENTER_BOTH, // Center it horizontally and vertically.
  },

  // Scenes run in the order listed here: Boot first, then Title.
  scene: [BootScene, TitleScene],
};

new Phaser.Game(config);
