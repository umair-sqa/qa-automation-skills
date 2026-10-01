# Changelog

All notable changes to this catalog are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [2026-10-01]

### Fixed — full-catalog technical accuracy audit

Every one of the 26 `skills/*/SKILL.md` files was read in full and fact-checked against current tool docs (not memory) — self-review plus 4 parallel deep-audit passes covering web/mobile/perf, CI/security/a11y/BDD, requirements/strategy, and review/release/observability skill groups. 8 real, verified defects found and fixed (structural checks — frontmatter, headings, cross-references, code-fence balance — were already clean beforehand and remain 26/26 passing):

- `api-test-automation-implementation` — the PactumJS example used a fabricated `.returns('id')` method; Pactum's real chaining API is `.stores(name, jsonPath)` / `$S{name}`. Also replaced the Mocha+Chai example's `chai-http` usage (`chai.request(app)`), which is deprecated in chai-http's current major version (now `request.execute(app)`), with the more stable Supertest+Chai pairing already used for requests elsewhere in the same skill.
- `test-automation-framework-selection` — Cypress's Firefox support has been stable since v4.4 (2020); only WebKit is still experimental — the comparison table wrongly lumped both in as "experimental." Also fixed a misattribution where `api-contract-test-automation` (schema/contract) was cited alongside `api-test-automation-implementation` for Jest/Mocha/PactumJS *implementation* patterns that only the latter skill covers; refined the WebdriverIO parallelization claim (it parallelizes locally via `maxInstances`, not only via a Selenium grid); renamed "Cypress dashboard" to Cypress Cloud (rebranded 2023).
- `bdd-gherkin-authoring` — recommended SpecFlow, which Tricentis end-of-lifed on 2024-12-31 (repos deleted); replaced with Reqnroll, its actively maintained community-forked successor, across the frontmatter description, a `When to Use` bullet, and the tooling notes.
- `ci-cd-test-pipeline-integration` — corrected an overstated claim that Jest's and Playwright's `--shard` do duration-based splitting "directly" like pytest-split does; both actually split by equal file/test count by default (verified against current Playwright docs — a suspected `--shard-weights` flag turned out not to exist and was deliberately left out).
- `mobile-test-automation` — a "bad" gesture-timing code example mixed WebdriverIO's `driver.pause()` with Detox's `element()`/`waitFor()` API in one snippet, which wouldn't run against either tool as written; made it pure Detox throughout.
- `test-case-design-techniques` — a decision-table worked example asserted a confident "15%, capped" outcome for the one row its own surrounding prose said should be left as an open question for the requirement owner, not assumed; the table now leaves that cell explicitly unconfirmed instead of contradicting its own caption.
- `test-suite-migration-and-deprecation` — a worked example's dates (2026-09-10 to 2026-09-24) are 14 days apart but the text claimed "16 clean days."
- `security-testing-in-qa` — minor: noted ZAP's 2023 departure from the OWASP Foundation (tool/CLI unchanged, "OWASP ZAP" branding is dated).

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
