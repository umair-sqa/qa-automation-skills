---
name: test-suite-simplification-and-dedup
description: Guides reducing duplication and overlap in a test suite — the same behavior verified at multiple test levels with no added value, near-duplicate cases differing only in trivial input, and tests left skipped indefinitely instead of deleted — to cut suite runtime and maintenance cost without losing real coverage. Use when suite runtime is growing faster than the codebase, when a change requires updating the same assertion in three different test files, when reviewing a backlog of skipped/disabled tests, or when planning to collapse redundant e2e journeys into fewer comprehensive ones.
---

# Test Suite Simplification and Deduplication

## Overview

Tests accumulate faster than they get removed, because adding a test feels safe and deleting one feels risky. The result is suites that re-verify the same business rule at three levels, keep dozens of `skip()`-marked tests "for later," and grow runtime faster than the product itself. Simplification is not about testing less — it's about removing coverage that adds zero incremental confidence so the coverage that remains is faster to run and easier to trust.

## When to Use

- Suite runtime has grown noticeably faster than the codebase or test count would explain
- The same business rule needs its assertion updated in more than one place for one behavior change
- A backlog of skipped/disabled tests exists and nobody remembers why
- Planning to consolidate e2e journeys, or push detail-level coverage down to unit tests
- Reviewing near-identical test cases that differ only in one input value

**When NOT to use:** Judging whether existing tests are individually trustworthy (weak assertions, bad mocking) — that's `test-suite-quality-review`. This skill assumes the tests pass and are individually sound, and asks whether the *set* of them is doing more work than it needs to.

## Core Process

1. **Map behavior to test level, not test to test.** For each business rule or code path, list every test (across unit, integration, e2e) that touches it. If the same rule is asserted identically at two or three levels with no additional risk covered at the outer levels (no new integration boundary, no new UI wiring), the outer-level test is a duplicate wearing a different framework.

2. **Ask what the outer-level test adds.** An e2e test re-asserting exact discount math that's already unit-tested adds nothing unless it's specifically checking that the number is *wired up correctly* end-to-end. Rewrite it to assert wiring (the discount shows up, in the right place, in the right format) and let the unit test own the math.

3. **Consolidate near-duplicate cases into parameterized tests.** When multiple test functions differ only in one input/output pair and share every other line, replace them with a single parameterized/table-driven test. This is not "fewer tests" for its own sake — it reduces maintenance surface (one assertion to update) while keeping every case.

4. **Audit every `skip()`/`disabled`/`pending` test.** For each one, require a linked ticket, an owner, and a target date. If none exists, the test has become dead weight pretending to be a to-do item. Decide now: fix it, or delete it. A skip with no path back to green is a lie about future intent.

5. **Delete obsolete tests outright — don't let them linger skipped.** If the behavior no longer exists, the test asserting it is not "paused," it's obsolete. Remove it from the suite (source control still has the history if it's ever needed) rather than leaving a permanently-red or permanently-skipped placeholder.

6. **Collapse redundant e2e journeys.** If five separate e2e tests each walk the same login → navigate → action funnel just to check five different terminal actions, merge them into fewer journeys that each combine multiple assertions along one comprehensive path, and push the isolated logic checks down to unit/integration level.

7. **Re-baseline and track the delta.** After consolidation, record suite runtime and test count before/after, and confirm (via the coverage/mutation signal from `test-suite-quality-review`) that no risk item lost its only assertion in the process. Deduplication that silently drops the one place a rule was checked is a regression, not a cleanup.

## Techniques and Patterns

### Same rule, three levels — before and after

```
Before:
  unit:        calculateDiscount(order) === expected              # verifies math
  integration: POST /checkout applies discount to total            # verifies math again, same cases
  e2e:         UI shows discounted total at checkout                # verifies math a third time

After:
  unit:        calculateDiscount(order) === expected, all edge cases (parameterized)
  integration: POST /checkout total reflects calculateDiscount() output (one representative case, checks wiring)
  e2e:         one checkout journey asserts discounted total displays correctly (wiring + UI, one case)
```
Each level now checks something the level below it can't: the unit test owns correctness of the math, integration owns the math being invoked and applied, e2e owns the number reaching the screen.

### Parameterization instead of copy-paste cases

```python
# Before: four near-identical functions
def test_discount_10_percent(): assert discount(100, 0.10) == 90
def test_discount_25_percent(): assert discount(100, 0.25) == 75
def test_discount_0_percent(): assert discount(100, 0.0) == 100
def test_discount_100_percent(): assert discount(100, 1.0) == 0

# After: one parameterized test, same coverage, one place to maintain
@pytest.mark.parametrize("rate,expected", [(0.10, 90), (0.25, 75), (0.0, 100), (1.0, 0)])
def test_discount_applies_rate(rate, expected):
    assert discount(100, rate) == expected
```

### Skip registry (make "temporary" auditable)

Require every skip to carry structured metadata, enforced by lint/CI grep if possible:
```
@skip(reason="flaky pending API-1234 fix", owner="qa-team", expires="2026-11-01")
```
A CI job that fails the build when `expires` has passed turns "we'll come back to it" into an actual forcing function instead of an indefinite hiding place.

### Runtime-vs-codebase growth check

Track suite runtime and LOC/feature-count over releases. If suite runtime is growing at a materially higher rate than the codebase, that's a leading indicator of duplication accumulating faster than it's being pruned — investigate before it becomes a multi-hour suite.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Let's keep the old test too, just in case — it can't hurt" | It does hurt: it doubles maintenance on every future behavior change, adds runtime, and gives false comfort that more tests mean more safety when they verify nothing new. |
| "Skip it for now, we'll come back to it" | Without an owner and expiry, "for now" becomes years. A skip with no forcing function is a permanent gap disguised as a temporary one. |
| "More tests is always better, even if they overlap" | Overlapping tests raise the cost of every future refactor (more places to update the same assertion) without raising the cost of a real regression slipping through — that trade is net negative. |
| "The e2e test is more realistic, so let's keep it even though the unit test covers the same case" | Keep the e2e test if it verifies something the unit test can't (real wiring, real UI, real cross-service call) — not as a slower, flakier rerun of the same math. |
| "We can't delete this test, we don't know why it exists" | Not knowing why a test exists is a reason to investigate and document, not a reason to keep an unverified, possibly-obsolete assertion running forever. |
| "Parameterizing will make failures harder to read" | A well-labeled parameterized failure (case name/index in the output) is easier to triage than four near-identical function names that require diffing to find what's different. |

## Red Flags

- A skipped test with no linked ticket, no owner, and no expiry date
- The same business rule asserted at three test levels with no additional risk covered at the outer levels
- Suite runtime growing faster release-over-release than the codebase or feature count
- Near-identical test cases differing only in one input value, copy-pasted rather than parameterized
- E2E suite contains multiple journeys that share the same setup path and differ only in the final assertion
- Tests deleted before confirming the risk they covered still has an assertion somewhere else
- A "cleanup" PR that reduces test count but also reduces mutation-kill rate or risk coverage

## Verification

- [ ] Every consolidated or removed test's covered risk was confirmed still asserted somewhere in the suite (cross-checked against the risk ranking, not assumed)
- [ ] Every remaining skip/disabled test has an owner, a linked ticket, and an expiry date enforced in CI or a tracked backlog
- [ ] Near-duplicate cases were converted to parameterized tests with the same case coverage as before
- [ ] Suite runtime and test count were measured before and after, with the delta recorded
- [ ] Collapsed e2e journeys were shown to still exercise every distinct terminal action they replaced
- [ ] No obsolete test was left skipped "temporarily" — it was deleted or given an active fix path
