// The bathroom-request mechanic (Lunch Duty) — the one small new interaction.
//
// On a timer, a random well-behaved diner "raises a hand" (a cyan tell floats
// above them) asking for the bathroom. While a kid is waiting, they're a normal
// interactable with the `grant` verb, so the EXISTING interaction system shows
// the "E" prompt over the NEAREST one and pressing E grants that pass. Granting
// emits `bathroom:done { id }`, clears the tell, and lowers the Bathroom meter.
//
// This deliberately reuses the interaction proximity+E pattern (register /
// removeInteractable + a `grant` case in interaction.js) rather than adding a
// second key path — Space stays the slip, E grants the pass.
import Phaser from 'phaser';
import { BATHROOM_REQUEST_EVERY_MS } from './meters.js';

const MAX_WAITING = 3;        // cap concurrent requesters so it stays fair
const TELL_OFFSET_Y = -15;    // where the raised-hand tell floats

export default class Bathroom {
  constructor(scene, bus, interaction, meters, hud) {
    this.scene = scene;
    this.bus = bus;
    this.interaction = interaction;
    this.meters = meters;
    this.hud = hud;
    this.waiting = new Map(); // student -> tell sprite
    this.nextRequestAt = scene.time.now + BATHROOM_REQUEST_EVERY_MS;
  }

  update(now) {
    // Keep each tell glued above its (wandering) student.
    for (const [student, tell] of this.waiting) {
      if (!student.active) { this.clear(student); continue; }
      tell.setPosition(student.x, student.y + TELL_OFFSET_Y);
    }
    // Time for a new request?
    if (now >= this.nextRequestAt) {
      this.nextRequestAt = now + BATHROOM_REQUEST_EVERY_MS;
      this.raiseHand();
    }
  }

  // Pick a random eligible diner (well-behaved, not already waiting) to request.
  raiseHand() {
    if (this.waiting.size >= MAX_WAITING) return;
    const eligible = (this.scene.students || []).filter(
      (s) => s.active && !s.upToNoGood && !this.waiting.has(s)
    );
    if (eligible.length === 0) return;
    const student = Phaser.Utils.Array.GetRandom(eligible);

    // Make it a `grant` interactable and show the tell.
    student.verb = 'grant';
    this.interaction.register(student);
    const tell = this.scene.add
      .image(student.x, student.y + TELL_OFFSET_Y, 'bathroom_tell')
      .setDepth(400);
    this.waiting.set(student, tell);
  }

  // Called by the interaction system's `grant` verb (nearest requester).
  grant(student) {
    if (!this.waiting.has(student)) return;
    this.bus.emit('bathroom:done', { id: student.id });
    this.clear(student);
    this.meters.lower('bathroom');
    this.hud.updateMeters(this.meters.getMeters());
  }

  // Remove a student from the waiting set: drop the tell + stop being interactable.
  clear(student) {
    const tell = this.waiting.get(student);
    if (tell) tell.destroy();
    this.waiting.delete(student);
    this.interaction.removeInteractable(student);
    if (student.active) student.verb = null;
  }
}
