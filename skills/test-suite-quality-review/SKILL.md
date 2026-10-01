---
name: test-suite-quality-review
description: Guides reviewing the test suite itself as a review target — not just the production code it exercises — checking whether assertions are meaningful, tests are independent, names describe behavior, coverage reflects risk rather than raw percentage, and mocking hasn't replaced the real behavior under test. Use when reviewing a PR that adds or changes tests, auditing an existing suite for trustworthiness, investigating why a suite is "green" but production still breaks, or when a coverage number is being cited as proof of quality.
---

# Test Suite Quality Review

## Overview

A test suite is code, and it degrades like any other code — except its failure mode is worse, because a broken test still reports a passing build. Reviewing tests means asking not just "does this pass" but "would this actually fail if the behavior it claims to check broke." A green suite with no meaningful assertions is a false confidence generator, and it is more dangerous than no suite at all because it actively tells people not to worry.

## When to Use

- Reviewing any PR that adds, changes, or deletes tests
- Auditing an existing suite you've inherited or don't fully trust
- Investigating a production incident that the test suite didn't catch, to find out why
- Whenever someone cites a coverage percentage as evidence the code is well-tested
- Before relying on a suite as a safety net for a refactor or migration

**When NOT to use:** Deciding whether a new area of the codebase needs tests at all (that's risk scoping, see `test-strategy-and-risk-based-planning`) or trimming duplicate/overlapping tests across levels (see `test-suite-simplification-and-dedup`). This skill is about the trustworthiness of tests that already exist or are being proposed.

## Core Process

1. **Read the assertion, not the test name.** For every test, find the actual assertion(s) and ask: if the production code under test were subtly wrong, would this specific assertion fail? A test that calls a function and only checks `expect(result).toBeDefined()` or that no exception was thrown proves the code ran, not that it produced a correct result.

2. **Check what happens when you break the code on purpose.** For tests you're unsure about, mentally (or actually) mutate the implementation — flip a comparison operator, off-by-one an index, swap a variable — and ask whether the test would catch it. If you can't confidently answer, the test isn't verified as meaningful; go run the mutation.

3. **Verify test independence.** Confirm each test can run alone and in any order. Look for shared mutable state (module-level variables, a database row created by test A and read by test B, a singleton reset relied upon implicitly), and for setup/teardown that only works because of ordering baked into file position.

4. **Evaluate names against behavior, not implementation.** A good test name describes a scenario and expected outcome (`rejectsWithdrawalWhenBalanceIsInsufficient`), not an internal detail (`testMethod2`) or a vague claim (`worksCorrectly`, `handlesEdgeCase`). If you can't tell what broke from the test name in a CI failure list, the name has failed its job.

5. **Look at what's mocked and why.** For each mock/stub/fake, ask what real behavior it's standing in for and whether the test still exercises anything real. A test that mocks the database, the HTTP client, and the business logic's own collaborator has often reduced itself to asserting that a mock returns what you told it to return.

6. **Weigh coverage against risk, not against a percentage target.** Cross-reference covered lines/branches against the risk ranking (see `test-strategy-and-risk-based-planning`) for this area. High-risk paths (auth, payments, data mutation) need scrutiny of *what* is asserted, not just whether the line executed. A 60% suite that covers every critical path meaningfully beats a 95% suite padded with getter/setter tests.

7. **Flag, don't silently fix, and don't just delete.** When a test fails the meaningfulness check, report it with the specific defect it would miss. Fixing it requires understanding the intended behavior — guessing at an assertion can bake in a wrong invariant just as easily as no assertion at all.

## Techniques and Patterns

### The mutation gut-check

Pick a handful of the highest-risk tests and actually run a mutation testing tool (e.g. Stryker, PIT, mutmut) against the module they cover, or hand-mutate the code for five minutes. A test suite with high line coverage but a low mutation-kill rate is measuring execution, not correctness — that gap is the real signal, more useful than the coverage number alone.

### Assertion strength ladder (weakest to strongest)

| Level | Example | Verdict |
|---|---|---|
| No assertion | Test calls the function, nothing checked | Not a test — delete or fix |
| Existence-only | `expect(result).toBeDefined()` / `assert result is not None` | Usually too weak — proves it ran, not that it's right |
| Type/shape-only | `expect(Array.isArray(result)).toBe(true)` | Weak unless shape is genuinely the risk |
| Exact value | `expect(result).toEqual({status: 'declined', reason: 'insufficient_funds'})` | Strong — pins the actual behavior |
| Exact value + side effect | Above, plus `expect(ledger.entries).toHaveLength(0)` | Strongest — checks outcome and non-outcome |

### Naming pattern that survives a failure list

```
<action_or_state>_<condition>_<expected_outcome>
withdraw_whenBalanceInsufficient_rejectsWithReason
login_afterThreeFailedAttempts_locksAccount
```
A CI failure list of these names tells a reader what broke without opening a single file. Compare to `test1`, `test2`, `worksCorrectly` — these require opening the test body just to know what's under test, every single time.

### Over-mocking smell test

If removing every mock from a test would require standing up more than one real collaborator to make it pass, ask whether the test belongs at a different level (a real integration test) instead of being a heavily-mocked unit test that only proves the mocks were wired up as configured.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Coverage is at 90%, we're good" | Coverage percentage counts executed lines, not verified outcomes. It says nothing about assertion strength and nothing about whether the 10% gap is trivial code or the payment path. |
| "The test passes, don't touch it, it's not our problem" | A passing test with no real assertion isn't protecting anyone; it's a liability disguised as safety. Reviewing it is exactly the job when you're touching the code it claims to cover. |
| "It has an assert in it somewhere, that counts" | An assertion that can't fail under a real defect (`assert(true)`, checking only that no exception was thrown) is decoration, not verification. Count meaningful assertions, not assertion syntax. |
| "It's mocked, so it's fast and isolated — that's good practice" | Isolation is a means, not the goal. If mocking every collaborator means the test only checks that mocks return their configured values, it has stopped testing the unit's real behavior. |
| "We'll add better assertions later, this at least proves it doesn't crash" | "Doesn't crash" tests rarely get revisited, and they actively suppress the signal that would prompt someone to add real coverage — they make the gap invisible. |
| "The name doesn't matter, we'll just click into the failure" | At scale, nobody opens every failing test file during a large CI run. Vague names slow down triage exactly when speed matters most — during an incident or a red build. |

## Red Flags

- Tests with no meaningful assertion, or an assertion that can never fail (`assert(true)`, `expect(1).toBe(1)`)
- Coverage percentage cited as the sole quality gate in CI, with no assertion-strength or mutation signal alongside it
- A test suite where deleting the production logic's core branch and re-running still passes
- Test names like `test1`, `test2`, `testFoo`, `worksCorrectly`, `handlesEdgeCase`
- Tests that pass or fail differently depending on execution order or which tests ran before them
- A unit test with more mock setup lines than actual assertion or exercised logic lines
- A production incident in a path that had "coverage" per the report, but no test would have caught the actual defect

## Verification

- [ ] A sample of reviewed tests were mutation-tested (tool-based or manual) and shown to fail when the underlying logic is broken
- [ ] Every test in scope was run in isolation and in reverse order at least once, with identical results
- [ ] Test names were checked against a CI failure list and are legible without opening the file
- [ ] Coverage numbers for this change were cross-referenced against the risk ranking for the touched area, not accepted at face value
- [ ] Any mock was justified against what real behavior it replaces, and the test level (unit vs. integration) was confirmed appropriate
- [ ] Every flagged weak-assertion or order-dependent test has a linked follow-up (ticket or immediate fix), not a silent pass
