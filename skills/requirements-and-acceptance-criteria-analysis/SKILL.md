---
name: requirements-and-acceptance-criteria-analysis
description: Guides analyzing a ticket, user story, or spec for ambiguous wording, unmeasurable criteria, missing negative/edge-case behavior, and undocumented dependencies before any test design begins. Use when picking up a new ticket or story, when acceptance criteria contain subjective language ("should work correctly", "handle errors appropriately"), when a ticket has only happy-path criteria, or when a requirement's testability depends on an unstated upstream service, flag, or migration. Hands off to requirements-to-test-traceability once criteria are clarified and testable.
---

# Requirements and Acceptance Criteria Analysis

## Overview

Before a single test case can be designed, a requirement has to say something observable and checkable. This skill is the pass that happens first: read the ticket, find the wording that can't be verified as written, find the scenarios it never mentions, find the dependencies that make it untestable right now — and get those resolved before committing any interpretation to code. Skipping this step doesn't save time; it just moves the cost downstream, where a guessed interpretation gets encoded into an automated test and then quietly enforced as if it were the spec.

## When to Use

- Picking up a new ticket, user story, or spec before starting test design
- An acceptance criterion uses subjective or unmeasurable language ("should work correctly", "should be fast", "handle errors appropriately", "reasonable")
- A ticket lists only happy-path behavior with no mention of invalid input, empty state, permission denial, timeouts, or concurrent access
- The requirement's behavior depends on something not stated in the ticket — an upstream service, a feature flag, a data migration, another in-flight ticket
- A requirement you're about to test was inherited from a previous sprint and nobody re-checked whether it's still accurate

**Handoff:** once every acceptance criterion has a testable, observable pass/fail condition — resolved ambiguities, enumerated edge cases, known dependencies — this skill's job is done. Test design and matrix-building against those criteria is the `requirements-to-test-traceability` skill; don't duplicate that work here, and don't start it before this pass is complete.

**When NOT to use:** A one-line config or copy change with a self-evidently observable outcome (e.g., "change button label from X to Y") doesn't need a full pass — see "Right-sizing the depth" below. Note in the ticket that a full analysis wasn't warranted and why.

## Core Process

1. **Read every acceptance criterion and ask: "can this be marked pass or fail without further interpretation?"** If two competent engineers could implement or test it differently from the wording alone, it's ambiguous. Underline or list the exact ambiguous phrase — not "this is unclear," but the specific words and the two-plus readings they support.

2. **Rewrite each ambiguous criterion into an observable, measurable condition** (see the technique below) before accepting it as ready for test design. If you can't rewrite it without inventing a threshold, an interpretation, or a specific behavior no one confirmed, that's the signal to ask, not to guess.

3. **Check for missing negative and edge-case criteria.** For every stated happy-path behavior, ask what the ticket does *not* say about:
   - Invalid, malformed, or boundary input
   - Empty, zero, or not-yet-populated state
   - Permission denial / unauthorized access
   - Concurrent or duplicate requests
   - Partial failure (timeout, upstream service down, retry)
   
   A ticket with zero negative-path criteria isn't a ticket with no edge cases — it's a ticket where nobody wrote them down yet.

4. **Check for undocumented dependencies that affect testability right now.** Before assuming the requirement can be tested as written, confirm: Does it depend on an upstream service or API that's actually available in the test environment? A feature flag that must be on? A data migration that hasn't run yet? Another in-flight ticket whose output this one consumes? A requirement can be perfectly well-written and still untestable today for reasons the ticket never states.

5. **Surface every finding as a question, not a silent decision.** For each ambiguity, gap, or dependency found, take it to the requirement owner (PM, tech lead, spec author) before test design proceeds on that item. If the owner is genuinely unreachable and the item isn't release-blocking, record your best-informed interpretation explicitly as an open, dated assumption in the ticket — never as an unmarked fact indistinguishable from a confirmed requirement.

6. **Right-size the depth of analysis to risk and complexity.** A one-line label change or a low-risk internal tool tweak doesn't need the full four-pass treatment — a thirty-second sanity check ("is there an observable condition here? any obvious missing negative case?") is enough, and moving on is correct. Reserve the full pass for anything touching money, auth, data integrity, external contracts, or anything where a wrong guess is expensive to unwind. The discipline that matters is asking the question at all, not filling out a template regardless of stakes.

7. **Hand off once criteria are clarified.** When every acceptance criterion is testable and gaps/dependencies are either resolved or explicitly flagged, move to `requirements-to-test-traceability` to map criteria to test cases — don't re-litigate clarity there; that skill assumes this pass already happened.

## Techniques and Patterns

### Turning a vague criterion into a testable one

Take the criterion at face value, then ask: what would actually happen at runtime for each way this could fail? Enumerate it.

**Before:** "The API should handle errors appropriately."

**After:**

| Failure mode | Expected status code | Expected error shape | Notes |
|---|---|---|---|
| Missing required field | 400 | `{ "error": "validation_error", "field": "<name>" }` | One entry per required field |
| Invalid auth token | 401 | `{ "error": "unauthorized" }` | No body detail beyond this |
| Valid auth, insufficient permission | 403 | `{ "error": "forbidden", "resource": "<id>" }` | Distinct from 401 |
| Referenced resource doesn't exist | 404 | `{ "error": "not_found" }` | — |
| Upstream dependency timeout | 502 or 504? | — | **Unconfirmed — ask owner which, and whether retry is expected client-side** |
| Duplicate submission (idempotency) | ? | ? | **Not mentioned in ticket — flag as gap** |

The table format forces the gap to become visible: rows you can fill in confidently are now testable criteria; rows with a `?` are exactly the ambiguities and omissions to take back to the requirement owner, named specifically instead of restated as "error handling is unclear."

### The core stance: ask, don't guess

An AI agent or engineer analyzing a requirement should surface ambiguity as a question and stop there — not silently pick the "sensible" or "most common" interpretation and build tests or automation around it. This is not a matter of thoroughness; it's the difference between a suite that verifies the actual spec and a suite that verifies its own guess and will pass forever even if the guess was wrong. No automation should be written against undefined or ambiguous behavior without clarification first, however small the ambiguity feels.

### A fast clarification ask, not a ticket-blocking essay

Clarifying doesn't have to mean a slow round-trip. Frame it as a yes/no or pick-one question with your best-informed default attached: "Assuming a 502 on upstream timeout with client-side retry, matching the pattern in service X — confirm or correct?" This is answerable in one line and moves faster than reopening a design discussion.

### Dependency check, as a short list rather than a guess

Before treating a requirement as ready for test design, walk through the concrete dependency questions instead of assuming "it'll be there":

- **Upstream services** — Is the service this feature calls actually deployed and reachable in the environment tests will run against, or only planned?
- **Feature flags** — Does the behavior described require a flag to be on? Is that flag's default state in each environment (dev/staging/prod) known, or assumed?
- **Data migrations** — Does the criterion assume a data shape or backfill that hasn't run yet? Testing against pre-migration data will produce misleading results.
- **Other in-flight tickets** — Does this requirement consume output from a ticket still in progress? If so, its "done" criteria are contingent on that other ticket's criteria, which may themselves be unresolved.

Answer each with a fact ("confirmed deployed to staging as of <date>") or an open question — never with silence, which reads later as "checked and fine."

### Right-sizing the depth: a quick calibration

Use the stated risk/complexity signals, not ticket length, to decide how much of the process to run in full:

| Signal | Depth warranted |
|---|---|
| Copy/label/config change, no logic branch, outcome self-evident | Sanity check only — confirm there's an observable outcome, move on |
| New UI affordance with no money, auth, or external contract involved | Steps 1-3 (ambiguity + negative cases), skip formal dependency mapping unless something clearly external is involved |
| Touches payments, auth, permissions, PII, or data integrity | Full process, steps 1-6, with owner sign-off recorded regardless of how "obvious" it seems |
| Depends on another team's service, flag, or in-flight ticket | Step 4 (dependency check) is mandatory even if the criteria themselves look clear |

Ticket length is a weak proxy for risk — a two-line ticket that touches billing needs the full pass; a ten-line ticket describing a tooltip does not.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The ticket is short but everyone knows what it means, let's just start" | If it were genuinely unambiguous, writing down the interpretation would cost nothing and everyone would agree instantly. The tickets that cause rework are exactly the ones where "everyone knows" turns out to mean three different things once compared. |
| "I'll just assume the sensible/most common behavior and build tests against that" | A test built against an assumption doesn't verify the requirement — it verifies the assumption, and will pass even when the assumption is wrong. The bug ships with a green test suite covering it. |
| "We don't have time to go back to the PM/BA, let's ship something and fix it if it's wrong" | Fixing after ship means: rework the code, rework the test, and explain to a user why behavior changed. A one-line clarifying question upfront is cheaper than all three. |
| "Vague acceptance criteria are a product problem, not something QA should block on" | QA is the discipline positioned to notice untestable wording before it becomes untested behavior. Passing it downstream silently doesn't make it not a QA problem — it makes it a QA problem discovered in production. |
| "It's a small ticket, a full ambiguity pass is overkill" | Right-sizing is expected — see step 6. But "small" should be a judgment about risk and complexity, not an excuse to skip the thirty-second sanity check entirely. |
| "The negative cases are implied by 'handle errors appropriately'" | "Implied" negative cases are exactly the ones nobody agrees on later. If it's truly implied, enumerating it costs a sentence; if people disagree once it's enumerated, it wasn't implied at all. |

## Red Flags

- Test automation built against an assumed or guessed behavior with no record in the ticket of what was clarified, by whom, or when
- Acceptance criteria containing subjective, unmeasurable language ("should work well", "should be fast", "reasonable timeout") with no follow-up to make them measurable
- A ticket moving into test design with zero negative-path or edge-case criteria and nobody having flagged the gap
- Repeated rework where the "obvious" interpretation of a vague requirement turned out to be wrong after implementation
- A requirement marked ready for test design while it silently depends on a feature flag, migration, or upstream service nobody confirmed is available
- An assumption recorded only in a chat thread or a reviewer's memory instead of back in the ticket itself

## Verification

- [ ] Every acceptance criterion has a testable, observable pass/fail condition — no criterion still reads as subjective or unmeasurable
- [ ] Every ambiguity found was either resolved with the requirement owner (with the resolution recorded in the ticket) or explicitly flagged as an open, dated risk before test design proceeded
- [ ] Negative and edge-case criteria were enumerated for each stated happy-path behavior, not left as an unstated gap
- [ ] Dependencies and blockers (upstream services, flags, migrations, other in-flight tickets) affecting testability were identified before test design started
- [ ] The depth of analysis matched the risk/complexity of the change — no bureaucratic pass on a trivial ticket, no skipped pass on a high-risk one
- [ ] Ready criteria are handed off to `requirements-to-test-traceability` rather than re-analyzed there
