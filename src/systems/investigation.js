// Pure investigation logic — no Phaser, so it's Node-testable. It answers "did
// the player accuse the right kid?" and turns a case (from data/incidents.json)
// into the linear list of "pages" the reading UI shows. All rendering + input
// lives in the reader (investigationReader.js), which reuses textbox.js.

// The reading box shows at most this many suspect choices (fits 384x216).
export const READING_MAX_CHOICES = 3;

// Was `pickedId` the culprit? Pure + stateless, so retrying is just calling it
// again with a different pick.
export function investigationOutcome(caseData, pickedId) {
  return { correct: caseData.culprit === pickedId };
}

// Build the pages the reader walks through: the brief, the clues, then the
// suspect choice. Pure data; the reader renders each page with the text box.
//   { kind:'text',   line }                       -> press E to continue
//   { kind:'choose', line, choices:[{id,label}] } -> pick a suspect
export function buildReadingPages(caseData) {
  return [
    { kind: 'text', line: `${caseData.title}\n\n${caseData.brief.join(' ')}` },
    { kind: 'text', line: 'Clues:\n' + caseData.clues.map((c) => '- ' + c).join('\n') },
    {
      kind: 'choose',
      line: 'Who did it?',
      choices: caseData.suspects
        .slice(0, READING_MAX_CHOICES)
        .map((s) => ({ id: s.id, label: s.name })),
    },
  ];
}

// Build the result page shown after an accusation (the kid's line + the case's
// success/fail text). On a wrong pick the reader closes and the folder can be
// reopened to try again (no penalty).
export function buildResultPage(caseData, pickedId, correct) {
  const suspect = caseData.suspects.find((s) => s.id === pickedId);
  const reaction = suspect ? `"${suspect.line}"\n\n` : '';
  return { kind: 'text', line: reaction + (correct ? caseData.success : caseData.fail) };
}
