# Eval Cases

A checklist of representative prompts and the skill(s) each should route to. See `evals/README.md` for how to use this — it's a manual/semi-manual walkthrough, not an automated test suite. Re-check this table after any change to a skill's `description`.

## Positive matches

Clear prompts that should route to exactly one skill.

| Prompt | Expected skill(s) | Notes |
|---|---|---|
| "Here's a ticket for a new checkout discount field — can you pull out the testable acceptance criteria and flag anything unclear?" | `requirements-and-acceptance-criteria-analysis` | Direct request to extract criteria + surface ambiguity from a requirement. |
| "We're shipping a new payments feature next sprint — what should our test strategy be, and how much should we automate?" | `test-strategy-and-risk-based-planning` | Risk-based scoping and level decision before test-writing begins. |
| "Given these acceptance criteria for the password reset flow, generate positive/negative/boundary test cases." | `test-case-design-techniques` | Explicit request for equivalence/boundary-style scenario design from clarified criteria. |
| "Design a fixture strategy for seeding test users without using production PII." | `test-data-management-strategy` | PII-safe synthetic data / fixtures is core to this skill. |
| "Should we use Playwright, Cypress, or Selenium for our new e2e suite, and why?" | `test-automation-framework-selection` | Framework decision framework, not implementation. |
| "Our Playwright specs use raw CSS selectors and `page.waitForTimeout(3000)` everywhere — help me refactor to something resilient." | `ui-test-automation-patterns` (also `playwright-test-automation`) | Locator resilience / hardcoded waits is squarely this skill's pattern; Playwright-specific implementation overlaps with `playwright-test-automation`. |
| "Automate contract tests for this OpenAPI spec, including auth failure and malformed payload cases." | `api-contract-test-automation` | Schema/contract + negative-case coverage for an API. |
| "Set up a Playwright API test suite with a reusable auth fixture and per-environment base URLs." | `api-test-automation-implementation` | Implementation concern (auth fixture, env config), not what to assert on the response. |
| "Should we use PactumJS or Jest+Supertest for a standalone API test suite with no UI tests?" | `api-test-automation-implementation` (also `test-automation-framework-selection` for the decision-framework angle) | Runner/library choice for a pure-Node API suite — implementation skill covers the concrete Pactum/Jest/Mocha patterns; framework-selection skill covers the weighted decision if the ask is "which tool and why." |
| "This Postman collection hardcodes the staging URL and an API key — help me make it environment-safe and runnable in CI via Newman." | `api-test-automation-implementation` | Environment/secret externalization and CI wiring, not schema/contract design. |
| "We need Appium tests for the Android checkout flow that don't flake on gesture timing." | `mobile-test-automation` | Names Appium and device gesture-timing flakiness explicitly. |
| "Is Gherkin worth adopting for this team, or should we just write plain test code?" | `bdd-gherkin-authoring` | Cost/benefit of Gherkin overhead is this skill's exact framing. |
| "This test passes locally but fails about 1 in 10 times in CI with no code change — help me find out why." | `flaky-test-diagnosis-and-triage` | Textbook flaky-test symptom description. |
| "What browser/device matrix should we actually cover for this responsive redesign?" | `cross-browser-and-device-testing` | Data-driven matrix decision, not "test everything." |
| "Set up a load test for the search API with defined latency SLOs." | `performance-and-load-testing` | Load testing tied to explicit SLOs. |
| "Run an accessibility audit on the new signup form, both automated and manual." | `accessibility-testing-automation` | Explicitly asks for automated + manual a11y coverage. |
| "Review this test suite — I want to know if the assertions are actually meaningful or just checking the code ran." | `test-suite-quality-review` | Meaningful-assertions review is this skill's central concern. |
| "This suite has 40 near-duplicate tests covering the same login path — help me cut it down without losing coverage." | `test-suite-simplification-and-dedup` | Duplication reduction without coverage loss. |
| "Check our test suite for missing negative authorization tests — e.g. can a regular user hit an admin-only endpoint?" | `security-testing-in-qa` | Authz negative testing is a named example in this skill. |
| "Our CI pipeline runs the full e2e suite before unit tests, and takes 40 minutes to fail on a typo — help me restructure it." | `ci-cd-test-pipeline-integration` | Fast-fail ordering / pyramid-aware pipeline staging. |
| "Build a dashboard that shows flake rate and pass-rate trend over the last 30 days." | `test-observability-and-reporting` | Trend dashboards + flake rate as a first-class metric. |
| "Given current test results and open P1 bugs, are we good to release Friday?" | `release-readiness-and-exit-criteria` | Go/no-go decision from test signal. |
| "We're migrating from Selenium to Playwright — how do we do this without leaving a coverage gap?" | `test-suite-migration-and-deprecation` | Incremental framework migration without losing coverage. |

## Ambiguous prompts (plausibly match more than one skill)

| Prompt | Plausible skills | Disambiguating question |
|---|---|---|
| "Write some Playwright tests for the login page." | `playwright-test-automation`, `ui-test-automation-patterns`, `test-case-design-techniques` | Ask: do you have clarified acceptance criteria / scenarios already (route to `playwright-test-automation` to implement), or do you need the scenarios designed first (route to `test-case-design-techniques`), or is the concern specifically about locator/POM patterns already in use (`ui-test-automation-patterns`)? |
| "Our nightly CI run failed — what's wrong?" | `ci-cd-test-pipeline-integration`, `flaky-test-diagnosis-and-triage` | Ask: did this specific test fail intermittently before (route to flaky diagnosis), or is this a first-time/consistent failure possibly tied to pipeline config, environment, or a real regression (route to CI/CD pipeline skill)? |
| "Can you make sure we're covering this feature well before release?" | `release-readiness-and-exit-criteria`, `requirements-to-test-traceability`, `test-strategy-and-risk-based-planning` | Ask: is the question "do our exit criteria say we can ship" (release readiness), "does every acceptance criterion have a corresponding test" (traceability), or "what should we test and at what level" (strategy, if this is still early)? |
| "Write API tests for the orders endpoint." | `api-contract-test-automation`, `api-test-automation-implementation` | Ask: is the gap what to assert (schema/contract/negative-case coverage — route to contract skill) or how to build the suite itself (auth, env config, chaining — route to implementation skill)? Most real requests need both; a thorough answer draws on each rather than picking one and ignoring the other. |

## Negative / out-of-scope prompts

Prompts that should not match any skill in this catalog.

| Prompt | Expected skill(s) | Notes |
|---|---|---|
| "Provision a new Kubernetes cluster for our staging environment." | None | Pure infrastructure provisioning — no test-lifecycle content; out of scope for a QA skill catalog. |
| "Write the Q3 product roadmap for the mobile app." | None | General product-management planning, not testing/QA. |
| "Draft a marketing email announcing our new feature launch." | None | Marketing copy — unrelated to test strategy, automation, or quality review. |

## Ambiguous-requirements cases (should trigger a clarifying question, not immediate generation)

| Prompt | Expected behavior | Notes |
|---|---|---|
| "The ticket just says 'improve the search experience' — write me the test cases." | Route to `requirements-and-acceptance-criteria-analysis` first; ask what "improve" means (relevance ranking? latency? UI? filters?) rather than inventing acceptance criteria and generating test cases against a guess. | Tests `requirements-and-acceptance-criteria-analysis`'s "don't invent behavior for ambiguous requirements" principle — an agent that jumps straight to `/test-cases` output here has failed the eval even if the generated cases look plausible. |
| "Automate a regression suite for 'the checkout flow should work correctly.'" | Same principle: flag that "work correctly" isn't a testable criterion, ask what specific behaviors/edge cases the ticket owner actually means, before routing to `regression-and-golden-scenario-management` or any automation skill. | A confident-sounding but ungrounded regression suite is worse than a clarifying question — this checks the agent doesn't fabricate scope. |
