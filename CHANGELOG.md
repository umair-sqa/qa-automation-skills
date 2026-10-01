# Changelog

All notable changes to this catalog are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [2026-10-01]

### Added — new skill

- `api-test-automation-implementation` — the concrete implementation path for API test suites (Playwright `request` fixture, Postman/Newman collections, auth/token-flow handling, environment/secret management, request chaining, data-driven test design), complementing `api-contract-test-automation`'s schema/contract focus the same way `playwright-test-automation` complements `ui-test-automation-patterns`. Catalog is now 26 skills. `/api-test` (and its Copilot/Kiro aliases) now reference both API skills.

### Added — Kiro and GitHub Copilot support

- `.github/skills` and `.kiro/skills` — symlinks to the root `skills/` directory, so every skill is discovered natively by Copilot and Kiro with no content duplicated or copied.
- `.github/agents/*.agent.md` — symlinks to `agents/*.md` (renamed to the `.agent.md` extension Copilot requires) so the four persona agents are usable as Copilot custom agents (`@qa-automation-architect`, etc.).
- `.github/copilot-instructions.md` — condensed fallback summary for Copilot surfaces that don't load skills directly.
- `.github/prompts/*.prompt.md` and `.kiro/steering/*.md` — the existing 14 `.claude/commands/` short aliases (`/spec`, `/api-test`, `/flaky-triage`, etc.), regenerated in each tool's native alias format so the same short entry points work in Copilot and Kiro.
- `docs/copilot-setup.md` and `docs/kiro-setup.md` — setup and troubleshooting guides for each tool, including how to regenerate an alias after editing its `.claude/commands/` source.

## [2026-09-26]

### Added — initial catalog scaffold

- Scaffolded the initial 20-skill catalog spanning the Define → Plan → Build → Verify → Review → Ship phases described in `README.md`, plus four persona agents (`qa-automation-architect`, `test-suite-reviewer`, `flaky-test-detective`, `performance-test-engineer`).

### Added — this round

- 5 new skills: `requirements-and-acceptance-criteria-analysis`, `playwright-test-automation`, `regression-and-golden-scenario-management`, `exploratory-testing-and-bug-reports`, `ai-assisted-qa-workflows`. This brings the catalog to 25 skills.
- 14 slash commands under `.claude/commands/`: `/spec`, `/test-plan`, `/test-cases`, `/test-strategy`, `/playwright`, `/api-test`, `/review`, `/flaky-triage`, `/ci-debug`, `/regression`, `/bug-report`, `/qa-report`, `/exploratory`, `/accessibility` — each a thin entry point that names the skill(s) it invokes and gives command-specific input/output guidance.
- `scripts/validate-skills.js` — a dependency-free Node.js structural validator (frontmatter contract, required heading order, agent frontmatter, command-to-skill-name cross-references) usable as a CI gate.
- `evals/` scaffold — `evals/README.md` explaining the manual/semi-manual routing-check approach, and `evals/cases.md` with representative prompts (positive matches, ambiguous overlaps, out-of-scope negatives, and ambiguous-requirements clarifying-question cases) for verifying skill triggering after catalog changes.

### Extended

- `test-data-management-strategy` — gained DB-integrity guidance (referential integrity and constraint-safe seeding/teardown considerations for fixture and factory data).
- `ci-cd-test-pipeline-integration` — gained GitHub Actions and Jenkins specifics for fast-fail staging and flake gating.
