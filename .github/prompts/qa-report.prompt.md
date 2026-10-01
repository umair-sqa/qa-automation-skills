---
description: Summarize test execution results, defect status, and release risk for stakeholders.
---

Apply the `test-observability-and-reporting` skill.

## Usage

Expects access to actual execution data (CI run results, test reports, defect tracker state) — this command reports on real signal, not vibes. Output is a stakeholder-facing summary: pass/fail trend, flake rate, open blockers, and a risk statement tied to that data.

Check the summary against the real data before presenting it; per the `ai-assisted-qa-workflows` skill, an AI-generated summary must be verified against source data, not trusted and forwarded as-is.
