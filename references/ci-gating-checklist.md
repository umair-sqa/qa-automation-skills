# CI Gating Checklist

Not every test should block a merge, and not every green pipeline means "safe to release." Use this checklist to define what actually gates a merge or release — pairs with `qa-automation-architect` and the `ci-cd-test-pipeline-integration` skill.

## Which Test Tiers Block Merge vs. Informational

- [ ] Unit and integration tests for the changed code path block merge — they're fast and directly attributable to the change.
- [ ] Contract tests for services the change touches block merge; contract tests for unrelated services run informationally or on a separate cadence.
- [ ] Full e2e suites block merge only for the critical journeys directly affected by the change; the rest run post-merge or on a schedule and report without blocking.
- [ ] Load/performance tests are informational on every PR and blocking only at defined release checkpoints, not on every commit (see `performance-test-engineer`).
- [ ] Long-running or environment-dependent suites (cross-browser matrix, device farm) have an explicit decision recorded on whether they block merge or gate release instead.

## Flaky-Test Handling in the Pipeline

- [ ] A known-flaky test is quarantined (tagged, tracked, ticketed) rather than silently retried into a false green.
- [ ] Quarantined tests still execute and report separately in CI output — they are visible, not removed from the run.
- [ ] Automatic retries, if used at all, are capped, logged distinctly from a first-attempt pass, and tracked as a metric (rising retry count is a leading indicator, not a fix).
- [ ] A merge is not allowed to pass purely because a flaky test happened to pass on retry with no visibility into the retry having occurred.
- [ ] Flake rate per suite is visible somewhere (dashboard, CI summary) so a creeping problem is caught before it erodes trust in "green."

## Required Artifacts on Failure

- [ ] Failing runs produce a stack trace or assertion diff sufficient to diagnose without re-running locally first.
- [ ] UI test failures capture a screenshot/video and DOM snapshot at the point of failure.
- [ ] API/integration test failures capture the request/response payloads involved, not just a pass/fail status.
- [ ] Load test failures capture the APM/tracing window correlated with the breach, not only the aggregate summary metric.
- [ ] Artifacts are retained long enough and linked from the CI result to be usable during actual triage (not expired before anyone looks).

## Minimum Exit Criteria Before a Release

- [ ] All merge-blocking test tiers are green on the release candidate build specifically (not an approximation from an earlier commit).
- [ ] No open Critical or Important defect (per the severity scale in use) is unresolved against the release scope.
- [ ] The quarantine list has been reviewed for anything whose re-review date has passed with no update.
- [ ] Release-checkpoint tests (load, security scan, accessibility baseline) have run against this specific candidate and passed their pre-defined thresholds.
- [ ] The exit criteria are written down somewhere durable (release checklist, runbook) and are the same criteria applied to every release of that type, not renegotiated under deadline pressure.
