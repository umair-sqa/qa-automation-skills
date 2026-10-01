---
name: flaky-test-diagnosis-and-triage
description: Guides agents through root-causing flaky tests instead of masking them with retries, longer timeouts, or permanent skips. Covers the common root-cause categories (race conditions, shared state, environment variability, timing-dependent UI, non-deterministic data), a reproduce-bisect-classify-decide triage process, and tracking flake rate as a first-class metric. Use when a test fails intermittently, a suite has a growing retry/skip list, CI is dismissed as "just flaky," or before adding a retry wrapper to any test.
---

# Flaky Test Diagnosis and Triage

## Overview

A flaky test is one that passes and fails against the same code with no relevant change — it is a symptom of a real defect (in the test, the app, or the environment), not noise to be silenced. This skill treats every flake as a bug report and provides a repeatable process to find the actual cause, decide fix-vs-quarantine, and prevent the quarantine list from becoming a permanent graveyard.

## When to Use

- A test fails intermittently in CI or locally with no corresponding code change.
- A test passes on rerun without any fix being applied.
- Someone proposes adding `retry(N)`, bumping a timeout, or `@skip`/`.only` to make a failure go away.
- A quarantine or "known flaky" list exists and needs periodic review.
- Setting up flake-rate tracking for a suite that doesn't have it yet.

**Do not use this skill's shortcuts for:** a test that fails 100% of the time (that's a regular bug, not a flake) or a test that only ever failed once with a clear one-off external cause (e.g., a documented cloud provider outage) — log it, but a single occurrence doesn't yet justify a full bisection.

## Root Cause Categories

Classify every flake into one of these before attempting a fix. The category determines the fix pattern.

1. **Race conditions between async operations and assertions.** The test asserts before an async operation (network call, animation, promise, event loop tick) has resolved. Symptom: fails more often under load or on slower CI runners, passes reliably when stepped through in a debugger.
2. **Shared mutable state / test-order dependency.** Test A leaves global state, a database row, a singleton, or a mocked module in a condition that Test B depends on or is broken by. Symptom: fails only when run in a specific order or in parallel, passes when run in isolation.
3. **Environment and network variability.** DNS latency, third-party API rate limits, container cold starts, CI runner resource contention. Symptom: fails in CI but never locally, or fails in bursts correlated with infra incidents.
4. **Animation/timing-dependent UI.** Fixed `sleep(500)` waits, CSS transitions, debounced inputs, or lazy-loaded elements that resolve at variable speed. Symptom: fails more on slower machines or headless-vs-headed runs.
5. **Test pollution from prior test's leftover state.** Unclosed database transactions, un-reset feature flags, leaked timers/intervals, uncleared local storage or cookies. Symptom: fails only in full-suite runs, never when run standalone.
6. **Non-deterministic data.** Assertions against `Date.now()`, `Math.random()`, auto-incrementing IDs, or unseeded test data generators. Symptom: fails near time boundaries (midnight, month-end) or fails once in N runs with no pattern tied to load.

## The Triage Process

1. **Reproduce reliably before touching anything.** Run the test N times (start with 20-50) locally and in CI, both in isolation and as part of the full suite. Record the failure rate as a fraction (e.g., "6/50 locally, 14/50 in CI, 0/50 in isolation"). A flake you can't reproduce at some nonzero rate can't be confirmed fixed either — don't skip this step even under deadline pressure.
2. **Bisect what changed.** If the flake is new, check the diff between the last known-good run and the first flaky one — dependency bumps, CI runner image changes, new parallelism settings, or a merged PR that altered shared fixtures are common triggers. If the flake is old, check whether failure rate correlates with load (parallel workers), time of day (batch jobs, cron-triggered data resets), or specific test order.
3. **Classify the root cause** into one of the six categories above using the reproduction data — isolation-only failures point to pollution/order dependency, load-correlated failures point to races or environment variability, machine-speed-correlated failures point to timing-dependent UI.
4. **Decide fix vs. quarantine.**
   - **Fix now** if the root cause is identified and the fix is scoped (add a proper wait condition, isolate shared state, seed random data) — this is the default and should be true for the large majority of flakes.
   - **Quarantine** only when the fix requires cross-team coordination, a larger refactor, or infrastructure change that can't land immediately. Quarantine is a holding pattern, not a resolution.
5. **If quarantining, attach an owner and an SLA.** A quarantined test gets: a ticket, a named owner, a re-review date (typically 1-2 sprints out), and it still runs (reported separately, not blocking) rather than being silently skipped — silent skips lose coverage without anyone noticing.
6. **Verify the fix against the same reproduction protocol used in step 1.** Rerun N times in the same conditions (isolation, full suite, CI) that originally surfaced the flake. A fix that isn't re-verified at the same N is an assumption, not a fix.
7. **Record the flake in the flake-rate metric** (see below) regardless of outcome, so the fix's effect is visible in the trend, not just anecdotally believed.

## Techniques and Patterns

**Reproducing race conditions:** run the suspect test with an artificially throttled network (browser devtools network throttling, `tc netem`, or a proxy like Toxiproxy) and increased CPU contention (run other CPU-heavy processes alongside, or use CI's smallest runner tier) to widen the race window and make the failure reproduce faster than waiting for natural variance.

**Fixing race conditions:** replace fixed sleeps with explicit condition waits — poll/wait for a specific DOM state, network idle, or event, not a duration:

```js
// Flaky: race between navigation and assertion
await page.click('#submit');
await sleep(1000);
expect(page.locator('.success-toast')).toBeVisible();

// Fixed: wait for the actual condition
await page.click('#submit');
await page.locator('.success-toast').waitFor({ state: 'visible' });
```

**Isolating test-order dependency:** run the suite in reverse order and in randomized order (most modern runners support a `--random` or `--shuffle` seed flag) as a standing CI job, separate from the normal deterministic run. A test that only fails under shuffled order has a pollution bug, full stop.

**Handling non-deterministic data:** freeze time in tests that assert against dates (`sinon.useFakeTimers()`, `jest.setSystemTime()`), and seed random/UUID generators so failures are reproducible byte-for-byte instead of "sometimes."

**Flake-rate tracking:** track, per test and per suite, over a rolling window (e.g., trailing 14 days):

| Metric | Why it matters |
|---|---|
| Flake rate (failures / total runs, on unchanged code) | Distinguishes real flakiness from one-off incidents |
| Time-to-fix (flake first seen → root cause fixed) | Surfaces flakes rotting in the quarantine list |
| Quarantine list size over time | A monotonically growing list means intake > resolution |
| Retry count trend per test | A climbing retry count is a fix being deferred, not applied |

**Quarantine record template (the minimum fields a quarantined test needs):**

```
Test: checkout.spec.ts > "shows order confirmation after payment"
Quarantined: 2026-09-10
Suspected category: race condition (async payment webhook vs. UI poll)
Reproduction rate at time of quarantine: 9/50 in CI, 0/50 local
Ticket: QA-4821
Owner: @payments-team
Re-review date: 2026-09-24 (sprint boundary)
Reporting: still runs in CI, results posted to #flaky-tests channel,
           does not block merge until re-review
```

A quarantine entry missing any of the ticket, owner, or re-review date fields is not a quarantine — it's an unmanaged skip, and unmanaged skips are how coverage quietly disappears.

**Distinguishing "flaky" from "actually broken but intermittent for a real reason":** not every intermittent failure is a test problem. A test that fails only when a specific downstream dependency is under real load (e.g., a payment gateway sandbox rate-limiting under CI's parallel run) may be correctly surfacing a production-relevant reliability issue. Before classifying a failure as a test-side flake, check whether the same intermittency would affect a real user — if so, it may deserve a product/infra bug, not a test fix.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Just rerun it, CI is flaky today" | Blaming "CI" without evidence is how a real race condition or pollution bug survives for months. Reproduce and classify before assuming infra is at fault. |
| "Add a retry(3) to the test config and move on" | Retries mask the failure rate instead of fixing the cause, and they hide real regressions behind a wall of "passed on attempt 2." A rising retry count across the suite is a leading indicator of exactly the debt this skill exists to catch. |
| "It's just flaky, mark it @skip and revisit someday" | "Someday" without an owner or SLA is how skip lists grow to hundreds of tests and coverage silently erodes. Quarantine requires a ticket, an owner, and a re-review date. |
| "Increase the timeout, that'll fix it" | A longer timeout can hide a race condition until the system is under more load (e.g., in production-scale CI parallelism), at which point it fails again — treating a symptom, not the underlying unresolved async condition. |
| "It passed on rerun, so it's fixed" | A single passing rerun is not verification. Re-run at the same N used to originally reproduce the flake before closing it out. |

## Red Flags

- Retry counts that keep climbing over time instead of root causes getting fixed.
- A quarantine/skip list that only ever grows and has no owner or SLA attached to any entry.
- No flake-rate metric tracked anywhere in the project's dashboards or CI reports.
- The same test flaking for months with a ticket that's never been picked up or re-triaged.
- A "fix" merged with no re-run evidence at the same reproduction rate that surfaced the original flake.
- Tests that only fail in CI and are never reproduced or investigated locally before being retried away.

## Verification

- [ ] The flake was reproduced at a measured rate (e.g., "N/50 runs") before any fix was attempted, in both isolated and full-suite conditions.
- [ ] The root cause was classified into one of the six categories, with the classification backed by the reproduction data (not a guess).
- [ ] If fixed: the fix was re-verified at the same reproduction protocol and rate, and the flake rate dropped to the expected baseline (typically 0/N).
- [ ] If quarantined: a ticket exists with a named owner and a re-review date, and the test still executes and reports (not silently skipped).
- [ ] The flake-rate metric/dashboard was updated to reflect this test's history.
- [ ] No retry count or timeout was increased as a substitute for root-causing the failure.
