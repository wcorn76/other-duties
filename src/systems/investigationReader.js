// The investigation reader: opens a case folder and walks the player through the
// brief, the clues, and a suspect line-up. It REUSES the dialogue text box for
// rendering (it is NOT a new dialogue engine) and mirrors the dialogue system's
// input handling: Up/Down (arrows or W/S) move the choice cursor; confirm with
// E/Enter or the number keys 1/2/3. Space is never used.
//
// Flow (pure page list from investigation.js): brief page -> clues page ->
// suspect choice -> a result page (the kid's line + success/fail). Picking the
// culprit fires investigate:done { incident, correct:true } and the objective
// completes. A wrong pick just closes the reader with no penalty — reopen the
// folder (press E again) to try once more.
//
// While open, the scene is frozen (see PeriodScene.isPlayFrozen, which consults
// isOpen()), so the player can't move or interact underneath the reading box.
import Phaser from 'phaser';
import TextBox from '../ui/textbox.js';
import {
  investigationOutcome,
  buildReadingPages,
  buildResultPage,
} from './investigation.js';
import incidents from '../../data/incidents.json';

// The folder art doubles as the reader's "portrait" (left of the text).
const PORTRAIT_KEY = 'folder';

export default class InvestigationReader {
  constructor(scene, bus) {
    this.scene = scene;
    this.bus = bus;
    this.textbox = new TextBox(scene);

    this.open = false;
    this.justOpened = false; // guard so the E that opened it can't also advance

    const KC = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard;
    this.upKeys = [kb.addKey(KC.UP), kb.addKey(KC.W)];
    this.downKeys = [kb.addKey(KC.DOWN), kb.addKey(KC.S)];
    this.confirmKeys = [kb.addKey(KC.E), kb.addKey(KC.ENTER)];
    this.numberKeys = [kb.addKey(KC.ONE), kb.addKey(KC.TWO), kb.addKey(KC.THREE)];
    // NOTE: Space is intentionally NOT bound.
  }

  isOpen() {
    return this.open;
  }

  // Open the folder for a given incident id (from the read prop).
  read(incidentId) {
    const caseData = incidents[incidentId];
    if (!caseData) {
      console.warn('Unknown incident id:', incidentId);
      return;
    }
    this.incidentId = incidentId;
    this.caseData = caseData;
    this.pages = buildReadingPages(caseData); // brief, clues, suspects
    this.pageIndex = 0;
    this.selectedIndex = 0;
    this.result = null; // { correct } once an accusation is made
    this.open = true;
    this.justOpened = true;
    this.render();
  }

  currentPage() {
    return this.pages[this.pageIndex];
  }

  render() {
    const page = this.currentPage();
    const labels = page.kind === 'choose' ? page.choices.map((c) => c.label) : [];
    this.textbox.show(PORTRAIT_KEY, page.line, labels, this.selectedIndex);
  }

  update() {
    if (!this.open) return;
    if (this.justOpened) {
      this.justOpened = false;
      return;
    }

    const page = this.currentPage();

    if (page.kind === 'choose') {
      if (this.anyJustDown(this.upKeys)) {
        this.selectedIndex = (this.selectedIndex + page.choices.length - 1) % page.choices.length;
        this.textbox.setSelection(this.selectedIndex);
      } else if (this.anyJustDown(this.downKeys)) {
        this.selectedIndex = (this.selectedIndex + 1) % page.choices.length;
        this.textbox.setSelection(this.selectedIndex);
      }
      for (let i = 0; i < page.choices.length && i < this.numberKeys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) return this.accuse(i);
      }
      if (this.anyJustDown(this.confirmKeys)) this.accuse(this.selectedIndex);
      return;
    }

    // A text page (brief / clues / result): confirm advances or closes.
    if (this.anyJustDown(this.confirmKeys)) {
      if (this.result !== null) {
        this.close(); // dismissing the result page ends the reading
      } else {
        this.pageIndex += 1;
        this.selectedIndex = 0;
        this.render();
      }
    }
  }

  // Accuse the selected suspect: show the result page (their line + success/fail).
  accuse(index) {
    const page = this.currentPage();
    const picked = page.choices[index];
    if (!picked) return;
    const { correct } = investigationOutcome(this.caseData, picked.id);
    this.result = { correct };
    this.pages = [buildResultPage(this.caseData, picked.id, correct)];
    this.pageIndex = 0;
    this.selectedIndex = 0;
    this.render();
  }

  close() {
    this.open = false;
    this.textbox.hide();
    // Report the outcome. objectives.js completes the investigation only on
    // correct:true; a wrong accusation does nothing (the player can reopen).
    this.bus.emit('investigate:done', {
      incident: this.incidentId,
      correct: this.result ? this.result.correct : false,
    });
    this.caseData = null;
  }

  anyJustDown(keys) {
    return keys.some((k) => Phaser.Input.Keyboard.JustDown(k));
  }
}
