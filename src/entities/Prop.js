// A "prop" is any interactable object placed in the room (coffee pot, folder,
// desk, ...). It is just a sprite plus a little data describing how the player
// can interact with it. The interaction system reads these fields to decide
// what pressing the interact key near this prop should do.
//
// Verb types:
//   'use'     — activate it in place (e.g. switch the coffee pot on).
//   'pickup'  — pick it up and carry it; `item` is the id it becomes when held.
//   'accepts' — a drop-off target; `accepts` is the item id it will take.
//   'read'    — open its `incident` in the investigation reader (a case folder).
import Phaser from 'phaser';

export default class Prop extends Phaser.Physics.Arcade.Sprite {
  // spec = { id, sprite, x, y, verb, item?, accepts?, incident? }
  constructor(scene, spec) {
    super(scene, spec.x, spec.y, spec.sprite);

    scene.add.existing(this);
    // Static physics body: props don't move. (We don't add a collider this
    // stage — the player can stand on them to interact.)
    scene.physics.add.existing(this, true);

    this.id = spec.id;
    this.verb = spec.verb;               // 'use' | 'pickup' | 'accepts' | 'read'
    this.item = spec.item ?? null;       // pickup: the item id it becomes when held
    this.accepts = spec.accepts ?? null; // accepts: the item id this target consumes
    this.incident = spec.incident ?? null; // read: which case this folder opens
    this.used = false;                   // 'use' props: has it been activated yet?
  }
}
