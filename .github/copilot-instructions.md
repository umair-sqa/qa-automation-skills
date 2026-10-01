# QA Automation Standards

This repo's skills are discoverable under `.github/skills/` (symlinked to the root `skills/` directory — see [docs/copilot-setup.md](../docs/copilot-setup.md)). Summaries below are a fallback for surfaces that don't load skills; prefer invoking the actual skill by name (`/test-strategy-and-risk-based-planning`, `/api-contract-test-automation`, etc.) over following this summary alone.

## Test Strategy
- Decide test level (unit/integration/e2e) and automation ROI by risk — blast radius, likelihood, detectability — not by defaulting to "test everything" or "mostly e2e."
- Don't generate test cases or automation for requirements that are still ambiguous. Flag the ambiguity and ask, rather than inventing expected behavior.

## Automation (Primary stack: Playwright + TypeScript/JavaScript)
- Locators: `getByRole`/`getByTestId`/`getByLabel` by default; CSS/XPath only as a last resort, and treat that as a gap to close.
- No hardcoded `waitForTimeout` sleeps — rely on Playwright's auto-waiting plus explicit condition waits.
- Page Object (or equivalent) layer instead of inline selectors; fixtures (`test.extend`) instead of copy-pasted setup.
- Every spec needs a real assertion — "it ran without throwing" is not a test.

## API Testing
- Assert full response shape against a schema (OpenAPI/SDL/proto), not just status code.
- Cover negative paths (validation, auth, not-found, conflict, rate-limit) for every endpoint, not just the happy path.
- Externalize base URLs/credentials to environment config; never hardcode or commit real secrets.

## CI/CD (GitHub Actions + Jenkins)
- Fast-fail ordering: cheap/fast tests before slow e2e suites.
- Flaky tests get root-caused and fixed or explicitly quarantined with an owner — never silently retried away or `.skip`'d.

## Quality Review
- A test that would still pass if the feature were broken has failed its job — flag assertions that don't actually verify behavior.
- No duplicate/near-duplicate specs; no skipped tests without a tracked reason.

## Boundaries
- Always: ground test design in clarified acceptance criteria; run the suite after changes.
- Ask first: dropping existing test coverage, changing a release/QA sign-off gate.
- Never: commit secrets or real credentials in test code/fixtures/Postman environments; treat an AI-generated QA report or summary as verified without checking it against real execution data.
