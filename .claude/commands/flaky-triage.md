# /flaky-triage

Investigate an intermittently failing test and drive it to a root cause.

Apply the `flaky-test-diagnosis-and-triage` skill, using the `flaky-test-detective` persona agent.

## Usage

Expects a failing test name/ID plus whatever failure evidence exists (CI logs, run history, screenshots). Follow the reproduce → classify → decide process: reproduce the failure (or show why it can't be reproduced yet), classify the root-cause category (race condition, shared state, environment, timing, non-deterministic data), then decide fix vs. quarantine-with-owner.

Refuse to close this out with a retry wrapper, a longer timeout, or a bare `.skip` — those are not diagnoses. If a root cause genuinely can't be found yet, say so explicitly and quarantine with a tracked follow-up, don't silently paper over it.
