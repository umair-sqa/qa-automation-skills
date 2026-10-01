---
inclusion: manual
---
# /review

Review test code for meaningful assertions, test independence, and real coverage quality.

Apply the `test-suite-quality-review` skill, using the `test-suite-reviewer` persona agent for the review pass.

## Usage

Expects a test file, PR diff, or directory of specs as input. Output is a review with concrete findings: assertions that don't actually verify behavior, tests that depend on execution order or shared state, coverage gaps disguised as passing suites, and any skipped/disabled tests without a tracked reason.

Flag tests that would still pass if the feature were broken — that's the core failure mode this review exists to catch.
