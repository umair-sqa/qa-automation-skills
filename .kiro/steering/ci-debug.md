---
inclusion: manual
---
# /ci-debug

Diagnose a CI test-pipeline failure and identify whether it's infra, test, or application-code.

Apply the `ci-cd-test-pipeline-integration` skill.

## Usage

Expects a CI run link, failure log, or pipeline config as input. Output should classify the failure category (flaky infra: runner/network/resource; test-code issue: bad assertion, ordering dependency; or a real application regression) with evidence for that classification, plus the specific fix or pipeline-stage change needed.

Don't default to "rerun the job" as the resolution — that's a workaround, not a diagnosis, unless the evidence genuinely points to transient infra.
