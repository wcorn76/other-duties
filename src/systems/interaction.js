// The interaction + carry system: the "verbs" layer of the game.
//
// Every frame it finds the nearest interactable prop within reach and shows a
// floating "E" prompt over it. When the player presses the interact key it runs
// that prop's verb:
//   'use'     -> activate in place, fire  interact:done { id }
//   'pickup'  -> pick the item up (one carry slot), fire  pickup:done { item }
//   'accepts' -> if carrying the item it wants, deliver it, fire deliver:done
//
// It also owns the single CARRY SLOT: the player can hold exactly one item,
// show it above their head, drop it back into the world, or deliver it.
//
// KEYS (documented so later stages don't clash):
//   Interact = E and Enter.
//   Drop     = Q.                         (Q is now taken.)
//   Space is deliberately LEFT UNUSED — reserved for the detention slip later.
import Phaser from 'phaser';
import Prop from '../entities/Prop.js';

// --- Tunables -------------------------------------------------------------

// How close (in pixels) the player must be for a prop to be interactable.
// A little over one 16px tile so you don't have to stand exactly on it.
export const INTERACT_RANGE = 22;

// How far above a prop / the player the little icons float.
const PROMPT_OFFSET_Y = -14;
const HELD_OFFSET_Y = -16;

export default class InteractionSystem {
  constructor(scene, player, bus) {
    this.scene = scene;
    this.player = player;
    this.bus = bus; // shared event emitter (see PeriodScene)

    this.interactables = []; // list of Props we can interact with
    this.nearest = null;     // the closest one in range, or null

    // --- carry slot (exactly one item) ---
    this.heldItem = null;    // the held item's id (e.g. 'folder'), or null
    this.heldSprite = null;  // the little sprite shown above the player's head

    // --- keys ---
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.interactKeys = [
      scene.input.keyboard.addKey(KC.E),
      scene.input.keyboard.addKey(KC.ENTER),
    ];
    this.dropKey = scene.input.keyboard.addKey(KC.Q);
    // NOTE: we intentionally do NOT bind Space here.

    // --- floating "E" prompt (hidden until something is in range) ---
    this.prompt = scene.add
      .text(0, 0, 'E', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#222222',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setVisible(false);
  }

  // Add a prop to the set of things the player can interact with.
  register(prop) {
    this.interactables.push(prop);
  }

  // Called every frame by the scene.
  update() {
    // While play is frozen (a conversation or a UI panel is up), the player
    // can't interact. Hide the prompt and bail out. Same predicate the player
    // uses — one freeze path.
    if (this.scene.isPlayFrozen && this.scene.isPlayFrozen()) {
      this.prompt.setVisible(false);
      return;
    }

    this.refreshNearest();
    this.refreshPrompt();
    this.refreshHeldSprite();

    if (this.interactJustPressed()) this.tryInteract();
    if (Phaser.Input.Keyboard.JustDown(this.dropKey)) this.tryDrop();
  }

  interactJustPressed() {
    return this.interactKeys.some((k) => Phaser.Input.Keyboard.JustDown(k));
  }

  // Find the closest active prop within INTERACT_RANGE of the player.
  refreshNearest() {
    let best = null;
    let bestDist = INTERACT_RANGE;
    for (const prop of this.interactables) {
      if (!prop.active) continue;
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, prop.x, prop.y
      );
      if (d <= bestDist) {
        bestDist = d;
        best = prop;
      }
    }
    this.nearest = best;
  }

  // Show the "E" over the nearest interactable, or hide it if there is none.
  refreshPrompt() {
    if (this.nearest) {
      this.prompt
        .setPosition(this.nearest.x, this.nearest.y + PROMPT_OFFSET_Y)
        .setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  // Keep the held item drawn just above the player's head.
  refreshHeldSprite() {
    if (this.heldSprite) {
      this.heldSprite.setPosition(this.player.x, this.player.y + HELD_OFFSET_Y);
    }
  }

  // Run the nearest prop's verb.
  tryInteract() {
    const prop = this.nearest;
    if (!prop) return;

    switch (prop.verb) {
      case 'use':
        if (!prop.used) {
          prop.used = true;
          prop.setTint(0x9cff9c); // greenish = "done", simple visual feedback
          this.bus.emit('interact:done', { id: prop.id });
        }
        break;

      case 'pickup':
        this.pickup(prop);
        break;

      case 'accepts':
        this.deliver(prop);
        break;

      case 'talk':
        // NPCs use this verb: open their conversation instead of a prop action.
        if (this.scene.dialogue) this.scene.dialogue.start(prop.dialogue, prop.id);
        break;

      case 'read':
        // Case folder: open the investigation reader for its incident.
        if (this.scene.reader) this.scene.reader.read(prop.incident);
        break;

      case 'grant':
        // A student is asking for the bathroom: grant the nearest one's pass.
        if (this.scene.bathroom) this.scene.bathroom.grant(prop);
        break;

      case 'trash':
        // Litter: just remove it and count it — it is NOT carried (no slot used).
        this.collectTrash(prop);
        break;

      default:
        break;
    }
  }

  // Remove a trash prop from the world and report it collected.
  collectTrash(prop) {
    const item = prop.item || 'trash';
    this.removeInteractable(prop);
    prop.destroy();
    this.bus.emit('collect:done', { item });
  }

  // Put an item straight into the carry slot (no world prop involved). Used by
  // find_use "givers": talking to the giver grants the item.
  // NOTE: Stage 4's tasks.js will own item-granting; for now PeriodScene calls
  // this in response to talk:done.
  giveItem(itemId) {
    if (this.heldSprite) this.heldSprite.destroy(); // replace whatever we held
    this.heldItem = itemId;
    this.heldSprite = this.scene.add
      .image(this.player.x, this.player.y + HELD_OFFSET_Y, itemId)
      .setDepth(999);
    this.bus.emit('pickup:done', { item: itemId });
  }

  // --- carry slot verbs ---------------------------------------------------

  // Pick up a prop: only if our single slot is empty.
  pickup(prop) {
    if (this.heldItem) return; // one slot only — ignore if already carrying

    this.heldItem = prop.item;
    this.removeInteractable(prop);
    prop.destroy(); // remove from the world

    // Show what we're holding above the head. Item id doubles as texture key.
    this.heldSprite = this.scene.add
      .image(this.player.x, this.player.y + HELD_OFFSET_Y, this.heldItem)
      .setDepth(999);

    this.bus.emit('pickup:done', { item: this.heldItem });
  }

  // Drop the held item back into the world as a pickup-able prop again.
  tryDrop() {
    if (!this.heldItem) return;
    const item = this.heldItem;

    const dropped = new Prop(this.scene, {
      id: item,
      sprite: item,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      verb: 'pickup',
      item,
    });
    this.register(dropped);

    this.clearHeld();
    this.bus.emit('drop:done', { item });
  }

  // Deliver: if we're holding exactly what this target accepts, hand it over.
  deliver(target) {
    if (this.heldItem && this.heldItem === target.accepts) {
      const item = this.heldItem;
      this.clearHeld(); // the item is consumed
      target.setTint(0x9cff9c); // feedback that the drop-off happened
      this.bus.emit('deliver:done', { item, target: target.id });
    }
    // If not holding the right thing, do nothing (prompt still shows).
  }

  // --- helpers ------------------------------------------------------------

  clearHeld() {
    if (this.heldSprite) this.heldSprite.destroy();
    this.heldSprite = null;
    this.heldItem = null;
  }

  removeInteractable(prop) {
    const i = this.interactables.indexOf(prop);
    if (i >= 0) this.interactables.splice(i, 1);
    if (this.nearest === prop) this.nearest = null;
  }
}
