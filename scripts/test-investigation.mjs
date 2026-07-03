// Unit test for src/systems/investigation.js — run: node scripts/test-investigation.mjs
// Proves the pure investigation logic: the correct suspect solves the case, a
// wrong suspect does not (and — since the check is stateless — the player can
// simply try again), and the reading pages are well-formed (<= 3 suspects).
import {
  investigationOutcome,
  buildReadingPages,
  buildResultPage,
  READING_MAX_CHOICES,
} from '../src/systems/investigation.js';
import incidents from '../data/incidents.json' with { type: 'json' };

const assert = (cond, msg) => { if (!cond) throw new Error('ASSERT FAILED: ' + msg); };

const caseData = incidents.broken_window;
assert(caseData, 'broken_window case exists');

// --- correct vs wrong -----------------------------------------------------
assert(investigationOutcome(caseData, caseData.culprit).correct === true, 'culprit is correct');
assert(investigationOutcome(caseData, 'mia').correct === false, 'wrong suspect (mia) is not correct');
assert(investigationOutcome(caseData, 'diego').correct === false, 'wrong suspect (diego) is not correct');
assert(investigationOutcome(caseData, 'nobody').correct === false, 'unknown id is not correct');

// --- retry is trivial because the check is stateless ----------------------
const wrongThenRight = [
  investigationOutcome(caseData, 'mia').correct,
  investigationOutcome(caseData, caseData.culprit).correct,
];
assert(wrongThenRight[0] === false && wrongThenRight[1] === true, 'wrong then correct works (retry allowed)');

// --- reading pages --------------------------------------------------------
const pages = buildReadingPages(caseData);
assert(pages.length === 3, `expected 3 pages, got ${pages.length}`);
assert(pages[0].kind === 'text' && pages[1].kind === 'text', 'first two pages are text (brief, clues)');
const choosePage = pages[2];
assert(choosePage.kind === 'choose', 'last page is the suspect choice');
assert(choosePage.choices.length <= READING_MAX_CHOICES, `<= ${READING_MAX_CHOICES} suspect choices`);
assert(choosePage.choices.some((c) => c.id === caseData.culprit), 'the culprit is among the choices');
assert(choosePage.choices.every((c) => c.id && c.label), 'each choice has an id + label');

// --- result page ----------------------------------------------------------
const win = buildResultPage(caseData, caseData.culprit, true);
assert(win.line.includes(caseData.success), 'success result shows the success line');
const lose = buildResultPage(caseData, 'mia', false);
assert(lose.line.includes(caseData.fail), 'fail result shows the fail line');

console.log('culprit:', caseData.culprit, '| choices:', choosePage.choices.map((c) => c.label).join(', '));
console.log('PASS');
