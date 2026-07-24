# BlessUp Den self-checks - working rules

Static HTML self-check pages published to **den.onepin.app** (one file per topic,
each self-contained: styles + content + a small quiz IIFE at the bottom).

---

## LOCKED: never tell a reader they reported something they did not select

This is the highest-priority rule in this repo. It came from a real member report.

**What happened (2026-07-24).** A member ticked exactly one box on the sleep
self-check - *"I fall asleep unintentionally during the day, or while driving"* -
and the result told her:

> "You marked a genuine red flag: loud snoring with gasping or breathing pauses
> (possible sleep apnea), falling asleep unintentionally during the day or at the
> wheel, or long-standing insomnia that damages your days."

She never reported snoring or apnea. The result string was a **hardcoded paragraph
that recited every option in the question**; the code never read the checkboxes at
all. An audit found the same defect on **18 of 25 pages**, 57 confirmed cases:

- melanocortins told a user who ticked *"atypical moles"* that she marked a
  **melanoma history and pregnancy**
- glp-class told a pregnant user she marked **medullary thyroid cancer**
- nad-nmn / semax-selank asserted *"your foundation has gaps: sleep, exercise,
  diet"* with **zero** of those ticked, and congratulated a *"handled foundation"*
  when **all three** were ticked
- healing-stack counted a foundation dropdown and injury type (not risky answers)
  toward risk copy accusing the reader of four behaviours they never selected

On a health page this is a trust problem, not a cosmetic one.

### The rule

1. **Any sentence that claims what the reader selected must be built from what they
   actually ticked.** Never hardcode the option list. Use `pickedLabels(sel)` +
   `joinList(arr)` (see `sleep.html` for the reference implementation) so the
   sentence echoes their own wording.
2. **Gate the claim on `picked.length`.** A score can cross a threshold from a
   dropdown or radio alone, so a branch can fire with zero boxes ticked. Never
   enumerate anything when nothing was selected - say what actually drove it
   (name the chosen dropdown/radio option) instead.
3. **Never invert.** A reader who ticked gap boxes must not be told their
   foundation is "handled". Gate reassurance on `picked.length === 0`.
4. **Make the rationale follow the pick.** A pregnancy-only tick gets a pregnancy
   reason, not a cancer or melanoma explanation.
5. **Only risk answers may drive risk copy.** Do not let a foundation dropdown or
   an injury-type radio push someone into a branch that accuses them of risky
   behaviour.
6. **Generic outcome descriptions are fine.** "Your setup is leaving product on the
   table" asserts nothing about which option was chosen. The bug is specifically
   *claiming a selection*.

### Before you commit any quiz change

```bash
node tools/check-claims.mjs      # exit 1 = a claim is hardcoded
```

It is dependency-free and reads every `*.html`. It fails when a claim phrase
("You marked", "You flagged", "Your foundation has gaps", "are stacking up", ...)
is followed by a colon whose option list sits inside the same string literal.
Verified to catch the original sleep.html defect verbatim.

For a behavioural check, serve the folder and drive it with Playwright: tick
exactly ONE box per page and assert the result names only that option. That sweep
was 162 single-pick cases at 0 false claims when this rule was written.

---

## House style

- **No em dashes** and no double hyphens; use " - " (space hyphen space).
- No `window.alert` / `confirm` / `prompt`.
- Keep the quiz IIFE ES5 (`var`, `function`) to match the existing pages.
- Pages are standalone: no shared JS bundle, no build step. A fix must be applied
  to each affected file (the pages are copy-pasted from each other, so a defect in
  one is usually in several - always sweep all of them).
- **Enumerate files programmatically** when auditing (`ls *.html | wc -l`). A
  truncated listing is how `thick-blood.html` was initially missed.

## Related

- Companion quizzes live in **blessup-guides** (guides.onepin.app) - audited clean.
- The peptide goal finder (finder.onepin.app + the in-app Goals tab) interpolates
  the reader's real flags and is clean; keep it that way.
