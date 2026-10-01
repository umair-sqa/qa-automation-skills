# /test-strategy

Decide what's worth testing, at what level, and where automation investment actually pays off.

Apply the `test-strategy-and-risk-based-planning` skill.

## Usage

This uses the same skill as `/test-plan` but frames the *upstream decision*, not the plan document itself: use `/test-strategy` when the question is "should this be unit, integration, or e2e, and is automating it worth the cost," and use `/test-plan` when you already have that answer and need the concrete scope/priority artifact for a release.

Expects a feature area, system boundary, or automation proposal as input. Output should be a reasoned recommendation on test level and automation ROI, not a task list — surface the tradeoff (maintenance cost, flake risk, feedback speed) rather than asserting a conclusion.
