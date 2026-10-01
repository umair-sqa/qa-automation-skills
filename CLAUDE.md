# qa-automation-skills

This is the qa-automation-skills project — a collection of production-grade QA automation skills for AI coding agents, following the same skill anatomy as [agent-skills](https://github.com/addyosmani/agent-skills) but scoped entirely to test strategy, test automation engineering, and quality gates.

> **Scope:** This file configures agents working on the qa-automation-skills project itself, not other projects. Don't copy it into another project or a global agent configuration; the reusable assets are the skills in `skills/`. This project is intentionally isolated from `agent-skills` — no shared files, no cross-repo references.

## Project Structure

```
skills/             → Core skills (SKILL.md per directory)
agents/             → Reusable persona agents (test-suite-reviewer, flaky-test-detective, performance-test-engineer, qa-automation-architect)
references/         → Shared checklists (coverage, flakiness, CI gating, accessibility)
docs/               → skill-anatomy.md — the format contract for every SKILL.md
.claude/commands/   → Slash-command entry points onto the skills below
scripts/            → validate-skills.js — structural CI gate for skills/agents/commands
evals/              → cases.md — representative routing prompts for manual/agent review
QUESTIONS.md        → Open questions used to tailor this catalog (see ANSWERS.md for the answers on file)
ANSWERS.md          → Recorded stack/process/priority answers this round was built against
CHANGELOG.md        → What changed, and when
```

## Skills by Phase

**Define:** requirements-and-acceptance-criteria-analysis, test-strategy-and-risk-based-planning, requirements-to-test-traceability
**Plan:** test-case-design-techniques, test-data-management-strategy
**Build:** test-automation-framework-selection, ui-test-automation-patterns, playwright-test-automation, api-contract-test-automation, mobile-test-automation, bdd-gherkin-authoring
**Verify:** flaky-test-diagnosis-and-triage, cross-browser-and-device-testing, performance-and-load-testing, accessibility-testing-automation, exploratory-testing-and-bug-reports
**Review:** test-suite-quality-review, test-suite-simplification-and-dedup, regression-and-golden-scenario-management, security-testing-in-qa
**Ship:** ci-cd-test-pipeline-integration, test-observability-and-reporting, release-readiness-and-exit-criteria, test-suite-migration-and-deprecation
**Cross-cutting:** ai-assisted-qa-workflows

## Primary Stack

Playwright + TypeScript/JavaScript, GitHub Actions + Jenkins for CI (per ANSWERS.md). Keep core skills tool-agnostic; put stack-specific implementation detail in `playwright-test-automation` or in a clearly-scoped subsection (as done in `ci-cd-test-pipeline-integration`'s GitHub Actions/Jenkins subsection) rather than rewriting a tool-agnostic skill around one tool.

## Conventions

- Every skill lives in `skills/<name>/SKILL.md`.
- YAML frontmatter with `name` and `description` fields — see [docs/skill-anatomy.md](docs/skill-anatomy.md) for the full contract.
- Description starts with what the skill does (third person), followed by trigger conditions ("Use when...").
- Every skill has: Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification.
- Shared references are in the root `references/` directory; a skill's own supplementary material lives in `skills/<name>/references/`.
- Prefer extending an existing skill over adding a near-duplicate.

## Status

This catalog was scaffolded from general QA automation experience, then tailored once against [ANSWERS.md](ANSWERS.md). Re-answer [QUESTIONS.md](QUESTIONS.md) (or edit ANSWERS.md directly) whenever the stack, CI system, or priorities change materially, and hand it back for another tailoring pass. Run `node scripts/validate-skills.js` after any structural edit — it's the CI gate for frontmatter, heading order, and command references.

## Boundaries

- Always: Follow the skill-anatomy.md format for new or edited skills.
- Always: Ground "Common Rationalizations" and "Red Flags" in real QA failure modes, not generic process advice.
- Never: Add skills that are vague advice instead of actionable, verifiable processes.
- Never: Duplicate content between skills — reference other skills instead.
