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

### Added — CI gate and drift detection (review pass)

- `.github/workflows/validate.yml` — runs `scripts/validate-skills.js` on every push/PR. The README and `evals/README.md` both described this script as "a CI gate" before this workflow existed; nothing was actually wired up to run it automatically.
- `scripts/validate-skills.js` now also checks that every `.github/prompts/*.prompt.md` and `.kiro/steering/*.md` alias is byte-for-byte in sync with its `.claude/commands/*.md` source (summary line, body, and required frontmatter field), so a hand-edit to one of the three copies that isn't propagated to the other two fails CI instead of silently drifting.
- `package.json`'s `test` script ran `echo "Error: no test specified" && exit 1` unconditionally — replaced with the actual validator; added a `validate` alias script.
- `.gitignore` — didn't exist; a `.DS_Store` was already sitting untracked in the repo root.
- `playwright-test-automation`'s "API Testing with the `request` Fixture" section now cross-references `api-test-automation-implementation` to make the boundary explicit: `request` as a UI-test setup/verification helper (that section) vs. a dedicated API test suite where the API is the subject under test (the new skill).
- Noted the Windows symlink caveat (`core.symlinks`, Developer Mode) in both setup docs' troubleshooting sections, since `.github/skills`/`.kiro/skills` are real symlinks, not copies.

### Extended — more API testing framework coverage (skills-only review pass)

- `api-test-automation-implementation` — added PactumJS and Jest/Mocha+Supertest/Chai as a third implementation path alongside Playwright and Postman/Newman: frontmatter description, a `When to Use` bullet, framework-specific guidance folded into Core Process steps 1-5 (path selection, auth-per-state, environment config, secrets, request chaining), two new worked examples (PactumJS chaining/schema/mock, Jest and Mocha+Chai+Supertest), a rationalization and two checks about not silently splitting coverage across two runners for the same endpoints.
- `api-contract-test-automation` — noted that PactumJS bundles the request + schema-assertion steps its first code example keeps decoupled, cross-referenced to `api-test-automation-implementation` for runner setup.
- `test-automation-framework-selection` — API framework comparison line now includes PactumJS and the Jest/Mocha+Supertest pairing, not just REST Assured/Supertest/Postman.
- `evals/cases.md` — added a routing case for the Pactum-vs-Jest+Supertest decision, disambiguating the implementation skill (how to build it) from the framework-selection skill (which tool and why).

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
