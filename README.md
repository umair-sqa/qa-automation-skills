# QA Automation Skills

**Production-grade QA automation skills for AI coding agents.**

Skills encode the workflows, quality gates, and failure modes that senior SDETs and QA engineers use across the testing lifecycle. They're packaged so an AI agent follows them consistently — from deciding what's worth automating, through building suites, to gating releases on test signal.

This project mirrors the skill anatomy of [agent-skills](https://github.com/addyosmani/agent-skills) but is a fully isolated project: no shared files, no cross-references, own conventions. See [CLAUDE.md](CLAUDE.md) for scope and conventions, [docs/skill-anatomy.md](docs/skill-anatomy.md) for the SKILL.md format contract, [ANSWERS.md](ANSWERS.md) for the stack/process answers this round of the catalog was tailored against, and [CHANGELOG.md](CHANGELOG.md) for what changed and when.

Primary automation stack: **Playwright + TypeScript/JavaScript**, running in **GitHub Actions and Jenkins**. Core tool-agnostic skills stay stack-neutral; `playwright-test-automation` is the concrete implementation path.

```
  DEFINE              PLAN               BUILD              VERIFY             REVIEW             SHIP
 ┌─────────┐      ┌───────────┐      ┌────────────┐      ┌───────────┐      ┌───────────┐      ┌───────────┐
 │  Risk &  │ ───▶ │ Test Case │ ───▶ │ Automation │ ───▶ │  Execute  │ ───▶ │   Suite   │ ───▶ │  Release  │
 │ Strategy │      │  Design   │      │   Build    │      │ & Diagnose│      │  Quality  │      │   Gate    │
 └─────────┘      └───────────┘      └────────────┘      └───────────┘      └───────────┘      └───────────┘
```

## Skills by Phase

| Phase | Skill | What it's for |
|---|---|---|
| Define | `requirements-and-acceptance-criteria-analysis` | Surface ambiguous/missing acceptance criteria before any test is designed |
| Define | `test-strategy-and-risk-based-planning` | Decide what's worth testing and at what level, before writing any test |
| Define | `requirements-to-test-traceability` | Map clarified acceptance criteria to test cases; catch untested requirements |
| Plan | `test-case-design-techniques` | Equivalence partitioning, boundary values, decision tables, pairwise design |
| Plan | `test-data-management-strategy` | Fixtures, factories, seeding/teardown, PII-safe synthetic data, DB integrity checks |
| Build | `test-automation-framework-selection` | Choosing web/API/mobile frameworks with a real decision framework |
| Build | `ui-test-automation-patterns` | Page Object / Screenplay patterns, resilient locators, no hardcoded waits (tool-agnostic) |
| Build | `playwright-test-automation` | The concrete Playwright + TypeScript implementation path: fixtures, POM, sharding, trace viewer |
| Build | `api-contract-test-automation` | Schema/contract validation, negative-case coverage for REST/GraphQL/gRPC |
| Build | `mobile-test-automation` | Appium/Espresso/XCUITest, device fragmentation, flaky gesture timing |
| Build | `bdd-gherkin-authoring` | When Gherkin earns its overhead, and how to keep it declarative |
| Verify | `flaky-test-diagnosis-and-triage` | Root-cause flakiness instead of retrying it away |
| Verify | `cross-browser-and-device-testing` | Data-driven browser/device matrix, not "test everything" |
| Verify | `performance-and-load-testing` | Load/stress/soak testing with defined SLOs, not eyeballed results |
| Verify | `accessibility-testing-automation` | axe-core/Lighthouse in CI, plus what automation can't catch |
| Verify | `exploratory-testing-and-bug-reports` | Session-based exploratory charters and reproducible defect reports |
| Review | `test-suite-quality-review` | Reviewing the tests themselves — meaningful assertions, real coverage |
| Review | `test-suite-simplification-and-dedup` | Cutting duplication and stale skips without losing coverage |
| Review | `regression-and-golden-scenario-management` | Curating a focused regression suite via change-based test selection |
| Review | `security-testing-in-qa` | Authz negative testing, DAST/SAST gates, secrets-in-fixtures scanning |
| Ship | `ci-cd-test-pipeline-integration` | Pyramid-aware pipeline staging, fast-fail ordering, flake gating (GitHub Actions + Jenkins) |
| Ship | `test-observability-and-reporting` | Trend dashboards, flake rate, actionable failure artifacts |
| Ship | `release-readiness-and-exit-criteria` | Go/no-go from test signal, not from "QA said it's probably fine" |
| Ship | `test-suite-migration-and-deprecation` | Migrating frameworks incrementally without a coverage gap |
| Cross-cutting | `ai-assisted-qa-workflows` | Using AI to accelerate QA work without trusting its output uncritically |

## Persona Agents

- `qa-automation-architect` — evaluates test strategy and framework choices
- `test-suite-reviewer` — reviews test code/suites for the same quality bar as `test-suite-quality-review`
- `flaky-test-detective` — root-causes flaky tests instead of adding retries
- `performance-test-engineer` — designs and evaluates load/performance test runs

## Slash Commands

14 command entry points under `.claude/commands/` map onto the skills above: `/spec`, `/test-plan`, `/test-cases`, `/test-strategy`, `/playwright`, `/api-test`, `/review`, `/flaky-triage`, `/ci-debug`, `/regression`, `/bug-report`, `/qa-report`, `/exploratory`, `/accessibility`.

## Validation & Evals

- `node scripts/validate-skills.js` — structural CI gate: frontmatter contract, heading order, and command-to-skill references. Currently 25/25 skills, 4/4 agents, 14/14 commands passing.
- `evals/cases.md` — representative prompts (positive, ambiguous, out-of-scope, and "should ask a clarifying question") for a human or agent reviewer to walk through after changing any skill description. Not a live-model grader — see `evals/README.md`.

## Status

This round was tailored against real answers in [ANSWERS.md](ANSWERS.md): Playwright/TypeScript as the primary stack, GitHub Actions + Jenkins for CI, and risk-based coverage / test data isolation / test health visibility / accessibility+security testing / AI-assisted QA flagged as current priorities. Core skills remain tool-agnostic by design; tool-specific guidance (Playwright, GitHub Actions, Jenkins) lives in dedicated skills or subsections rather than being forced into every file.
