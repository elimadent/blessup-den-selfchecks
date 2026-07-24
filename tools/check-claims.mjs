#!/usr/bin/env node
// check-claims.mjs - guard against the "told me I picked something I didn't" bug.
//
// WHY THIS EXISTS
// A member ticked ONE box on the sleep self-check ("I fall asleep unintentionally
// during the day") and the result told her she had ALSO reported loud snoring with
// gasping and breathing pauses (possible sleep apnea). The result text was a
// hardcoded paragraph that recited every option in the question. An audit found the
// same defect on 18 of 25 pages, including one that told a user who ticked
// "atypical moles" that she had marked a melanoma history and pregnancy.
//
// THE RULE
// If a result string CLAIMS what the reader selected, it must be built from what
// they actually ticked (pickedLabels/joinList), never hardcoded. Generic outcome
// descriptions ("Your setup is leaving product on the table") are fine, because
// they assert nothing about which option was chosen.
//
// Zero dependencies. Run: node tools/check-claims.mjs   (exit 1 = violation)

import fs from "fs";
import path from "path";

const DIR = process.argv[2] || path.resolve(new URL(".", import.meta.url).pathname, "..");

// Phrases that assert something about the reader's own answers.
const CLAIMS = [
  "You marked", "You flagged", "You told", "You said", "You checked",
  "You reported", "You selected", "You have a couple", "You did flag",
  "Your foundation has gaps", "Your foundation has some gaps",
  "Your answers flag", "are stacking up",
];
// Proof the sentence is built from the reader's real picks: either a known
// helper, or plain string concatenation with a variable (label readers such as
// causeLabel()/keyLabel() interpolate the chosen radio or dropdown option).
const PROOF = ["pickedLabels(", "joinList(", "stopKinds(", "stopNotes(", "drivers.length", "picked.length"];
const CONCAT = /['"]\s*\+\s*[A-Za-z_$]/; // "... : '+cl+'. " style interpolation
const WINDOW = 600; // chars either side to look for the proof

// End of the string literal that the claim sits in (first unescaped quote after it).
function literalEnd(src, from) {
  for (let j = from; j < src.length; j++) {
    const ch = src[j];
    if ((ch === '"' || ch === "'") && src[j - 1] !== "\\") return j;
    if (ch === "\n") return j;
  }
  return -1;
}

let violations = 0, files = 0, claims = 0;
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".html")).sort()) {
  const src = fs.readFileSync(path.join(DIR, f), "utf8");
  files++;
  for (const phrase of CLAIMS) {
    let i = -1;
    while ((i = src.indexOf(phrase, i + 1)) !== -1) {
      // only care about occurrences inside the quiz script, not prose/headings
      const around = src.slice(Math.max(0, i - WINDOW), i + WINDOW);
      if (!/show\s*\(|rBody|textContent/.test(around)) continue;
      claims++;
      // The recital always follows a colon ("You marked one of the firm lines: A, B, or C").
      // If the option list sits INSIDE the same string literal, it is hardcoded.
      // If the literal ends at the colon, the list is interpolated from real picks.
      const end = literalEnd(src, i);
      const seg = src.slice(i, end === -1 ? i + 250 : end);
      const colon = seg.indexOf(":");
      const bakedIn = colon !== -1 && seg.slice(colon + 1).trim().length > 0;
      const after = src.slice(i, i + 300);
      const dynamic = PROOF.some(p => around.includes(p)) || CONCAT.test(after);
      if (bakedIn || !dynamic) {
        violations++;
        const line = src.slice(0, i).split("\n").length;
        console.log(`FAIL ${f}:${line}  "${phrase}..." is asserted but not built from the reader's picks`);
        console.log(`      ${src.slice(i, i + 130).replace(/\s+/g, " ")}`);
      }
    }
  }
}

console.log(`\nchecked ${files} pages, ${claims} answer-claims, ${violations} violation(s)`);
if (violations) {
  console.log("\nFix: build the sentence from pickedLabels(...) so it names ONLY what was ticked,");
  console.log("and gate the branch on picked.length so nothing is enumerated when nothing was selected.");
  process.exit(1);
}
console.log("OK - every claim about the reader's answers is built from their actual selections.");
