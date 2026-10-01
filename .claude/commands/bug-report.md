# /bug-report

Produce a reproducible defect report from an observed failure.

Apply the `exploratory-testing-and-bug-reports` skill.

## Usage

Expects a description of unexpected behavior, a failing scenario, or raw observations from exploratory testing. Output is a structured defect report: preconditions/environment, exact repro steps, expected vs. actual behavior, supporting evidence (logs, screenshots, request/response), and a severity rationale (impact and likelihood, not a gut-feel label).

If the repro steps can't be nailed down to something deterministic, say so and note what's still unknown rather than filing a vague report.
