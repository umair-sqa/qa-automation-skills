# QA Skills Catalog — Answers Sheet

## 1. Stack & Tooling

* **UI test automation:** Playwright with TypeScript/JavaScript. Also have experience with Cypress and Selenium WebDriver.
* **API testing:** Playwright API testing, Postman, and HTTP-based API testing. Exact use of Supertest, REST Assured, or other dedicated API libraries is not confirmed.
* **Mobile testing:** Experience with Appium and mobile testing. Current use of native frameworks such as Espresso/XCUITest or cross-platform frameworks such as Detox is not confirmed.
* **BDD/Gherkin:** Have experience with Cucumber. Whether it is currently used in the active project or considered overhead is not confirmed.
* **Programming languages:** JavaScript and TypeScript primarily. Also have experience with other testing technologies and frameworks.
* **CI/CD:** GitHub Actions and Jenkins.
* **Device farms / browser grids:** Not confirmed. The catalog should support local execution and CI-based browser testing, with cloud grids as optional integrations.
* **Performance/load testing:** Performance testing is within my QA scope, but the currently adopted load-testing tool is not confirmed. Keep k6, JMeter, and similar tools as optional integrations.

## 2. Application Under Test

* **Application types:** Primarily web applications, APIs/backend services, and mobile applications. Testing also involves databases and integrations between services.
* **Number of test cases/suites:** Not confirmed. Do not assume a specific test count.
* **Test pyramid:** The current distribution of unit, integration, and end-to-end tests is not confirmed. The catalog should encourage a balanced, risk-based test pyramid rather than defaulting to E2E-heavy coverage.
* **Accessibility requirements:** No specific WCAG compliance requirement has been confirmed. Include accessibility testing as a reusable skill.
* **Compliance/security requirements:** No specific SOC 2, PCI DSS, or HIPAA requirement has been confirmed. Include general security testing practices, with compliance-specific checklists available when required.

## 3. Team & Process

* **Team structure:** Work as a QA Automation Engineer, covering both manual testing and automation. The exact team structure and ownership model vary by project.
* **Test case design:** Primarily driven by user stories, tickets, acceptance criteria, requirements, and exploratory testing. Test cases should include clear preconditions, test data, expected results, dependencies, and priorities where applicable.
* **Release cadence / QA sign-off:** Not confirmed. The catalog should support both continuous delivery and scheduled releases, including configurable QA sign-off gates.
* **Flaky-test management:** No formal organization-wide quarantine process, ownership model, or remediation SLA has been confirmed. The catalog should include a structured approach to identifying, triaging, tracking, and fixing flaky tests.

## 4. Pain Points

The following are areas to prioritize for the initial catalog. These are proposed priorities, not confirmed current problems.

* [ ] Flaky tests eroding trust in CI
* [ ] Test suite too slow
* [x] Coverage feels high (%) but bugs still slip through — prioritize risk-based coverage and meaningful assertions.
* [x] No clear test strategy — improve risk-based prioritization and test selection.
* [x] Test data management — emphasize isolated, deterministic, and reusable test data.
* [x] Cross-browser/cross-device matrix — establish a clear, maintainable coverage strategy.
* [x] No visibility into test health — include reporting for pass rate, flakiness, execution duration, and failure trends.
* [ ] Migrating from one test framework/tool to another
* [x] Accessibility or security testing — integrate both into the broader testing strategy.
* [x] Something else: AI-assisted testing, maintainable automation architecture, and effective integration of automated tests into CI/CD pipelines.

## 5. Catalog Shape

### Skills to prioritize

Organize the catalog around practical QA workflows, with Playwright and TypeScript as the primary implementation stack.

Prioritize the following skills:

1. **Requirements & Acceptance Criteria Analysis** — identify ambiguity, missing acceptance criteria, dependencies, and testability issues before designing tests.
2. **Test Strategy & Risk-Based Planning** — determine what to test, at which level, and where automation provides the most value.
3. **Test Case Design** — create structured positive, negative, boundary, integration, and regression scenarios.
4. **Playwright Automation** — implement maintainable tests using fixtures, hooks, Page Object Model, parameterization, and parallel execution.
5. **API Testing** — validate status codes, response schemas, business rules, authentication, authorization, and error handling.
6. **Database & Test Data Management** — validate persistence, data integrity, relationships, and test-data isolation.
7. **CI/CD Test Integration** — configure execution, reporting, failure diagnostics, and pipeline feedback.
8. **Flaky Test Triage** — identify root causes, distinguish product defects from test defects, and track remediation.
9. **Regression & Golden Scenario Management** — maintain a focused, high-value regression suite without duplicating the entire test inventory.
10. **Exploratory & Manual Testing** — structure exploratory sessions and document reproducible defects.
11. **Performance & Security Testing** — provide tool-agnostic workflows with optional tool-specific implementations.
12. **AI-Assisted QA** — use AI tools and agents to accelerate test design, automation, debugging, and documentation while retaining human validation.

### Skills to merge or keep separate

* Keep requirements analysis, test strategy, test design, and automation implementation as separate skills because they represent different stages of the QA workflow.
* Keep Playwright as the primary framework-specific skill. Treat Cypress, Selenium, and Appium as separate supporting skills or optional extensions.
* Keep API testing and database testing separate from UI automation, while allowing them to be combined in end-to-end workflows.
* Merge overlapping regression-planning and test-selection guidance where it reduces duplication.
* Keep flaky-test triage, CI/CD diagnostics, and test reporting closely connected, but retain distinct entry points for each workflow.
* Keep AI-assisted QA as a cross-cutting capability rather than replacing established testing practices.

### Slash-command entry points

Yes. Add slash-command-style entry points for the most frequently used QA workflows:

* `/spec` — analyze a requirement or ticket, identify ambiguities, and extract testable acceptance criteria.
* `/test-plan` — create a risk-based test plan and define the testing scope.
* `/test-cases` — generate structured test scenarios from approved requirements.
* `/test-strategy` — determine the appropriate testing levels, coverage, and automation priorities.
* `/playwright` — implement or improve Playwright tests using the established project conventions.
* `/api-test` — design API test scenarios and automation.
* `/review` — review test code for correctness, maintainability, reliability, and coverage.
* `/flaky-triage` — investigate intermittent failures and recommend evidence-based fixes.
* `/ci-debug` — diagnose CI execution failures and distinguish infrastructure, test, and application issues.
* `/regression` — identify regression coverage based on risk and changed functionality.
* `/bug-report` — produce a clear, reproducible defect report with expected and actual results.
* `/qa-report` — summarize testing progress, execution results, defects, blockers, and outstanding risks.
* `/exploratory` — create a focused exploratory testing charter.
* `/accessibility` — review accessibility requirements and generate appropriate test scenarios.

### Evals / validation script

Yes. Include a validation script such as `scripts/run-evals.js` to verify that the skills are routed and triggered appropriately.

The evaluation suite should check:

* Correct skill selection for representative QA requests.
* Correct handling of ambiguous or incomplete requirements.
* Whether the agent asks clarifying questions instead of inventing expected behavior.
* Whether Playwright examples follow the specified project conventions.
* Whether the agent avoids brittle selectors and unnecessary hardcoded waits.
* Whether generated test cases have clear preconditions and expected results.
* Whether failure triage distinguishes application defects, test defects, and environment issues.
* Whether the output follows the expected format for test cases, bug reports, and QA reports.
* Whether tool-specific guidance is used only when relevant.

Include positive, negative, ambiguous, and out-of-scope examples. Treat the evaluations as regression checks for skill behavior, not proof that generated tests are correct.

### Repository structure

**Recommendation: maintain this as a dedicated Git repository.**

The catalog is intended to evolve into a reusable QA engineering toolkit, so version control, reviews, evaluation runs, and documented changes will be valuable.

Use a structure similar to:

* `skills/` — individual QA skills and their instructions.
* `agents/` — specialized QA personas.
* `references/` — checklists, templates, and testing standards.
* `scripts/` — validation and evaluation scripts.
* `evals/` — representative prompts and expected routing or behavior.
* `README.md` — catalog overview, setup, and usage.
* `CHANGELOG.md` — notable changes to skills and workflows.

Keep the core guidance tool-agnostic where possible, with a dedicated Playwright/TypeScript implementation path and optional extensions for other tools.

---

## Additional Context

The catalog should reflect a practical, engineering-focused QA workflow rather than a generic collection of testing definitions.

The key principles are:

* Accuracy over assumptions.
* Explicitly identify missing requirements and acceptance criteria.
* Do not generate automation for undefined or ambiguous behavior without clarification.
* Prefer deterministic tests, isolated test data, reliable selectors, and explicit waits.
* Use risk-based testing instead of relying solely on coverage percentages.
* Integrate automation into CI/CD with actionable reporting.
* Keep generated code maintainable and consistent with the project's existing architecture.
* Use AI to accelerate QA work without treating AI-generated tests or conclusions as automatically correct.

**Primary stack:** Playwright + TypeScript/JavaScript + GitHub Actions/Jenkins.

**Primary objective:** Build a modular, reusable QA skills catalog that supports the complete testing lifecycle, from requirements analysis through test design, automation, execution, debugging, and reporting.
