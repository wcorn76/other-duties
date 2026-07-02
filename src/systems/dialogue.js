// The dialogue system: walks a conversation node-graph and drives the text box.
//
// A conversation (see data/dialogue.json) is:
//   { portrait, start, nodes: { nodeId: { npc:"line", choices:[{text,next}] } } }
// A node with "end": true and no choices ends the conversation.
//
// We load dialogue.json with a plain ES import — Vite bundles JSON imports at
// build time. This is the pattern we'll reuse for tasks/periods JSON in Stage 4
// (no runtime fetch, no extra loader plumbing).
//
// Controls while open: Up/Down (arrows or W/S) move the choice cursor; confirm
// with E/Enter or the number keys 1/2/3. Space is never used. The player is
// blocked from moving while a conversation is open (see Player.update and
// interaction.update, which early-return when isOpen() is true).
import Phaser from 'phaser';
import TextBox from '../ui/textbox.js';
import dialogues from '../../data/dialogue.json';

// Which portrait images the loaded conversations need — the scene preloads these.
export function dialoguePortraitAssets() {
  const ids = new Set();
  for (const conv of Object.values(dialogues)) ids.add(conv.portrait);
  return [...ids].map((id) => ({
    key: `portrait_${id}`,
    path: `assets/sprites/portrait_${id}.png`,
  }));
}

export default class DialogueSystem {
  constructor(scene, bus) {
    this.scene = scene;
    this.bus = bus;
    this.textbox = new TextBox(scene);

    this.open = false;
    this.justOpened = false; // guard so the opening E press can't also confirm

    const KC = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard;
    this.upKeys = [kb.addKey(KC.UP), kb.addKey(KC.W)];
    this.downKeys = [kb.addKey(KC.DOWN), kb.addKey(KC.S)];
    this.confirmKeys = [kb.addKey(KC.E), kb.addKey(KC.ENTER)];
    this.numberKeys = [kb.addKey(KC.ONE), kb.addKey(KC.TWO), kb.addKey(KC.THREE)];
    // NOTE: Space is intentionally NOT bound here.
  }

  isOpen() {
    return this.open;
  }

  // Open a conversation at its start node.
  start(dialogueId, npcId) {
    const conv = dialogues[dialogueId];
    if (!conv) {
      console.warn('Unknown dialogue id:', dialogueId);
      return;
    }
    this.conv = conv;
    this.npcId = npcId;
    this.nodeId = conv.start;
    this.selectedIndex = 0;
    this.open = true;
    this.justOpened = true;
    this.renderCurrent();
  }

  currentNode() {
    return this.conv.nodes[this.nodeId];
  }

  renderCurrent() {
    const node = this.currentNode();
    const choices = (node.choices || []).map((c) => c.text);
    this.textbox.show(`portrait_${this.conv.portrait}`, node.npc, choices, this.selectedIndex);
  }

  update() {
    if (!this.open) return;
    // Skip input on the very frame we opened (so the interact key that opened
    // the conversation doesn't instantly confirm the first choice).
    if (this.justOpened) {
      this.justOpened = false;
      return;
    }

    const node = this.currentNode();
    const choices = node.choices || [];

    // Terminal node (end:true / no choices): any confirm closes the box.
    if (choices.length === 0) {
      if (this.anyJustDown(this.confirmKeys)) this.close();
      return;
    }

    // Move the cursor.
    if (this.anyJustDown(this.upKeys)) {
      this.selectedIndex = (this.selectedIndex + choices.length - 1) % choices.length;
      this.textbox.setSelection(this.selectedIndex);
    } else if (this.anyJustDown(this.downKeys)) {
      this.selectedIndex = (this.selectedIndex + 1) % choices.length;
      this.textbox.setSelection(this.selectedIndex);
    }

    // Number keys pick a choice directly.
    for (let i = 0; i < choices.length && i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) {
        this.choose(i);
        return;
      }
    }

    // Confirm the highlighted choice.
    if (this.anyJustDown(this.confirmKeys)) this.choose(this.selectedIndex);
  }

  // Follow the selected choice's `next` link to the next node.
  choose(index) {
    const choice = this.currentNode().choices[index];
    if (!choice) return;
    this.nodeId = choice.next;
    this.selectedIndex = 0;
    this.renderCurrent();
  }

  close() {
    this.open = false;
    this.textbox.hide();
    // Tell the world this NPC has been talked to.
    this.bus.emit('talk:done', { id: this.npcId });
    this.conv = null;
  }

  anyJustDown(keys) {
    return keys.some((k) => Phaser.Input.Keyboard.JustDown(k));
  }
}
