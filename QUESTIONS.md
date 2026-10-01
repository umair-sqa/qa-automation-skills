# Open Questions — Tailor This Catalog

This skill catalog was scaffolded from general QA automation experience: tool-agnostic patterns first, with common tools (Playwright, Cypress, Selenium, Appium, Pact, k6, etc.) used as examples. It will get noticeably sharper once it reflects *your* stack, team, and pain points. Answer whatever you can — skip the rest — and hand this file back so the skills can be tightened.

## 1. Stack & Tooling

- What do you currently use for UI test automation? (Playwright / Cypress / Selenium / WebdriverIO / none yet / other)
- What do you use for API testing? (REST Assured / Supertest / Postman+Newman / raw HTTP client / none yet / other)
- Do you test mobile apps? If so: native (Espresso/XCUITest), cross-platform (Appium/Detox), or not applicable?
- Do you use BDD/Gherkin (Cucumber, SpecFlow, Behave)? If yes, is it working well or is it overhead?
- What language(s) do your tests are written in? (JS/TS, Python, Java, C#, other)
- What CI system runs your tests? (GitHub Actions, GitLab CI, Jenkins, CircleCI, other)
- Do you have a device farm or cloud browser grid (BrowserStack, Sauce Labs, LambdaTest), or run everything locally/in CI containers?
- Do you use a performance/load testing tool today (k6, JMeter, Gatling, Locust), or is that untested territory?

## 2. Application Under Test

- What are you testing? (web app, native mobile app, API/backend service, desktop app, some combination)
- Roughly how many test cases / suites exist today, across all levels (unit, integration, e2e)?
- Is there an existing test pyramid, or is coverage e2e-heavy / unit-heavy / unbalanced?
- Do you have any accessibility (WCAG) compliance requirement, or is that not currently a priority?
- Do you have compliance/security testing requirements (SOC2, PCI, HIPAA) that QA needs to account for?

## 3. Team & Process

- Is there a dedicated QA/SDET team, or do feature engineers own their own tests?
- How are test cases currently designed — from tickets/acceptance criteria, exploratory sessions, or ad hoc?
- What's the current release cadence, and does a "QA sign-off" gate exist before release?
- Is there a defined flaky-test process today (quarantine list, ownership, SLA), or do flaky tests just get rerun?

## 4. Pain Points (pick the ones that resonate — this shapes which skills get sharpened first)

- [ ] Flaky tests eroding trust in CI
- [ ] Test suite too slow (CI feedback loop is a bottleneck)
- [ ] Coverage feels high (%) but bugs still slip through
- [ ] No clear test strategy — automation effort isn't prioritized by risk
- [ ] Test data management is painful (shared state, prod data copies, PII)
- [ ] Cross-browser/cross-device matrix is unclear or untested
- [ ] No visibility into test health over time (flake rate, duration trend)
- [ ] Migrating from one test framework/tool to another right now
- [ ] Accessibility or security testing is an afterthought
- [ ] Something else: ___________

## 5. Catalog Shape

- Should any skill be split further, merged, or dropped as not relevant to your context?
- Do you want slash-command style entry points (like `/spec`, `/plan`, `/review` in the original agent-skills repo) mapped onto these QA skills, e.g. `/test-strategy`, `/flaky-triage`? If yes, which workflows deserve one?
- Do you want an evals/validation script (like `scripts/run-evals.js` in agent-skills) to check trigger/routing behavior for these skills?
- Should this become its own git repo, or stay a plain folder for now?

---

*Once answered, hand this back and the affected `skills/*/SKILL.md` files, `agents/*.md` personas, and `references/*.md` checklists can be revised to match your actual environment instead of the generic defaults.*
