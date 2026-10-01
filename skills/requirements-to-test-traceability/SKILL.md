---
name: requirements-to-test-traceability
description: Guides mapping acceptance criteria, user stories, and specs to specific test cases via a live traceability matrix, catching requirements with zero test coverage and tests that don't map to any requirement. Use when starting test design against a ticket or spec, when acceptance criteria are ambiguous or missing, when auditing whether a feature is "actually tested" before release, or when a traceability matrix exists but hasn't been updated since requirements changed.
---

# Requirements-to-Test Traceability

## Overview

A traceability matrix maps every requirement (acceptance criterion, user story, spec clause) to the test case(s) that verify it, and every test case back to the requirement it exists for. Its value isn't the spreadsheet — it's the gap it exposes: requirements nobody wrote a test for, and tests nobody can explain the purpose of. Kept alive, it also catches requirement drift before a stale test gives false confidence.

## When to Use

- Starting test design against a ticket, user story, or spec document
- Preparing a release sign-off and needing to prove which requirements are actually verified
- Auditing an existing suite to find coverage gaps against current acceptance criteria
- Acceptance criteria are ambiguous, contradictory, or missing details needed to write a test
- A traceability matrix exists but requirements have changed since it was last touched

**When NOT to use:** Trivial one-line copy/config changes with no discrete acceptance criteria — full matrix overhead isn't warranted, but note in the ticket that no formal trace was needed and why.

## Core Process

1. **Extract discrete, testable requirements.** Break the story/spec into individually verifiable statements. "Users can filter search results" is not one requirement — split it into each filter type, combination behavior, empty-result behavior, and persistence-across-navigation behavior. A requirement that can't be phrased as a checkable statement isn't testable yet — go back to step 2.

2. **Flag ambiguous or missing requirements before writing tests against a guess.** For each extracted requirement, ask: "would two different engineers implement this identically from this wording alone?" If not, it's ambiguous. Use a clarification pass:
   - Write down the specific ambiguity (not "this is unclear" — state the two-plus interpretations you found).
   - Propose a concrete interpretation with a rationale ("assuming X because the design mock shows Y").
   - Get an explicit answer from the requirement owner (PM, tech lead, or spec author) before test design proceeds on that item, or explicitly mark it "assumed — pending confirmation" and flag it in the matrix.
   - Never silently pick an interpretation and encode it into a test as if it were confirmed; a future reader can't tell an assumption from a verified fact.

3. **Build the matrix.** One row per requirement, columns for requirement ID, source (ticket/spec link), test level, linked test case ID(s), and status.

   ```
   | Req ID | Requirement                                    | Source      | Test Level  | Test Case(s)         | Status   |
   |--------|-------------------------------------------------|-------------|-------------|-----------------------|----------|
   | AC-1   | Discount applies only to orders over $50         | JIRA-1123   | Unit        | TC-DISC-001, TC-DISC-002 | Covered |
   | AC-2   | Discount stacking is disallowed                  | JIRA-1123   | Integration | TC-DISC-014           | Covered |
   | AC-3   | Behavior when discount code expires mid-checkout | JIRA-1123   | —           | —                     | GAP — no test, ambiguous timing rule |
   ```

4. **Surface every gap explicitly.** Any requirement row with no linked test case is a gap — treat it as a blocker for sign-off, not a footnote. Any test case that doesn't trace back to a row is an "orphan test": either it's testing something real that never got captured as a requirement (add the row) or it's dead weight testing something no longer in scope (investigate before deleting).

5. **Review the matrix at each requirements change.** When the ticket/spec is edited (new AC added, one dropped, wording changed), update the matrix in the same review pass — not as a follow-up task that gets deprioritized. Treat matrix drift the same as a merge conflict: it must be resolved before the change is considered done.

6. **Use the matrix at sign-off, not just at test-design time.** Before release, walk the matrix and confirm every "Covered" row's linked test actually passed in the latest run — a stale "Covered" status from three sprints ago on since-changed logic is worse than an honest gap.

## Techniques and Patterns

### Handling ambiguous requirements — the clarification interview

Don't guess and don't block indefinitely. Run a short structured interview:

```
1. State the requirement as written.
2. State the specific behavior that's undetermined
   (e.g., "spec doesn't say what happens if the discount code
   expires between cart load and checkout submit").
3. List 2-3 plausible interpretations with the consequence of each.
4. Ask the requirement owner to pick one, or propose your best-informed
   default and ask for a yes/no confirmation (faster to answer than an
   open question).
5. Record the decision back into the requirement/ticket, not just in
   your head or a chat thread that will scroll away.
```

If no owner is reachable and the item isn't release-blocking, mark the matrix row `status: assumed`, write the assumption inline, and flag it for confirmation before the next release — never leave an assumption indistinguishable from a verified requirement.

### Granularity: one AC can need multiple tests, across levels

A single acceptance criterion like "checkout rejects expired cards" typically needs:
- A unit test on the card-expiry validation function (fast, isolated).
- An integration test that the checkout API returns the correct error response.
- Possibly one e2e smoke test that the error renders correctly in the UI.

List all of them under the same requirement row — the matrix maps requirement to *test set*, not requirement to one test.

### Keeping it live, not a one-time artifact

- Store the matrix next to the code/tests it describes (repo, test management tool, or linked from the ticket) — not in a doc that only gets opened during audits.
- Update it in the same commit/PR that adds or changes tests for that requirement, so it can't silently drift.
- Treat "orphan test found" as a recurring suite-review check (pairs with `test-suite-quality-review` if present in your catalog), not a one-off cleanup.

### Coverage-status states worth distinguishing

A binary "covered / not covered" flattens useful information. Use finer-grained statuses so a gap review can prioritize:

| Status | Meaning | Action |
|---|---|---|
| `covered` | Linked test(s) exist and passed in the latest run | None — re-verify at each sign-off |
| `gap` | No test linked at all | Blocker — write the test or get an explicit risk-accepted waiver |
| `assumed` | Requirement was ambiguous; a default interpretation was recorded and tested, pending confirmation | Chase the requirement owner before release |
| `stale` | Linked test exists but the requirement text changed since the test was last touched | Re-verify the test still matches current wording |
| `deferred` | Gap accepted deliberately for this release (low risk, ties to `test-strategy-and-risk-based-planning`) | Must have an owner and a target release to close it |

### Lightweight matrix for a small ticket

The matrix scales down — a three-row table inline in the PR description is enough for a small ticket; the discipline (every AC has a linked test or a marked gap) matters more than the tooling:

```
| AC | Test | Status |
|---|---|---|
| Rejects usernames over 20 chars | test_username_length_boundary | covered |
| Trims leading/trailing whitespace | test_username_trim | covered |
| Behavior on duplicate username (case-insensitive?) | — | assumed: case-insensitive match, confirm with PM |
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The ticket is enough documentation, we don't need a matrix" | A ticket shows what was asked for; it doesn't show what was verified. Without an explicit map, "is this tested?" can only be answered by re-reading every test file and guessing at intent. |
| "We'll trace it later once it's stable" | "Stable" requirements are exactly when tracing is cheapest — once the feature ships and requirements are forgotten, reconstructing intent from code is far more expensive than mapping it in the moment. |
| "The acceptance criteria are implied, everyone knows what it means" | If it's genuinely unambiguous, writing it down costs nothing. If people disagree once asked, it wasn't implied — it was a landmine waiting for two engineers to build different assumptions. |
| "We don't have time for a formal matrix on this small ticket" | The matrix can be three rows in the PR description for a small ticket. The format scales down; skipping it entirely just means the gap-check never happens. |
| "Test coverage percentage already proves we're covered" | Code coverage measures execution, not requirement coverage. A line can be executed by a test that asserts nothing about the actual acceptance criterion. |
| "This test doesn't map to any requirement, but it's probably testing something useful, leave it" | An orphan test with unclear purpose is a maintenance cost with no traceable value — confirm its purpose and either link it to a requirement or justify and document why it exists (e.g., regression test for a specific past incident). |

## Red Flags

- Any acceptance criterion in the ticket/spec with zero linked test case at sign-off time
- "Orphan tests" in the suite that don't map to any requirement and nobody can explain why they exist
- A traceability matrix whose last edit timestamp predates the last requirements change on the same epic
- Ambiguities resolved by silent assumption, with no record of what was assumed or who confirmed it
- Matrix rows marked "Covered" pointing to tests that are currently skipped, failing, or deleted
- Requirements phrased so vaguely that they can't be marked pass/fail without more interpretation (e.g., "should work well")

## Verification

- [ ] Every acceptance criterion in the source ticket/spec has at least one row in the matrix
- [ ] Every row is linked to concrete test case ID(s), or explicitly marked as a gap with an owner and date to close it
- [ ] Every test case in the relevant suite traces back to a requirement row (no unexplained orphans)
- [ ] Ambiguous requirements have a recorded resolution (owner's answer or a flagged, dated assumption) — not silence
- [ ] The matrix's last-updated point is on or after the requirement's last-changed point
- [ ] At sign-off, every "Covered" row was checked against the latest test run result, not assumed from history
