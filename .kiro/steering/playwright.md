---
inclusion: manual
---
# /playwright

Implement or improve Playwright tests following resilient automation conventions.

Apply the `playwright-test-automation` skill, referencing `ui-test-automation-patterns` for the underlying Page Object / Screenplay and locator-resilience patterns.

## Usage

Expects either a feature/flow to automate or existing Playwright spec files to improve. Output is working Playwright test code: use fixtures for setup/teardown, a Page Object (or equivalent) layer instead of inline selectors, and locators based on role/text/test-id rather than brittle CSS/XPath.

No hardcoded `waitForTimeout` sleeps — use Playwright's built-in auto-waiting and explicit condition waits. Every new spec must include real assertions, not just "it ran without throwing."
