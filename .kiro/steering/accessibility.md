---
inclusion: manual
---
# /accessibility

Review a feature's accessibility requirements and generate automated and manual test scenarios.

Apply the `accessibility-testing-automation` skill.

## Usage

Expects a feature, page, or component as input. Output should split into two tracks: automated checks (axe-core/Lighthouse-style rules runnable in CI — contrast, ARIA attributes, focus order) and manual scenarios covering what automation structurally can't catch (screen-reader narration quality, keyboard-only task completion, meaningful focus management).

Call out explicitly which WCAG criteria are covered by automation versus which require the manual pass — don't present automated-only coverage as complete.
