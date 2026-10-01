---
name: test-suite-migration-and-deprecation
description: Guides migrating test frameworks or tools (e.g. Selenium to Playwright, Enzyme to React Testing Library, JMeter to k6) incrementally without losing coverage mid-migration — running old and new suites in parallel during the transition, tracking coverage parity explicitly, and retiring the old suite only once parity is proven. Use when adopting a new test framework/tool, when an old suite is aging or being deprecated, when someone proposes a big-bang rewrite of the entire suite in one sprint, or when old and new suites have both been left partially disabled for an extended period.
---

# Test Suite Migration and Deprecation

## Overview

A test framework migration fails silently when coverage quietly drops between "the old suite still exists" and "the new suite fully replaces it." The safe path is incremental and boring: run both suites in parallel, prove the new one covers what the old one covered, and only then retire the old one — never freeze the old suite mid-rewrite, and never delete it on the assumption that the new suite is obviously equivalent.

## When to Use

- Adopting a new test framework or tool and planning how to move existing coverage over
- An old test suite/tool is being deprecated (end-of-life, unsupported, org standardizing on something else)
- Someone proposes freezing the old suite and rewriting everything in one sprint or release
- Old and new suites have both been left partially disabled "temporarily" for an extended, undefined period
- Deciding whether it's safe to delete the old suite yet

**When NOT to use:** Reducing duplication between test levels within a single, already-stable framework (that's `test-suite-simplification-and-dedup`) or judging whether individual tests are well-written (that's `test-suite-quality-review`). This skill is specifically about the transition period between two different tools/frameworks covering the same behavior.

## Core Process

1. **Inventory what the old suite actually covers before writing a single new test.** Extract a concrete list: test count, which behaviors/scenarios each covers, and — where available — which risk areas (from the risk-based plan) they map to. This inventory is the parity target; without it, "the new suite covers everything" is an unverifiable claim.

2. **Migrate incrementally, by module or risk area, not all at once.** Pick a bounded slice (one feature area, one page, one service), port its tests to the new framework, and validate that slice before moving to the next. A slice-by-slice migration keeps the blast radius of any migration mistake small and keeps both suites shippable throughout.

3. **Run old and new suites in parallel during the transition window.** For any behavior with tests in both frameworks, both must run in CI and both must gate merges until the new version is proven equivalent. This costs extra CI time temporarily — that cost is the price of never having a coverage gap, and it's bounded because the window is time-boxed per slice, not indefinite.

4. **Track coverage parity explicitly, per migrated slice.** For each behavior migrated, confirm the new test asserts the same outcome the old one did (not just "a test with a similar name exists"). Use the same assertion-strength check from `test-suite-quality-review` — a superficially similar new test that asserts less than the old one is a silent regression in disguise.

5. **Only retire an old test after its replacement has run clean for a meaningful window.** "Clean" means passing consistently (not just once) in production-like conditions — a handful of CI runs across several days/merges, not a single green run right after porting. Define this window explicitly (e.g. two weeks or N merges) rather than leaving it to judgment in the moment.

6. **Delete retired tests and infrastructure outright — don't leave them skipped.** Once parity is proven and the retirement window has passed, remove the old test files, old framework config, and old CI stage entirely. A permanently-skipped old suite left "just in case" is dead weight that still needs maintaining (config, dependency updates) without providing any signal.

7. **Track migration progress visibly, with a defined end state.** Maintain a running tally (old suite test count remaining vs. migrated) visible to the team, with a target completion date. An open-ended migration with no visible progress tracker tends to stall indefinitely with both suites half-disabled.

## Techniques and Patterns

### Parity tracking table (living document during migration)

| Old suite test (framework A) | Behavior covered | New suite test (framework B) | Parity confirmed | Old test retired |
|---|---|---|---|---|
| `test_login_invalid_password.py` (Selenium) | Login rejects wrong password with error message | `login.spec.ts` — `rejects invalid password` (Playwright) | Yes — 2026-09-10, ran clean 12 consecutive CI runs | Yes — 2026-09-24 |
| `test_checkout_discount.py` (Selenium) | Discount code applies correct total | `checkout.spec.ts` — `applies discount` (Playwright) | Pending — new test only asserts UI text shows a discount, not the exact total; gap flagged | No — keep old test active |

A row only moves to "retired" after the parity column is explicitly confirmed, not merely "a test with a similar name was written."

### Parallel-run CI wiring during transition

```yaml
stages:
  - unit_tests
  - integration_tests
  - e2e_tests_legacy_selenium     # still gates merge until its slice is retired
  - e2e_tests_new_playwright      # gates merge from day one of migration
```
Both stages block merge throughout the transition. Remove `e2e_tests_legacy_selenium` from the pipeline only after every test it contained has been individually confirmed retired per the parity table — not by disabling the whole stage at once "since most of it moved."

### Slice-by-slice migration order

Prioritize by risk, same lens as `test-strategy-and-risk-based-planning`: migrate the highest-risk, most-stable areas first (proves the new framework's patterns work under real conditions) before tackling the flakiest or most complex legacy tests last, when the team has the most experience with the new tool.

### Retirement window guardrail

```
Migrated slice: checkout flow
New suite first green run: 2026-09-10
Retirement window: 14 days OR 20 merges to main, whichever is longer
Old suite for this slice removed: 2026-09-24 (after 16 clean days, 27 merges)
```
Codifying the window as a number (days or merge count) prevents "it looked fine so I deleted it the next day" as well as "we never got around to deleting it" from both being the default outcome.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Let's freeze the old suite and rewrite everything in one sprint" | Freezing the old suite means no regression protection for anything not yet ported, for the entire freeze duration — the exact window when the codebase is least protected because a large rewrite is also in flight. |
| "We'll delete the old tests once the new ones exist" | "The new ones exist" is not the same as "the new ones assert the same thing." Deleting on existence alone, without a parity check, is how assertion strength quietly degrades during a migration. |
| "The new framework is obviously better, we don't need to prove parity" | The framework's quality doesn't guarantee the ported test asserts the same behavior — a rushed port can easily assert less (or nothing) even in a strictly better framework. Parity is about the test, not the tool. |
| "Running both suites is wasteful, let's just cut over" | The overlap cost is temporary and bounded (per slice, until parity is proven); a coverage gap from cutting over early is unbounded and often invisible until a regression ships. |
| "It's been skipped for months, but we'll get back to finishing the migration" | An indefinitely half-migrated state with parts of both suites disabled is the exact failure mode this skill exists to prevent — it needs a visible tracker and a target date, not open-ended patience. |
| "The new suite has more tests than the old one, so we're definitely covered" | Test count is not a parity proxy — the new suite could have more tests while missing the one specific edge case the old suite's fewer, sharper tests actually caught. |

## Red Flags

- A coverage gap opens during migration (a behavior tested in the old suite has no equivalent in the new one) with nobody tracking it
- Both old and new suites partially disabled "temporarily," for a period with no defined end date
- The old suite was deleted before the new suite ran clean in production-like conditions for a defined, meaningful window
- Parity between an old and new test was assumed from similar naming or file structure, never actually checked against assertions
- Migration progress has no visible tracker — nobody can currently state how much of the old suite remains
- A "big bang" cutover plan exists with no incremental, per-slice validation step before the full switch
- CI only runs the new suite for a migrated area while the old suite's stage was disabled wholesale rather than per confirmed-retired test

## Verification

- [ ] A parity-tracking artifact (table, ticket, or dashboard) exists mapping every old-suite test to its new-suite replacement and a parity-confirmed status
- [ ] Old and new suites both ran and both gated merges in CI for every slice currently mid-migration
- [ ] Each retired old test has evidence of its replacement running clean for the agreed window (specific run count or day count, not "it looked fine")
- [ ] No old test was deleted without an explicit parity confirmation recorded against it
- [ ] Migration progress (tests remaining vs. migrated) is visible to the team with a target completion date
- [ ] Old framework's CI stage, config, and dependencies were fully removed only after every test within it was individually confirmed retired
