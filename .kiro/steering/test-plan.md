---
inclusion: manual
---
# /test-plan

Produce a concrete, risk-based test plan document for a feature or release.

Apply the `test-strategy-and-risk-based-planning` skill.

## Usage

Expects a feature description, release scope, or set of already-clarified acceptance criteria (from `/spec`) as input. Output should be a plan artifact: scope and out-of-scope, test levels (unit/integration/e2e/manual), prioritization by risk, and what's explicitly not being tested and why.

Anchor priority decisions in actual risk (blast radius, likelihood, detectability) rather than defaulting to "test everything equally." Flag any area where risk can't be assessed because requirements are still unclear.
