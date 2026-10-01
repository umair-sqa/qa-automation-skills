---
name: test-case-design-techniques
description: Guides applying concrete test case design techniques — equivalence partitioning, boundary value analysis, decision tables, state transition testing, pairwise/combinatorial testing, and exploratory charters — to derive test cases systematically instead of guessing at happy-path examples. Use when writing test cases for a numeric or bounded input, a business rule with multiple boolean conditions, a stateful workflow, a feature with many input combinations, or when a suite has only happy-path coverage and no structured edge-case derivation.
---

# Test Case Design Techniques

## Overview

Good test cases aren't found by brainstorming random examples — they're derived systematically from the shape of the input and logic. Equivalence partitioning, boundary value analysis, decision tables, state transition testing, and pairwise testing each target a specific kind of complexity (ranges, combinatorial rules, stateful flows, input explosion). Exploratory testing complements these by finding what scripted technique-driven cases can't anticipate — it's not a fallback for skipping design, it's a distinct discipline with its own structure.

## When to Use

- Writing test cases for any numeric, date, string-length, or otherwise bounded input
- Testing business logic driven by multiple independent boolean/enum conditions (pricing rules, permission checks, discount eligibility)
- Testing a feature with states and transitions (order lifecycle, approval workflow, session/auth state)
- A feature has many input parameters and testing every combination is infeasible
- A suite review finds only happy-path tests with no systematic negative/edge coverage
- Planning an exploratory testing session as a deliberate complement to scripted cases

**When NOT to use:** Don't force decision tables onto genuinely simple, single-condition logic — that's overhead without payoff. Match technique to actual complexity.

## Core Process

1. **Identify the technique that matches the input/logic shape**, before writing any test case:
   - Discrete input categories where behavior only changes at partition boundaries → equivalence partitioning + boundary value analysis.
   - Multiple independent conditions combining into an outcome → decision table.
   - Behavior depends on prior state/history, not just current input → state transition testing.
   - Many parameters, each with several values, full combinatorial testing infeasible → pairwise/combinatorial testing.
   - Behavior that's hard to specify in advance, new/unstable UX, "does this feel right" judgment → exploratory testing charter.
   - Most real features need more than one technique layered together (e.g., a pricing field needs boundary value analysis on the number AND a decision table for the surrounding discount rules).

2. **Derive partitions and boundaries first, then write only representative cases** — don't enumerate every possible value, enumerate one representative per partition plus every boundary.

3. **For combinatorial rules, build the full decision table before selecting which combinations to automate** — build it complete, then prioritize by risk from `test-strategy-and-risk-based-planning` if the full table is too large to automate entirely.

4. **For stateful flows, draw the state diagram before writing test cases** — valid transitions, invalid transition attempts, and terminal/dead-end states all need coverage, not just the "happy" transition sequence.

5. **Write an exploratory charter alongside scripted cases for anything genuinely uncertain** — don't treat "we did some manual clicking around" as exploratory testing; a charter has a stated mission, time-box, and captured findings (see below).

6. **Review the derived set against the red flags before calling design done** — specifically check for 2^N combinatorial gaps and missing boundary cases, since these are the most common silent omissions.

## Techniques and Patterns

### Equivalence Partitioning + Boundary Value Analysis (worked example)

Input: an "age" field accepting integers 18-65 inclusive (eligibility check).

Partitions:
- Invalid: below range (e.g., 17 and below)
- Valid: within range (18-65)
- Invalid: above range (e.g., 66 and above)
- Invalid: non-numeric / non-integer input (separate partition — different failure mode)

Boundaries (the values most likely to expose off-by-one errors):

| Test Case | Input | Expected |
|---|---|---|
| Below lower boundary | 17 | Rejected |
| At lower boundary | 18 | Accepted |
| Just above lower boundary | 19 | Accepted |
| Representative valid value | 40 | Accepted |
| Just below upper boundary | 64 | Accepted |
| At upper boundary | 65 | Accepted |
| Above upper boundary | 66 | Rejected |
| Non-numeric input | "abc" | Rejected with validation error, not a crash |
| Empty/null input | "" / null | Rejected with validation error, not a crash |

One representative value per valid partition (not exhaustive testing of every valid integer) plus every boundary gives strong defect-detection at a fraction of the cost of testing every possible value.

### Decision Tables (worked example)

Rule: a discount engine with three independent conditions — `isMember` (bool), `orderTotal >= $50` (bool), `hasPromoCode` (bool) — combining into a discount outcome.

With 3 boolean flags there are 2^3 = 8 combinations. A decision table forces all 8 into view instead of the 2-3 "obvious" ones:

| # | isMember | orderTotal>=50 | hasPromoCode | Expected Discount |
|---|---|---|---|---|
| 1 | F | F | F | 0% |
| 2 | F | F | T | 5% (promo only) |
| 3 | F | T | F | 0% |
| 4 | F | T | T | 5% (promo only) |
| 5 | T | F | F | 0% |
| 6 | T | F | T | 5% (promo only, membership needs $50 min) |
| 7 | T | T | F | 10% (member discount) |
| 8 | T | T | T | 15% (member + promo stack, capped) |

Building the full table surfaces the hidden rule ("membership discount requires the $50 minimum, but promo code doesn't") that a spot-check of 2-3 "obvious" cases would have missed entirely, and it exposes ambiguous combinations (row 8's stacking behavior) as an explicit question to confirm with the requirement owner rather than an assumption baked into one test.

### State Transition Testing

Model the order lifecycle as a diagram before writing cases:

```
   [Created] --pay--> [Paid] --ship--> [Shipped] --deliver--> [Delivered]
      |                  |
   cancel              refund
      v                  v
  [Cancelled]        [Refunded]
```

Derive test cases for:
- Each valid transition (Created→Paid, Paid→Shipped, etc.)
- Each invalid transition attempt (e.g., trying to `ship` a `Cancelled` order — must be rejected, not silently succeed)
- Terminal states behaving as terminal (no transitions out of `Delivered`, `Cancelled`, `Refunded`)
- Guard conditions on transitions (e.g., can only `refund` within 30 days of `Paid`)

Invalid-transition cases are the ones scripted happy-path suites most often skip, and they're exactly where state machines silently misbehave in production.

### Pairwise / Combinatorial Testing

When full combinatorial coverage is infeasible (e.g., 4 parameters x 4 values each = 256 combinations), pairwise testing selects a reduced set that still covers every *pair* of parameter values at least once — pairwise-generation tools (e.g., PICT, or online pairwise generators) produce this set algorithmically rather than by hand-picking. Use pairwise as a floor for input-explosion scenarios, then add back any specific combination the risk assessment flags as high-value even if pairwise wouldn't include it (e.g., a known-fragile combination from a past incident).

### Exploratory Testing Charters

A charter is a short, structured mission — not unstructured clicking:

```
Charter: Explore the checkout discount-stacking UI for confusing or
         inconsistent behavior not covered by scripted cases.
Time-box: 45 minutes
Areas to probe: rapid promo-code entry/removal, browser back button
                mid-checkout, concurrent tabs with the same cart.
Findings log: [bug/observation, repro steps, severity] for each item found.
```

Exploratory testing is repeatable in the sense that matters: the charter, time-box, and findings are recorded, so the session itself can be reviewed and re-run with a similar mission even if the exact clicks differ. It complements scripted technique-driven cases by covering what nobody thought to specify in advance — it does not replace boundary/decision-table/state design for known logic.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Happy path is enough, edge cases are rare" | Edge cases are rare in casual use but common in aggregate at scale — a boundary hit by 0.1% of traffic still means real users and real incidents once volume is high enough. |
| "We'll add edge cases only after a bug is found in prod" | That's using production users as the test oracle. Boundary value analysis finds the same bugs before release at a fraction of the cost of an incident. |
| "Exploratory testing isn't real testing since it's not repeatable" | A charter with a stated mission, time-box, and findings log is repeatable at the mission level even if exact actions vary — dismissing it as "not real" usually rationalizes skipping structured exploration altogether. |
| "We tested the obvious 2-3 combinations, that's representative" | With N boolean flags, "obvious" combinations are a tiny, biased sample of 2^N. Business logic bugs hide specifically in the untested combinations, as the decision-table example above shows. |
| "The state machine mostly works, we tested the normal flow" | Invalid-transition attempts and terminal-state violations are where state machines actually break; testing only the intended sequence tests the diagram you drew, not the system's actual guard logic. |
| "Testing every combination would take too long, so we picked a few" | That's the right instinct with the wrong method — use pairwise/combinatorial generation to get systematic reduced coverage instead of an ad hoc, unverifiable subset. |

## Red Flags

- Test suite covers only the happy path; zero negative/invalid-input tests exist
- No boundary tests around any numeric, date, or string-length input in the suite
- Decision logic with N boolean/enum flags has fewer than 2^N (or a documented pairwise-reduced) test cases
- State machine tests only cover the intended forward sequence, no invalid-transition or terminal-state cases
- "Exploratory testing" sessions with no charter, time-box, or findings log — indistinguishable from unstructured clicking
- Large combinatorial input space "covered" by a handful of hand-picked cases with no pairwise tool or rationale behind the selection

## Verification

- [ ] Every bounded input (numeric range, date range, string length limit) has explicit boundary test cases (just-below, at, just-above each boundary)
- [ ] Every multi-condition business rule has a decision table with all 2^N rows enumerated, even if only a risk-prioritized subset is automated
- [ ] Every stateful flow has a diagram and test cases for invalid transitions and terminal states, not just the intended path
- [ ] Any input space too large for full combinatorial coverage has a documented pairwise (or equivalent) reduction, not an arbitrary subset
- [ ] At least one exploratory charter exists for genuinely uncertain/new behavior, with mission, time-box, and findings recorded
- [ ] A suite review confirms negative/invalid-input test cases exist for every user-facing input field in scope
