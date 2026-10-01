---
name: test-automation-framework-selection
description: Guides agents through choosing automation tooling for web UI, API, and mobile test suites using a weighted decision framework instead of trend-following. Use when starting a new automation suite, evaluating a framework migration, or when a team is about to adopt a tool because it is popular rather than because it fits the stack.
---

# Test Automation Framework Selection

## Overview

Framework choice is a multi-year commitment: it locks in CI wiring, debugging workflow, hiring pool, and the shape of every test written afterward. This skill gives a repeatable decision process — weighted against the team's actual constraints — instead of "pick whatever's trending" or "it doesn't matter, just choose one."

## When to Use

- Starting automation for a new application or a layer (UI, API, mobile) that has none yet.
- A team proposes migrating from one framework to another (e.g., Selenium to Playwright).
- Two teams in the same org have independently adopted different tools for the same job and someone has to reconcile it.
- NOT for: swapping a test runner/assertion library within an already-chosen framework (that's a refactor, not a selection decision) or picking a load-testing tool (see performance-and-load-testing).

## The Decision Process

1. **Inventory the actual testing surface.** List what needs coverage: browsers (which versions, real device vs headless), API protocols (REST/GraphQL/gRPC), mobile platforms (iOS/Android, native/hybrid/React Native). A framework evaluated against a surface you don't have is theater.
2. **Score candidates against weighted criteria** (see table below), not a single axis like "fastest" or "most popular." Weight the criteria yourself — a team with no in-house JS expertise should weight "language/stack fit" heavily; a team gating releases on a device farm should weight "CI integration maturity" heavily.
3. **Run a spike against the real app**, not a tutorial to-do app. Automate 3-5 of the gnarliest existing flows (auth redirect, a modal with animation, a file upload, a paginated table) in each finalist framework. Trend-driven adoption skips this step and discovers the gaps in production.
4. **Check debugging and failure-triage tooling** during the spike: can you get a trace/video/DOM snapshot on failure without extra plumbing? This determines day-to-day triage cost far more than raw execution speed.
5. **Decide the migration boundary before writing the ADR.** If replacing an existing framework, define what triggers deletion of the old suite (e.g., "old framework removed once flow X, Y, Z are ported and green for 2 weeks"), not an open-ended parallel run.
6. **Write the decision down** (ADR or equivalent) with the scored comparison table and the spike results attached, so the next person who wants to relitigate it sees the actual constraints considered.

## Comparison Structure

Score each candidate 1-5 per criterion against your own weights — the table below is the shape, not verdict:

| Criterion | Playwright | Cypress | Selenium/WebdriverIO |
|---|---|---|---|
| Cross-browser coverage (real WebKit/Firefox, not just Chromium) | Native multi-browser | Chromium-first, WebKit/Firefox experimental | Broadest, via WebDriver protocol |
| Parallelization | Built-in sharding | Requires paid/3rd-party orchestration for scale | Depends on grid setup |
| Flakiness profile of the tool itself | Auto-waiting, low false failures | Auto-waiting, occasional iframe/cross-origin friction | Manual waits common; most flake reports trace here |
| Language/stack fit | JS/TS/Python/.NET/Java | JS/TS only | Nearly any language via bindings |
| CI integration maturity | Mature, first-class trace artifacts | Mature, dashboard product available | Mature but more assembly required |
| Debugging/trace tooling | Trace viewer, video, step timeline | Time-travel debugger in runner | Varies by grid/vendor |
| Community/maintenance cost | Actively growing | Large, stable | Largest, slowing on new features |

For API: REST Assured (Java-idiomatic, fits JVM stacks), Supertest (Node, fits JS backends, fast/no network hop needed for in-process apps), Postman/Newman (good for exploratory + handoff to non-engineers, weaker as a first-class code-reviewed test suite). Score the same way: language fit, CI maturity, and whether the tool encourages schema assertions or just status-code checks (see api-contract-test-automation).

For mobile: Appium (cross-platform, WebDriver-based, higher setup cost), Espresso (Android-native, fast, in-process, no cross-platform reuse), XCUITest (iOS-native, same tradeoff), Detox (React Native, gray-box, fast and less flaky for RN apps specifically). The right axis here is almost always "what is the app written in," not general popularity — see mobile-test-automation for the fragmentation and device-farm tradeoffs once a tool is chosen.

## Worked Example: Weighting the Criteria

Weights are not universal — they should reflect the specific team's constraints, not a generic best-practice ranking:

- **A team with a Java backend and a Selenium grid already running in CI** should weight "language/stack fit" and "sunk CI infrastructure cost" heavily. Migrating to Playwright purely for a nicer trace viewer may not clear the bar once grid re-plumbing cost is counted.
- **A team shipping a component library with hundreds of visual states** should weight "debugging/trace tooling" and "parallelization" heavily, since suite size and iteration speed dominate day-to-day cost more than raw cross-browser breadth.
- **A team whose app embeds several cross-origin iframes (payment widgets, SSO redirects)** should weight "flakiness profile of the tool itself" heavily and run the spike specifically against those iframe flows — this is where WebDriver-based tools and Cypress historically diverge most from Playwright's out-of-process browser control.
- **A team with mixed language backgrounds (some Python, some JS) evaluating API tooling** should weight "language/stack fit" over raw feature set — a REST Assured suite maintained only by the one Java speaker on a Python team becomes an availability bottleneck, independent of how good the tool is.

Document the weights themselves in the ADR, not just the resulting scores — the weights are what future maintainers need to sanity-check if the team's constraints change (e.g., the team later hires JS engineers, or drops the device farm budget).

## Running the Spike Without Fooling Yourself

A spike only produces real signal if it's structured to fail the same way production would:

- Time-box it (2-3 days per finalist, not open-ended) so the comparison happens under similar effort per candidate.
- Include at least one flow that's currently a known pain point in the existing suite (if one exists) — a spike that only automates easy flows won't surface the tool's weaknesses.
- Run the spike's tests in the team's actual CI environment, not just locally — a tool that's fast and stable on a laptop can behave very differently under container resource limits or a shared CI runner.
- Have more than one engineer run the spike independently where possible; a single person's fluency with a tool they already know biases the "ease of use" read.
- Capture concrete numbers: setup time, lines of code for equivalent coverage, flake rate over N repeated runs, and time-to-diagnose for an intentionally broken test — not just a gut-feel writeup.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Let's use whatever framework is trending on Twitter/HN this month" | Trend signal reflects hype cycles and marketing, not fit with your CI system, your app's rendering quirks, or your team's existing language skills. A framework with great buzz and no spike against your actual login flow is a bet, not a decision. |
| "Let's rewrite everything in the new hotness framework because it's newer" | Newer is not automatically less flaky or faster to maintain — it's usually less battle-tested against your specific edge cases (iframes, shadow DOM, native dialogs). A rewrite without a defined migration boundary produces two suites running forever, doubling maintenance cost with no coverage gain. |
| "The framework doesn't matter, just pick one and move on" | The framework determines debugging cost, parallelization ceiling, and hiring pool for years. An hour spent scoring against real constraints is cheaper than migrating 400 tests eighteen months in. |
| "It worked in the tutorial, so it'll work on our app" | Tutorials use a to-do app with no auth redirects, animations, iframes, or third-party widgets. The spike must run against the team's actual gnarly flows or it isn't evidence. |
| "We already bought a license for it, so we should standardize on it everywhere" | Sunk cost in a vendor contract is a real input to the weighted score, not a veto over it — a device farm license for mobile doesn't justify forcing an unrelated API-testing team onto the same vendor's weaker API tooling. Score each layer (UI/API/mobile) on its own criteria. |
| "Our competitors use this framework, so it must be the right choice" | A competitor's stack reflects their team's history and constraints, not yours — their language mix, CI provider, and app architecture are invisible from the outside, and copying their tool choice without their context reproduces none of their fit. |

## Red Flags

- Two or more frameworks doing the same job (e.g., Cypress and Playwright both testing web UI) with no written migration plan or deletion trigger for the old one.
- A framework adopted org-wide with no spike/proof-of-concept run against the team's actual application first.
- The decision record for a framework choice cites a single blog post or conference talk rather than the team's own scored criteria.
- New test files keep getting added to the "old" framework months after a migration was announced.
- CI pipeline has two separate test-runner configurations for the same test layer with no consolidation date.
- A framework choice was made in a single meeting with no spike, justified by "everyone already knows it's the best one."
- The spike results were verbal/anecdotal ("it felt faster") with no captured setup time, flake rate, or lines-of-code comparison.
- A migration has been "in progress" for more than two quarters with no shrinking count of remaining old-framework tests.

## Verification

- [ ] A written comparison exists (ADR, doc, or ticket) scoring finalists against the team's own weighted criteria, not just narrative preference.
- [ ] A spike was run against at least 3 real flows from the actual application, with results (pass/fail, setup time, flake count) recorded.
- [ ] The spike included at least one flow that is a known pain point (iframe, animation, cross-origin redirect) rather than only straightforward flows.
- [ ] If this is a migration, a concrete deletion trigger for the old framework is written down and owned by someone.
- [ ] CI pipeline shows exactly one framework per test layer (UI, API, mobile) in steady state, or a dated end state for any temporary overlap.
- [ ] The weights used to score candidates are documented alongside the scores, so they can be revisited if team constraints change.
