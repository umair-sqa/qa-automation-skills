---
name: release-readiness-and-exit-criteria
description: Guides defining and enforcing concrete, agreed-upon go/no-go exit criteria from test signal before a release — a fully green smoke suite, no open P0/P1 defects, a flake-rate threshold, an explicitly scoped regression suite for the release, and a rollback path that is itself tested. Use when a release decision is being made on gut feel rather than documented criteria, when sign-off happens without checking current test/flake trends, when "run everything" is the regression plan, or when a rollback path has never actually been exercised.
---

# Release Readiness and Exit Criteria

## Overview

"Ready to release" should be a checklist outcome, not a feeling. Without documented exit criteria, release decisions default to whoever is loudest or most optimistic in the room, and the same conversation ("is it safe?") gets re-litigated from scratch every release. Concrete, pre-agreed criteria — tied to actual test signal, not intuition — turn a stressful judgment call into a fast, defensible check.

## When to Use

- Defining what "ready to ship" means for a release, ideally before the release crunch, not during it
- A release sign-off is about to happen and no one has checked the current flake rate, open defect list, or smoke suite status
- The regression testing plan for a release is "run everything" with no defined scope
- A rollback/downgrade path exists on paper but has never been exercised by a test
- Auditing why a past release caused an incident that exit criteria should have caught

**When NOT to use:** Deciding what to test during feature development (that's `test-strategy-and-risk-based-planning`) or how CI stages are gated per-PR (that's `ci-cd-test-pipeline-integration`). This skill is specifically about the go/no-go decision at the release boundary, informed by all the testing that came before it.

## Core Process

1. **Write exit criteria down before the release, not during the go/no-go meeting.** Define, per release (or as a durable team standard adjusted per release): which suite(s) must be fully green, what defect severities block release, the maximum acceptable flake rate, and what regression scope applies to this specific release. Put it somewhere everyone making the call can see it.

2. **Require the smoke suite fully green, with the actual run linked.** "Smoke tests passed" must point to a specific, recent, actual run — not a memory of "they usually pass" or a run from three days and several merges ago. A stale green run is not evidence of current readiness.

3. **Enumerate open defects by severity and block on the agreed threshold.** Define upfront which severities (typically P0/P1) block release outright regardless of workarounds or schedule pressure, and which can ship with a documented mitigation. Check the actual current open-defect list at sign-off time, not a stale recollection of it.

4. **Set and check a flake-rate threshold, not just current-run pass/fail.** Pull the flake-rate trend (see `test-observability-and-reporting`) as part of sign-off. A suite that's "green" only because flaky tests happened to pass this run, with a rising flake rate, is a materially weaker signal than a stably green suite — treat it differently.

5. **Scope the regression suite deliberately for this release, based on what changed.** Use the risk-based plan and the change diff to define which regression areas are in scope — full regression for a high-risk release (major version, payment/auth changes), a targeted subset for a low-risk patch. "Run everything blindly" either wastes time on unrelated areas or, worse, gives false confidence that unrelated areas were meaningfully re-verified when they were just re-run unchanged.

6. **Test the rollback/downgrade path itself, not just the forward path.** If rollback is part of the release plan, it needs its own test coverage: can the previous version actually come back up cleanly, does data written by the new version remain compatible or gracefully handled, does the rollback procedure itself complete without manual intervention. A rollback plan that has only ever been described, never executed, is unverified — treat "rollback ready" as a claim requiring evidence like any other.

7. **Record the go/no-go decision against the criteria, explicitly.** Capture, for each release, which criteria were met, which weren't, and if shipping anyway despite an unmet criterion, who explicitly accepted that risk and why. This creates an audit trail and prevents "QA said it's probably fine" from being the entire record of a risk decision.

## Techniques and Patterns

### Exit criteria template (fill in and share before sign-off)

```
Release: <version/date>
Smoke suite: MUST be 100% green — run link: <url>, run timestamp: <time>
Open defects: 0 x P0, 0 x P1 (or documented exception + owner + mitigation)
Flake rate (7-day trend, required-check lane): < 3% (current: <value>, link: <dashboard>)
Regression scope for this release: <list of areas in scope, and why others are out of scope>
Rollback path tested: yes/no — evidence: <link to rollback test run/report>
Sign-off: <names>, decision: GO / NO-GO / GO WITH ACCEPTED RISK: <risk + owner>
```

### Regression scope decision, tied to the diff

| Release type | Regression scope |
|---|---|
| Patch touching one isolated module, no shared dependency changes | Targeted regression: module's own suite + smoke suite only |
| Feature release touching shared components or a checkout/auth path | Full regression on affected domain + smoke suite + targeted e2e for the new feature |
| Major version, dependency upgrade, or infra migration | Full regression suite + rollback test + extended soak/monitoring window |

Deriving scope from the actual diff (which files/domains changed) rather than defaulting to "run everything" keeps the regression pass fast for low-risk changes while still being thorough where risk is concentrated.

### Rollback test as a first-class test case

```
Given: version N is running with data written under version N
When:  rollback procedure is executed to restore version N-1
Then:  version N-1 starts successfully
  AND: version N-1 can read data written by version N without corruption or crash
  AND: the rollback completes within the documented time budget
  AND: no manual, undocumented step was required
```
Run this in a staging/pre-prod environment on a recurring basis (not only right before it might be needed), the same way any other regression test runs on a schedule.

### Flake-adjusted "green" interpretation

```
Smoke suite result: 100% pass, but 3 of the passing tests have a 7-day flake rate > 10%
-> Treat as: conditionally green, re-run those 3 tests in isolation before sign-off,
   or require a second consecutive clean run before counting it as satisfied
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "QA said it's probably fine, ship it" | "Probably fine" is not a checkable criterion and leaves no record of what was actually verified. Written exit criteria replace a vague verbal assurance with an inspectable checklist. |
| "We'll just monitor closely in production instead of testing before release" | Production monitoring catches problems after users hit them; pre-release exit criteria are meant to catch the same problems before users are exposed. Monitoring is a complement to testing, not a substitute for it. |
| "There's no time for a full regression pass, let's just eyeball the diff" | Eyeballing a diff catches obvious mistakes, not integration-level or cross-module regressions. Scoping regression deliberately based on the diff (not skipping it) gets the speed benefit without the blind spot. |
| "The rollback plan is documented, that's good enough" | A documented-but-unexecuted rollback plan is a hypothesis, not a verified capability. The first time it's actually needed — during an incident — is the worst possible time to discover it doesn't work. |
| "The smoke suite passed last week, nothing's changed since that we know of" | "Nothing's changed that we know of" is precisely the assumption a fresh run is meant to test. Merges between then and now are exactly what a stale green run fails to account for. |
| "Flake rate doesn't matter if the build is currently green" | A currently-green build with a high and rising flake rate is a weaker signal than a stably green one — it means the suite is one unlucky run away from red, and a future genuine regression is more likely to hide behind "oh, that test's just flaky." |

## Red Flags

- No documented exit criteria exist anywhere — release decisions are made purely on gut feel or verbal reassurance
- Sign-off happens without anyone checking the current flake-rate trend or open-defect list at that moment
- The regression plan for every release is "run everything," with no scoping tied to what actually changed
- A rollback/downgrade path is described in a runbook but has never been executed, even in staging
- The smoke suite result cited at sign-off is from a run older than the most recent merge to the release branch
- A release shipped with an open P0/P1 defect and no recorded, named risk-acceptance decision
- "Ready to ship" was decided in a meeting with no artifact (checklist, dashboard link) referenced during the discussion

## Verification

- [ ] Written exit criteria exist for this release (or as a standing template) covering smoke suite status, defect severity thresholds, flake-rate threshold, and regression scope
- [ ] The smoke suite run cited at sign-off is linked, recent, and reflects the current release branch state
- [ ] The open-defect list was checked at sign-off time against the agreed severity threshold, with any exception explicitly recorded with an owner
- [ ] The current flake-rate trend was pulled and reviewed as part of the go/no-go decision, not assumed from the current run's color alone
- [ ] Regression scope for this release is documented and justified against the actual change diff, not defaulted to "everything" or "whatever we always run"
- [ ] The rollback/downgrade path has a linked test run (not just a runbook) demonstrating it completes successfully within the current release cycle
