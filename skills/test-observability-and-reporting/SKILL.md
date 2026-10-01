---
name: test-observability-and-reporting
description: Guides treating test health as a first-class, continuously observed signal — dashboards and trends for pass rate, flake rate, and duration; historical tracking of whether a failure is a new regression or a long-standing flake; alerting on suite-wide health degradation, not just individual failures; and making failure reports self-sufficient with automatically attached screenshots, traces, videos, and logs. Use when nobody notices a suite has been slowly getting slower or flakier, when diagnosing a failure requires reproducing it locally first, or when the only visibility into test health is scrolling through CI logs after something breaks.
---

# Test Observability and Reporting

## Overview

A test suite that only reports pass/fail for the current run is blind to trends: a test that's been quietly flaky for three months looks identical, in that single run's report, to one that just started failing for a real reason. Treating test health like any other production signal — dashboards, historical trends, alerting on degradation, and richly-attached failure artifacts — turns "something broke, good luck" into "here's exactly what changed, when, and why."

## When to Use

- Nobody has visibility into whether flake rate or suite duration is trending up over weeks/months
- Diagnosing a CI failure currently requires re-running it locally to understand what happened
- A suite has been getting slower or flakier gradually and it went unnoticed until it became a serious problem
- Deciding whether a newly-failing test is a fresh regression or a known, long-standing flake
- Designing what a pipeline should report and alert on, beyond the current run's red/green

**When NOT to use:** Deciding pipeline stage ordering or merge-blocking rules (that's `ci-cd-test-pipeline-integration`) or judging whether a specific test's assertions are sound (that's `test-suite-quality-review`). This skill is about observing and reporting on health over time, not the mechanics of gating or the internals of a single test.

## Core Process

1. **Capture structured results for every run, not just pass/fail.** Emit per-test outcome, duration, retry count, and a stable test identifier for every run, into a queryable store (a test-reporting platform, a time-series database, or even a structured log sink) — not just a build-level green/red status.

2. **Build trend views for pass rate, flake rate, and duration.** Pass rate and flake rate are different signals: a test that fails consistently is broken (pass rate down); a test that sometimes passes and sometimes fails on identical code is flaky (flake rate up). Track both, per test and suite-wide, over time — not just for the current run.

3. **Distinguish a new regression from a known flake automatically.** When a test fails, check its historical record: has it failed intermittently before with no code change in its path, or is this the first failure after a change that touches its dependencies? Surface that context in the failure report itself so triage doesn't start from zero every time.

4. **Alert on suite-wide degradation, not only on individual failures.** A single failing test generates a single notification; a suite-wide flake-rate creep from 2% to 15% over a month generates none by default unless someone is watching a dashboard. Set explicit alert thresholds on the aggregate trend (flake rate, median/95th-percentile duration, pass rate) so degradation is caught before it's an emergency.

5. **Attach reproduction artifacts automatically to every failure.** Screenshots at the point of failure, full request/response logs, network traces (e.g. HAR files), video recordings for UI runs, and stack traces should be captured and linked from the failure report by default — not only on request, and not requiring a human to re-run the test to generate them.

6. **Make the failure report the primary debugging entry point.** A failure report should answer "what broke, on what input, with what evidence" without opening a terminal. If triage regularly requires pulling the branch and re-running locally just to see what the assertion diff was, the report is missing information that was available at the moment of failure and simply wasn't captured.

7. **Review trends on a cadence, not only reactively.** Schedule a recurring (e.g. weekly) look at the flake-rate and duration dashboards, independent of whether anything is currently on fire. Degradation that's gradual is exactly the kind that reactive-only monitoring misses, because no single day's data point looks alarming.

## Techniques and Patterns

### Minimum structured result schema

```json
{
  "test_id": "checkout.applies_discount_at_100_percent",
  "run_id": "ci-run-48213",
  "status": "failed",
  "duration_ms": 1420,
  "retry_count": 1,
  "commit_sha": "a1b2c3d",
  "branch": "feature/discount-fix",
  "timestamp": "2026-09-24T18:22:03Z",
  "artifacts": {
    "screenshot": "s3://.../48213/checkout_discount.png",
    "trace": "s3://.../48213/checkout_discount.trace.zip",
    "logs": "s3://.../48213/checkout_discount.log"
  }
}
```
This is the atomic unit that trend dashboards, flake detection, and rich failure reports are all built from — capture it once, per test, per run, and derive everything else.

### Flaky vs. broken, from history alone

| Pattern over last 20 runs | Classification | Action |
|---|---|---|
| Pass, pass, pass, fail, pass, pass | Flaky | Quarantine + investigate root cause (env, timing, order dependency) |
| Fail, fail, fail, fail, fail (since commit X) | Broken (regression) | Blocks merge, root-cause the change at commit X |
| Pass, pass, ..., pass, fail (first-ever failure, no recent related change) | New — investigate before classifying | Don't auto-quarantine on one data point; watch next few runs |
| Fail intermittently, always under high parallel load | Environment-flaky | Fix resource contention/isolation, not the assertion |

### Alert thresholds (illustrative, tune per suite)

```
flake_rate_7d_trend:      alert if > 2x increase week-over-week
suite_duration_p95:       alert if > 20% increase over trailing 4-week baseline
pass_rate_suite_wide:     alert if drops below 95% for the required-check lane
quarantine_lane_size:     alert if growing without corresponding fix-rate
```

### Failure report checklist (what a good one contains)

```
- Test ID + human-readable name
- Exact assertion diff (expected vs actual)
- Screenshot/video at point of failure (for UI tests)
- Full request/response or trace (for API/network-involved tests)
- Historical classification (flaky / regression / new)
- Link to the commit/PR that introduced the change, if applicable
- One-click "re-run this test" action
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll just check CI logs when something breaks" | Raw logs answer "what happened in this one run," not "is this new, is this getting worse, has this test always been unreliable." Trend questions need trend data, which logs alone don't provide. |
| "A red build is signal enough, we don't need a dashboard" | A red build tells you something is wrong right now; it tells you nothing about a flake rate that's been quietly climbing for two months until it crosses a threshold that finally causes enough red builds to notice — much later than needed. |
| "We don't have time to instrument test reporting, we need to ship features" | Every hour spent manually reproducing a failure that a screenshot or trace would have shown instantly is time not spent shipping features — instrumentation pays for itself the first time it prevents a re-run-to-diagnose cycle. |
| "This test has always been a little flaky, no need to track it formally" | "Always been a little flaky" is exactly the kind of tribal knowledge that a new team member or a busy engineer won't have — formal tracking makes it visible to everyone, not just whoever remembers. |
| "We only need artifacts for tests that fail a lot" | You don't know which test will fail until it does; capturing artifacts only after a test earns a reputation means the first several failures — often the most diagnostically useful — have none. |
| "Alerting on trends will just be noisy" | A well-tuned trend alert (week-over-week flake rate, p95 duration) fires far less often than per-failure notifications and catches the exact class of gradual degradation that per-failure alerts structurally cannot. |

## Red Flags

- No historical trend visibility into flake rate or suite duration over time — only current-run pass/fail is visible
- Failure reports contain a stack trace but no screenshot, video, or request/response artifact, forcing a local re-run to understand a UI or API failure
- A suite has been getting measurably slower or flakier over months and nobody flagged it until it became severe
- "Flaky" is a label applied from memory/reputation rather than from a queryable history of pass/fail per test
- Alerts exist only for individual test failures, none for suite-wide aggregate degradation
- Test result data isn't retained long enough to compute a meaningful trend (e.g. only the last run is kept)
- Engineers routinely say "let me re-run it locally to see what actually happened" as their default triage step

## Verification

- [ ] Structured per-test results (status, duration, retry count, artifacts) are captured and queryable for at least several weeks of history
- [ ] A dashboard or report exists showing pass rate, flake rate, and duration trend over time, not just the latest run
- [ ] At least one failure was triaged using only the automatically attached artifacts (screenshot/trace/log), with no local re-run required
- [ ] An alert threshold is configured and tested for suite-wide degradation (flake rate or duration trend), separate from per-test failure alerts
- [ ] A recurring (e.g. weekly) review of trend dashboards is scheduled and has actually happened at least once, not just configured
- [ ] A sample failing test was correctly auto-classified (or manually classifiable from stored history) as flaky vs. new regression vs. long-standing issue
