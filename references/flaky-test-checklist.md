# Flaky Test Checklist

A flaky test is a real defect (in the test, the app, or the environment) surfacing intermittently, not noise. Use this checklist to run the triage process consistently — pairs with `flaky-test-detective` and the `flaky-test-diagnosis-and-triage` skill.

## Reproduction Steps

- [ ] Run the suspect test 20-50 times locally in isolation and record the failure rate as a fraction.
- [ ] Run the same count locally as part of the full suite (order/parallelism effects surface here, not in isolation).
- [ ] Run the same count in CI, both isolated and full-suite, since CI resource contention and timing differ from local machines.
- [ ] Note any correlation between failure rate and parallel worker count, machine speed, or time of day before moving to classification.
- [ ] If the rate is 0/N in every condition, treat the case as unreproduced — gather more evidence (CI history, logs) rather than guessing at a cause.

## Root-Cause Classification Categories

- [ ] **Race condition** — assertion fires before an async operation resolves; fails more under load, passes when single-stepped.
- [ ] **Shared mutable state / test-order dependency** — fails only in full-suite or specific-order runs, passes in isolation.
- [ ] **Environment/network variability** — fails in CI but not locally, or correlates with third-party incidents/rate limits.
- [ ] **Timing-dependent UI** — fixed sleeps or animation/debounce timing; correlates with machine speed or headless-vs-headed mode.
- [ ] **Test pollution from a prior test** — unclosed transactions, leaked timers, unreset flags/storage; fails only in full-suite runs.
- [ ] **Non-deterministic data** — unfrozen clocks, unseeded random values, auto-incrementing IDs; clusters near time boundaries.
- [ ] The classification is backed by the reproduction data collected above, not asserted from a guess.

## Fix vs. Quarantine Decision Criteria

- [ ] Default to fixing now if the root cause is identified and the fix is scoped (wait condition, state isolation, seeded data, mocked flaky dependency).
- [ ] Reserve quarantine for cases needing cross-team coordination, infrastructure change, or a larger refactor that can't land immediately.
- [ ] Reject "add a retry" or "raise the timeout" as a final answer unless explicitly labeled a temporary mitigation with an open root-cause ticket still tracked.
- [ ] Reject silent `@skip`/`.only` with no ticket as equivalent to deleting the test's coverage without anyone noticing.

## Quarantine SLA and Ownership Requirements

- [ ] A ticket exists, linked from the test (comment or annotation) and from the quarantine list/dashboard.
- [ ] A named individual (not a team alias) owns the re-investigation.
- [ ] A re-review date is set, typically 1-2 sprints out, and appears on someone's active backlog, not just the ticket.
- [ ] The test still executes and reports in CI (non-blocking), rather than being silently skipped and losing visibility entirely.
- [ ] The quarantine list is reviewed on a cadence (e.g., every sprint) to check for growth without matching resolution — a monotonically growing list is a red flag on its own.
- [ ] A fix, once applied, is re-verified at the same reproduction N and conditions that originally surfaced the flake before the ticket is closed.
