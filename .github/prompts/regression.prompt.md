---
description: Determine the regression test scope for a specific code change.
---

Apply the `regression-and-golden-scenario-management` skill.

## Usage

Expects a diff, PR description, or change summary as input. Output should be a scoped regression list derived from what actually changed and its blast radius (affected modules, shared components, golden scenarios that touch the changed area) — not a blanket "run the full suite."

Explicitly name which golden/critical-path scenarios must run regardless of scope, and justify any exclusions in terms of risk, not effort saved.
