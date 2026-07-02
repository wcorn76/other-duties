// An NPC (a teacher/staff member you can talk to). Like a Prop, it is an
// interactable the interaction system can find by proximity — but its verb is
// 'talk', so interacting opens a conversation instead of running a prop verb.
//
// It has a solid, immovable body: the player collides with it and can't walk
// through a teacher (the collider itself is added in PeriodScene).
import Phaser from 'phaser';

export default class Npc extends Phaser.Physics.Arcade.Sprite {
  // spec = { id, sprite?, x, y, dialogue, tint? }
  constructor(scene, spec) {
    super(scene, spec.x, spec.y, spec.sprite || 'npc');

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true); // teachers don't get shoved around

    // Small "feet" hitbox to match the player's, so bumping feels consistent.
    this.body.setSize(12, 10);
    this.body.setOffset(2, 13);

    this.id = spec.id;
    this.verb = 'talk';           // the interaction system opens dialogue for this
    this.dialogue = spec.dialogue; // which conversation id to start

    if (spec.tint != null) this.setTint(spec.tint); // recolour the shared body
  }
}
