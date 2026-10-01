---
name: ci-cd-test-pipeline-integration
description: Guides mapping the test pyramid onto CI/CD pipeline stages correctly — fast-fail ordering (unit before integration before e2e), parallelization and sharding for suite runtime, flaky-test quarantine rules that don't block merges while still tracking them, wiring test results/artifacts into visible reporting, and caching dependencies to keep CI fast. Use when a pipeline runs all tests serially or in the wrong order, when CI is red often enough that people route around it, when flaky tests are handled by adding retries instead of quarantine, or when designing a new pipeline's test stages.
---

# CI/CD Test Pipeline Integration

## Overview

A pipeline's job is to give the fastest possible accurate signal on whether a change is safe to merge or release. That requires deliberate ordering (fail fast on cheap checks before spending minutes on slow ones), deliberate parallelization, and a clear, enforced distinction between "known flaky, tracked" and "genuinely broken." Get this wrong and engineers learn — quickly and rationally — to stop trusting or waiting on the pipeline at all.

## When to Use

- Designing or auditing a CI/CD pipeline's test stages from scratch
- The pipeline runs slow e2e suites before fast unit tests, or runs everything serially
- Flaky tests are handled with blanket retries or by ignoring failures rather than quarantine-and-track
- CI is red often enough that people have started merging on red or muting notifications
- Suite runtime has grown and nobody has revisited parallelization or caching strategy

**When NOT to use:** Deciding whether a specific test should exist or at what level (that's `test-strategy-and-risk-based-planning`), or designing dashboards for historical trend visibility (that's `test-observability-and-reporting`). This skill is about pipeline stage design and gating mechanics.

## Core Process

1. **Order stages by cost, cheapest first.** Lint/type-check → unit tests → integration tests → contract tests → e2e tests, each stage gating the next. A syntax error or a broken unit test should fail in seconds, not after a 20-minute e2e run has also (redundantly) failed on the same root cause.

2. **Parallelize and shard within each stage.** Split test suites across workers/machines by historical duration (not by file count alone, which produces uneven shards) so the slowest stage's wall-clock time is bounded by the longest shard, not the sum of all tests. Re-balance shards periodically as the suite changes.

3. **Separate "known flaky, quarantined" from "broken."** A test flagged as flaky gets moved to a quarantine lane that runs, reports its results, and is visibly tracked — but does not block merge. A test that reliably fails is a broken build and must block. Never let these two categories blur into "just retry until green."

4. **Cap and audit retries — don't use them as a substitute for root-causing.** A small, fixed retry budget (e.g. one automatic retry) for genuinely environment-flaky steps (network blip, container cold start) is reasonable. Retrying an assertion failure repeatedly until it happens to pass is not tolerance for flakiness, it's laundering a real bug into a green build.

5. **Wire test results and artifacts into visible reporting**, not just pipeline logs. Publish structured test reports (JUnit XML, or the CI platform's native test-report format) so failures show up as annotated, clickable results in the PR/merge UI, with screenshots/traces/logs attached automatically for e2e and UI failures.

6. **Cache dependencies and build artifacts deliberately.** Cache package manager stores, compiled build output, and container layers keyed on a lockfile/checksum hash, invalidated only when that hash changes. Verify cache hit rate periodically — a cache that never invalidates correctly (stale) or always invalidates (useless) is worse than no cache, because it hides its own failure mode.

7. **Set and enforce merge-blocking rules explicitly.** Document which stages are release/merge-blocking, which are quarantine/informational, and what "quarantined too long" triggers (e.g. auto-escalate to blocking after N days unthemed as fixed). Make the rule set visible in the pipeline config itself, not tribal knowledge.

## Techniques and Patterns

### Stage ordering (fail-fast pipeline)

```yaml
stages:
  - lint_and_typecheck        # seconds
  - unit_tests                # ~1-3 min, sharded
  - integration_tests          # ~3-8 min, sharded, depends on unit passing
  - contract_tests             # depends on integration passing
  - e2e_tests                  # slowest, depends on all above passing
  - dast_scan                  # nightly/pre-release, not per-PR (see security-testing-in-qa)
```
Each stage only runs if the previous, cheaper stage passed — a broken unit test should never let CI spend 20 minutes discovering the same root cause in e2e.

### Quarantine lane, not silent retry

```
CI result surface:
  ✅ Required checks (block merge): unit, integration, contract, e2e-critical-path
  ⚠️  Quarantine (visible, non-blocking): e2e-flaky-checkout-edge-case (flaky since 2026-08-12, ticket QA-4471)
  ❌ If a quarantined test has been flaky > 30 days with no fix progress: escalate to blocking, forcing a decision
```
The quarantine lane is not a place tests go to be forgotten — pair it with the practices in `test-observability-and-reporting` (flake-rate trend) so quarantine has a visible expiry pressure.

### Sharding by historical duration

```
# Naive: split by file count -> uneven wall-clock time per shard
shard_1: [a_test.py, b_test.py]      # b_test.py alone takes 8 min
shard_2: [c_test.py, d_test.py]      # both finish in 30s

# Better: split by recorded duration from the last N runs
shard_1: [b_test.py]                  # ~8 min
shard_2: [a_test.py, c_test.py, d_test.py]  # ~8 min combined
```
Not every runner balances shards by duration out of the box — know which kind you have before trusting the split. **pytest-split** does this directly (reads a stored `.test_durations` file and chunks by recorded time). **Jest's** `--shard` and **Playwright's** `--shard` instead split by equal file count (or equal test count, with Playwright's `fullyParallel: true`) — balanced only if your files/tests happen to take similar time to run, not by actual duration. Getting duration-aware balancing out of either requires extra work: a custom `testSequencer` for Jest, or manually grouping files by recorded timing (as in the example above) for Playwright. Check which mode you're actually running before assuming the split above happens for free.

### Retry budget as a tripwire, not a fix

```yaml
retry:
  max_attempts: 1        # one automatic retry for transient infra flakiness
  on_repeat_failure: quarantine_and_ticket   # not: retry again
```
If a test needs more than one retry to go green with any regularity, that's the signal to quarantine and investigate — not to raise `max_attempts` further.

### Platform specifics: GitHub Actions and Jenkins

The concepts above (fast-fail ordering, sharding, quarantine, artifacts-on-failure) are platform-agnostic; the mechanics of wiring them up differ enough to be worth a concrete reference.

**GitHub Actions — sharded job with failure-only artifact upload:**

```yaml
jobs:
  e2e:
    needs: [unit_tests]            # fail-fast: only runs if unit tests passed
    strategy:
      fail-fast: false             # let all shards report, don't cancel siblings
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --shard=${{ matrix.shard }}/4
      - name: Upload failure artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-shard-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 7
```
`needs:` enforces stage ordering, the `matrix` spreads shards across parallel jobs, and `if: failure()` keeps artifact upload from cluttering successful runs while guaranteeing traces/screenshots exist for anyone debugging a failure.

**Jenkins — declarative pipeline equivalent (representative fragment, not a full Jenkinsfile):**

```groovy
pipeline {
  agent any
  stages {
    stage('Unit') { steps { sh 'npm run test:unit' } }
    stage('E2E (sharded)') {
      parallel {
        stage('Shard 1') { steps { sh 'npx playwright test --shard=1/4' } }
        stage('Shard 2') { steps { sh 'npx playwright test --shard=2/4' } }
        stage('Shard 3') { steps { sh 'npx playwright test --shard=3/4' } }
        stage('Shard 4') { steps { sh 'npx playwright test --shard=4/4' } }
      }
    }
  }
  post {
    failure {
      archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
    }
  }
}
```
`stages` nested under `parallel` gives sharding; Jenkins doesn't have a per-stage `if: failure()` shorthand like Actions, so the common pattern is either a pipeline-level `post { failure { ... } }` block (as above) or a per-stage `post { failure { archiveArtifacts ... } } }` when different shards need different artifact paths. Either way, the same rule applies: artifacts are archived conditionally on failure, not uploaded unconditionally on every green run.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Run the whole suite serially, we have CI minutes to spare" | CI minutes aren't the scarce resource — engineer feedback-loop time is. Serial execution means every PR waits for the slowest possible path even when the fast checks would have failed first. |
| "Let's just add more retries in CI to make the build green" | A test that needs repeated retries to pass is either flaky (needs quarantine and root-cause) or catching a real intermittent bug (needs a fix). Retrying until green launders both into invisible risk. |
| "Merge anyway, the flaky test always fails, ignore it" | An always-failing "flaky" test that gets routinely ignored is either mislabeled (it's actually broken and blocking correctly) or has trained the team to ignore red builds generally — both are worse than fixing the label. |
| "Slow e2e tests give the real signal, run them first so we know early" | Running the slowest stage first delays the fast, cheap signal (lint/unit) that would have caught the same root cause in seconds, wasting the e2e run's compute on a doomed build. |
| "We don't need to distinguish quarantined from broken, just look at the log" | Without a structural distinction, every red build looks identical in the PR UI, and engineers can't tell "known issue, safe to merge" from "you broke something" without manual investigation every time. |
| "Caching is an optimization, we'll get to it later" | Suite runtime compounds with codebase growth; deferring caching means every future PR pays the cost that a one-time cache setup would have removed. |

## Red Flags

- CI is red often enough that engineers have learned to merge on red or mute failure notifications
- The slow e2e suite runs before, or in parallel gating equally with, fast unit tests instead of after them
- No structural distinction in the pipeline between "known flaky, quarantined" and "genuinely broken" — both just show as a red X
- Retry counts have been raised repeatedly over time on the same test(s) instead of the test being fixed or quarantined
- Test result artifacts (screenshots, traces, logs) exist on disk in the CI runner but are never uploaded or linked from the PR
- Dependency/build caches show near-zero hit rate, or are keyed so loosely they never actually invalidate on real changes
- Sharding is done by naive file count and one shard consistently takes multiples of the others' time

## Verification

- [ ] Pipeline stage order is documented and confirmed to run cheap/fast checks before slow ones, gating each subsequent stage
- [ ] At least one shard-duration report was pulled and shards are balanced within a reasonable margin (not dominated by one outlier)
- [ ] A quarantine lane exists, is visibly distinct from blocking checks in the PR/merge UI, and has an escalation rule for tests quarantined past an agreed threshold
- [ ] Retry configuration is capped and documented, with evidence that repeatedly-retried tests get flagged for investigation rather than a raised retry count
- [ ] Test result artifacts (structured reports, screenshots/traces for UI failures) are confirmed visible from the PR/merge UI, not just in raw CI logs
- [ ] Dependency/build cache hit rate has been checked and is meaningfully above zero on unchanged-lockfile runs
