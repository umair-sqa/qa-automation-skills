# Evals

This is a lightweight routing/regression-check scaffold for the skill catalog — **not** an automated semantic grader. There is no harness here that calls a live model, scores embeddings, or produces a pass/fail number by itself. It exists to catch one specific failure mode: a change to a skill's `description` (or a rename, merge, or split of skills) silently breaking which skill an agent picks for a given prompt.

## What's here

- **`scripts/validate-skills.js`** (structural check, automatic) — validates that every `SKILL.md` has correct frontmatter, required headings in order, and that commands reference real skill names. Run it with:

  ```
  node scripts/validate-skills.js
  ```

  This is a CI gate: it exits non-zero on any structural failure. It says nothing about whether descriptions actually *trigger* correctly for real prompts — that's what `cases.md` is for.

- **`cases.md`** (routing check, manual/semi-manual) — a table of representative prompts, each with the skill(s) it should route to and why. This is a checklist format, not a script.

## How to use this scaffold

Whenever a skill's `description` frontmatter changes, a skill is added/removed/renamed, or two skills are merged or split, walk through `cases.md`:

1. For each row, read the prompt and decide (as a reviewer — human, or Claude itself in a dedicated review session) which skill(s) it would actually route to today, given the current catalog descriptions.
2. Compare against the "Expected skill(s)" column. A mismatch means a description regression — the trigger language drifted from what the case expects.
3. Pay particular attention to the ambiguous and negative cases: those exist specifically to catch over-broad descriptions that now match things they shouldn't, or gaps where nothing matches something that should be in scope.
4. Update `cases.md` itself when the catalog intentionally changes behavior (new skill, merged skill, retired skill) so it stays a true reflection of current routing intent — don't let it silently go stale.

## What this deliberately does not do

- It does not spin up a model, run prompts, or compute a score.
- It does not replace `scripts/validate-skills.js` — structure and routing are checked separately because they fail independently (a skill can have perfect frontmatter and still trigger on the wrong prompts, or vice versa).
- It does not attempt to enumerate every possible prompt. It's a representative sample sized to catch regressions in the areas most likely to drift: newly added skills, overlapping skills, and out-of-scope boundaries.
