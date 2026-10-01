---
name: test-strategy-and-risk-based-planning
description: Guides deciding what is worth testing, at what level, and how much effort to spend before any test is written, using risk (impact x likelihood) to prioritize rather than treating all functionality as equally important. Use when starting work on a new feature, epic, or release; when a team defaults to "automate everything" or chases 100% coverage without prioritization; when the test pyramid is inverted toward slow e2e tests; or when stakeholders haven't agreed on what "tested enough" means for a given change.
---

# Test Strategy and Risk-Based Planning

## Overview

Testing effort is a budget, not an obligation to spend everywhere equally. Before writing a single test, decide what's worth testing, at what level, and how much confidence is actually needed — driven by the impact of a defect and the likelihood it occurs, not by what's easiest to script or what a ticket vaguely implies. Skipping this step produces suites that are large, slow, and still miss the failures that matter.

## When to Use

- At the start of a new feature, epic, or release, before any test case is written
- When scoping how much testing a change needs (a config tweak vs. a payment flow rewrite)
- When a team's instinct is "just automate everything" or "we need 100% coverage"
- When the existing suite is e2e-heavy, slow, and still misses production incidents
- When stakeholders (PM, eng lead, QA) haven't explicitly agreed on the quality bar for a release

**When NOT to use:** Once a risk-based plan already exists for a feature and you're just adding one more test case within it — that's `test-case-design-techniques` territory, not re-planning.

## Core Process

1. **Inventory the change.** List the user-facing behaviors, business rules, integrations, and data paths touched by the feature or release. Include what's *not* touched but could regress (shared components, feature flags, config).

2. **Score risk per behavior.** For each item, rate:
   - **Impact** if it fails: revenue loss, data corruption, compliance violation, security exposure, silent wrong output, cosmetic-only.
   - **Likelihood** of failure: new/complex code, third-party dependency, concurrency, high change frequency, past defect history in this area.
   - Multiply (or combine on a simple High/Medium/Low grid) to rank items. A login regression (high impact, used by 100% of users) always outranks a rarely-used admin export button, regardless of which is easier to test.

3. **Choose the right test level per risk item**, not one level for everything:
   - Pure logic / calculations / validation rules → **unit tests**.
   - Interactions between two of your own components/services → **integration tests**.
   - A boundary you don't own (a partner API, another team's service) → **contract tests** against a shared schema/pact, so both sides can evolve without a live integration environment.
   - A UI component's behavior in isolation (props, events, rendered states) → **component tests**.
   - A critical path spanning multiple systems, where users would actually notice a full-stack break → **e2e tests**, kept to a small, high-value set.
   - Behavior that's exploratory, hard to specify in advance, or where you want a human's judgment on "does this feel right" (new UX, ambiguous edge cases, first pass on a redesign) → **manual/exploratory testing**, not scripted automation.
   - One risk item often needs coverage at more than one level (e.g., a discount calculation needs a unit test for the math AND an e2e smoke test that it's wired up correctly at checkout) — layer, don't pick just one.

4. **Decide where automation pays off vs. where it doesn't.** Automate when: the behavior is stable, will be exercised repeatedly (regression-prone area, runs every release), and the cost of a manual re-check compounds over time. Skip or defer automation when: the UI/flow is still churning, it's a one-off migration script, or it's exploratory work where a human's judgment can't be encoded as an assertion yet. Log a "test this manually for now, automate once stable" decision explicitly — don't let it default to silently untested.

5. **Define "done" for testing this feature.** Write down, before implementation finishes, what the exit bar is: which risk items must have automated coverage, which need only manual sign-off, what coverage percentage (if tracked) is the floor, and which failure classes (security, data loss) block release outright regardless of schedule.

6. **Get stakeholder agreement on the quality bar.** Share the risk ranking and the planned coverage with the PM/eng lead before building starts. If a PM says "test everything before Friday," respond with the ranked list and ask them to confirm the cut line — that's a five-minute conversation that prevents a mis-scoped rush job later.

7. **Revisit when scope changes.** A risk-based plan written against the original ticket goes stale the moment scope creeps. Re-score when new integrations, new edge cases, or new stakeholders show up mid-implementation.

## Techniques and Patterns

### Impact x Likelihood grid

| | Likelihood: Low | Likelihood: Medium | Likelihood: High |
|---|---|---|---|
| **Impact: High** | Automated regression + exploratory pass | Automated regression, prioritize first | Automated regression + contract test + manual exploratory before every release |
| **Impact: Medium** | Light manual spot-check | Automated integration test | Automated test, monitor in production |
| **Impact: Low** | Skip or backlog | Manual smoke test | Automate only if cheap |

Example: a "change password" flow (high impact — account takeover risk — medium likelihood since it's stable code) lands in "automated regression, prioritize first." A rarely-touched CSV export formatting tweak (low impact, low likelihood) can be a manual spot-check, not a new e2e suite.

### Healthy test pyramid vs. ice-cream cone

```
Healthy (pyramid)              Anti-pattern (ice-cream cone)
      ╱╲  e2e (few)                  ╱──────────────╲  e2e (many, slow, flaky)
     ╱──╲ integration                ╲──────────────╱  integration (some)
    ╱────╲ unit (most)                 ╲────────╱      unit (almost none)
```

An ice-cream cone happens when teams automate at the level that's easiest to demo (browser-driven e2e) instead of the level that matches the risk (often unit/integration). It produces a slow, flaky suite that still misses logic bugs because the logic itself was never tested in isolation.

### Signals the pyramid has inverted

Check these against the actual suite, not intuition:

- E2E test count is greater than (or close to) unit test count for the same codebase.
- CI feedback time for the full suite is dominated by browser/e2e stages (minutes to tens of minutes) rather than unit stages (seconds).
- The same business-logic bug gets "covered" only by re-running the full UI flow instead of by a fast unit test at the source of the logic.
- Flake-suppression tooling (auto-retries, quarantine lists) exists mainly to keep the e2e layer green, not the unit layer.

### When manual/exploratory testing beats automation

Automation has a build-and-maintenance cost that only pays off across repeated runs. Manual/exploratory testing is the better call when:

- The UI or flow is still actively churning (pre-stabilization design iterations) — an automated test written today may need a rewrite next sprint.
- The scenario requires human judgment that's hard to encode as an assertion (visual polish, tone of copy, "does this feel right").
- It's a one-off migration, data backfill, or admin task that won't recur.
- The cost of automating exceeds the total cost of manually re-checking it for the flow's realistic remaining lifetime (e.g., a feature slated for deprecation in a month).

Document the "manual for now" decision in the quality-bar template below so it reads as a deliberate choice, not a gap nobody noticed.

### Quality bar template (share with stakeholders)

```
Feature: <name>
Top 3 risks: <impact/likelihood ranked>
Must have automated coverage: <list>
Manual/exploratory only, for now: <list>
Explicitly out of scope for this release: <list>
Release-blocking failure classes: <e.g. auth bypass, data loss, payment miscalculation>
Agreed by: <PM/eng lead/QA, date>
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll automate everything so we don't have to think about priority" | Automating everything just moves the prioritization problem to "what do we automate first," and without a risk framework that's usually "whatever's easiest to script" — not what protects the business. |
| "100% coverage is the goal" | Coverage percentage measures lines executed, not risk retired. A suite can hit 100% and still miss the one path that corrupts data, while wasting effort on trivial getters. |
| "We don't have time to plan, let's just start writing tests" | An hour of risk scoring prevents days spent automating low-value flows while a high-risk path ships untested. Skipping planning is the slower path, not the faster one. |
| "The PM said test everything before Friday" | "Everything" is not a spec. Translate it into a ranked list and get the PM to confirm the cut line — that protects both the schedule and the PM from an unscoped promise they didn't mean literally. |
| "This flow is easy to script, so let's automate it first" | Ease of automation is not a proxy for value. Script the highest-risk item first even if it's harder; an easy-to-automate low-risk flow can wait or stay manual. |
| "It passed manual testing once, that's good enough forever" | One-time manual verification only proves the state at that moment. If the behavior is regression-prone, it needs automated coverage, not a memory of a demo that once worked. |
| "E2E tests give the most confidence, so let's write mostly those" | E2E tests confirm wiring, not logic correctness, and are the slowest and flakiest layer. High confidence per test written comes from unit/integration tests on the specific risk, not from the highest-level test available. |

## Red Flags

- E2E-heavy, inverted test pyramid (lots of full-stack browser tests, almost no unit tests)
- No risk ranking exists anywhere for the feature — every item was "just going to get tested the same way"
- The easiest-to-script, lowest-traffic flows got automated first while high-risk flows remain manual or untested
- "Quality bar" or exit criteria for testing was never actually reviewed with the PM/eng lead, just assumed by QA
- Test plan wasn't revisited after scope changed mid-implementation
- A production incident occurs in an area the risk assessment never flagged as untested, because no assessment was done
- Automation effort concentrated on cosmetic/low-impact areas because they demo well

## Verification

- [ ] A written risk ranking (impact x likelihood) exists for the feature/release, covering the behaviors actually touched
- [ ] Each risk item has an assigned test level (unit/integration/contract/component/e2e/manual), not a default "we'll e2e it"
- [ ] The test-level distribution roughly matches a pyramid (majority unit/integration, small e2e slice) — check actual test file counts per level, not intuition
- [ ] A "done for testing" definition was written down and shared before implementation completed, not inferred afterward
- [ ] The PM/eng lead explicitly confirmed the quality bar and cut line (a message, ticket comment, or doc — not an assumption)
- [ ] Any flow deliberately left manual/exploratory-only is logged as a decision, not an omission
